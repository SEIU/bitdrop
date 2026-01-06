from datetime import datetime
import os
from pathlib import Path
import shutil
from typing import Literal
import uuid

import boto3
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, EmailStr
import requests

from app.utils import decrypt, log

load_dotenv()
bitdrop = os.getenv("BITDROP_SERVER")
recaptcha_secret_key = os.getenv("RECAPTCHA_SECRET_KEY")
email_auth_token = os.getenv("EMAIL_AUTH_TOKEN")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class CompleteUpload(BaseModel):
    fileId: uuid.UUID
    fileHash: str
    email: EmailStr
    filename: str
    emailAuthToken: str | None = None
    message: str = "Someone has shared a file with you on SEIU BitDrop!"
    unit_test: bool = False


class Chunk(BaseModel):
    fileId: uuid.UUID
    chunkIndex: int
    totalChunks: int
    encryptedData: str


@app.get("/")
async def root() -> str:
    return "Welcome to SEIU BitDrop!"


@app.post("/upload-chunk")
async def upload_chunk(chunk: Chunk) -> JSONResponse:
    "Store an encrypted chunk of a file"
    log(f"POST upload-chunk: {chunk.fileId=} {chunk.chunkIndex=} {chunk.totalChunks=}")

    if chunk.chunkIndex <= 0 or chunk.totalChunks <= 0:
        return JSONResponse(
            content={"message": "chunkIndex and totalChunks must be natural numbers"},
            status_code=400,
        )
    elif chunk.chunkIndex > chunk.totalChunks:
        return JSONResponse(
            content={
                "message": (
                    f"chunkIndex was {chunk.chunkIndex}, "
                    f"but totalChunks is only {chunk.totalChunks}"
                )
            },
            status_code=400,
        )

    save_dir = Path("/tmp") / str(chunk.fileId)
    save_dir.mkdir(parents=True, exist_ok=True)
    chunks_dir = save_dir / f"of-{chunk.totalChunks}"
    chunks_dir.mkdir(parents=True, exist_ok=True)

    # See what's already been saved, and check for duplicates
    saved_chunks = set(chunks_dir.glob("*"))
    if {f"{chunk.chunkIndex}", "0"} & saved_chunks:
        # Having a chunk zero is a sentinel that something went wrong
        (chunks_dir / "0").touch()
        return JSONResponse(
            content={
                "message": f"Upload {chunk.fileId} contains duplicate chunkIndex values"
            },
            status_code=400,
        )

    # This is the happy path to save the chunk
    current_chunk = Path(chunks_dir) / f"{chunk.chunkIndex}"
    current_chunk.write_text(chunk.encryptedData)
    return JSONResponse(
        content={
            "message": "Chunk uploaded successfully",
            "chunk_file": str(current_chunk),
        },
        status_code=201,
    )


@app.post("/complete-upload")
async def complete_upload(
    body: CompleteUpload,
) -> JSONResponse:
    "Finalize the upload of chunks and send an email"
    # Log the request
    body_clean = body.model_copy()
    body_clean.emailAuthToken = "REDACTED"
    log(f"POST complete-upload: {body_clean=}")

    # Use temporary chunk directory
    save_dir = Path("/tmp") / str(body.fileId)

    # Check for things that could be wrong with the upload
    if not save_dir.exists():
        return JSONResponse(
            content={"message": f"No upload found for {body.fileId}"}, status_code=404
        )
    chunks_dir = list(save_dir.glob(f"of-*"))
    if not len(chunks_dir) == 1:
        return JSONResponse(
            content={"message": f"Corrupted upload found for {body.fileId}"},
            status_code=404,
        )
    count = int(chunks_dir[0].name.replace("of-", ""))
    expected_chunks = set(str(n) for n in range(1, count + 1))
    found_chunks = set(chunk.name for chunk in chunks_dir[0].glob("*"))
    if found_chunks != expected_chunks:
        return JSONResponse(
            content={
                "message": "Not all encrypted chunks are available",
                "totalChunks": count,
                "available": sorted(str(chunk) for chunk in found_chunks),
            },
            status_code=409,
        )
    if body.emailAuthToken != email_auth_token and not body.unit_test:
        # We _could_ cleanup chunks here, but we'll let the cronjob do it.
        # Moreover, in concept, a client could try again with valid auth token.
        return JSONResponse(
            content={"message": "Invalid email authentication token"},
            status_code=401,
        )

    # --- Move the chunks to the uploads directory ---
    # First create needed directories and move data there
    ts = datetime.now().isoformat(timespec="seconds")
    file_dir = (
        Path.home() / "uploads" / ts / str(body.fileId) / body.fileHash / body.filename
    )
    file_dir.mkdir(parents=True, exist_ok=False)
    # Probably a faster way to do this with shutil.move(); easier to debug this way
    for chunk in save_dir.glob("of-*/*"):
        content = Path(chunk).read_text()
        Path(file_dir / Path(chunk).name).write_text(content)
    shutil.rmtree(save_dir)

    # --- Send the email ---
    # NOTE: This code uses AWS SES to send emails.  In a different deployment, 
    # you may choose a different email service provider.
    # TODO: refactor the email sending logic to a different module for ease in
    # implementing with different deplooyments.
    response = None  # Re-bound when sending email
    if not body.unit_test and not os.environ.get("BITDROP_NO_EMAIL"):
        ses_client = boto3.client("ses", region_name="us-west-2")
        email_body = (
            f"{body.message}\n\nDownload the file {body.filename} "
            f"from {bitdrop}/verify?id={body.fileId}"
        )
        msg = {
            "Source": "bitdrop@mail.dsa.seiu.org",
            "Destination": {"ToAddresses": [body.email]},
            "Message": {
                "Subject": {"Data": "A file was shared with you on SEIU BitDrop!"},
                "Body": {"Text": {"Data": email_body}},
            },
        }
        try:
            response = ses_client.send_email(**msg)
        except Exception as e:
            return JSONResponse(
                content={"message": f"Failed to send email: {str(e)}"}, status_code=500
            )

    return JSONResponse(
        content={
            "fileId": str(body.fileId),
            "filename": body.filename,
            "timestamp": ts,
            "MessageId": None if not response else response.get("MessageId"),
            "link": f"/verify?id={body.fileId}",
        }
    )


@app.get("/count-chunks/{file_id}")
async def count_chunks(file_id: str) -> JSONResponse:
    "Find the number of chunks in an available download"
    log(f"GET count-chunks/{file_id}")
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{file_id}/*/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {file_id}"}, status_code=404
        )
    elif len(matches) > 1:
        return JSONResponse(
            content={"message": f"Multiple files found with ID {file_id}"},
            status_code=409,
        )
    else:
        return JSONResponse(content=len(list(matches[0].glob("*"))), status_code=200)


@app.get("/download/{file_id}")
async def download_as_chunks(file_id: str) -> JSONResponse:
    "Download a file as encrypted chunks, using its file_id (UUID)"
    log(f"GET download/{file_id}")
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{file_id}/*/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {file_id}"}, status_code=404
        )
    elif len(matches) > 1:
        return JSONResponse(
            content={"message": f"Multiple files found with ID {file_id}"},
            status_code=409,
        )
    else:
        file_dir = matches[0]
        chunks = []
        for chunk in sorted(file_dir.glob("*"), key=lambda p: int(p.name)):
            chunks.append(Path(chunk).read_text())

        *_, file_hash, filename = file_dir.parts
        return JSONResponse(
            content={
                "filename": str(filename),
                "fileHash": str(file_hash),
                "totalChunks": len(chunks),
                "chunks": chunks,
            }
        )


@app.get("/download-chunk/{file_id}/{chunk_num}")
async def download_chunk(file_id: str, chunk_num: int) -> JSONResponse:
    "Download a chunk by its file_id (UUID) and chunk number"
    log(f"GET download-chunk/{file_id}/{chunk_num}")
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{file_id}/*/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {file_id}"}, status_code=404
        )
    elif len(matches) > 1:
        return JSONResponse(
            content={"message": f"Multiple files found with ID {file_id}"},
            status_code=409,
        )
    else:
        file_dir = matches[0]
        *_, file_hash, filename = file_dir.parts
        chunks = list(file_dir.glob(str(chunk_num)))
        if len(chunks) != 1:
            return JSONResponse(
                content={"message": f"Chunk {chunk_num} unavailable or ambiguous"},
                status_code=404,
            )

        return JSONResponse(
            content={
                "filename": str(filename),
                "fileHash": str(file_hash),
                "totalChunks": len(chunks),
                "chunk": Path(chunks[0]).read_text(),
            },
            status_code=200,
        )


@app.get("/download/{file_id}/{password}")
async def download_file(file_id: str, password: str | None = None) -> Response:
    "Download decrypted file as a full file object (octet-stream)"
    log(f"GET download/{file_id}/<password>")
    result = decrypt(file_id, password or "")
    status: Literal["OK", "CORRUPT", "MISSING", "DUPLICATE"] = result.status
    match status:
        case "OK":
            headers = {"Content-Disposition": f"attachment; filename={result.filename}"}
            return Response(
                content=result.buffer.getvalue(),
                headers=headers,
                media_type="application/octet-stream",
                status_code=200,
            )
        case "CORRUPT":
            return JSONResponse(
                content={
                    "message": f"Decryption failed! (probably the wrong password)",
                },
                status_code=401,
            )
        case "MISSING":
            return JSONResponse(
                content={
                    "message": f"No file matching {file_id} was found",
                },
                status_code=404,
            )
        case "DUPLICATE":
            return JSONResponse(
                content={"message": f"The server has ambiguous {file_id} contents"},
                status_code=409,
            )
        case _:
            return JSONResponse(
                content={"message": "Unexpected server error"}, status_code=500
            )


@app.delete("/download/{file_id}/{file_hash}")
async def delete_file(file_id: str, file_hash: str) -> JSONResponse:
    "Delete a file by its file_id (UUID) and file_hash (for verification)"
    log(f"DELETE download/{file_id}/{file_hash}")
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{file_id}/{file_hash}/*"))
    if not matches:
        return JSONResponse(
            content={
                "message": f"No file found with ID {file_id} and hash {file_hash}"
            },
            status_code=404,
        )
    else:
        for file in matches:
            ts_dir = file.parent.parent.parent
            shutil.rmtree(ts_dir)

        return JSONResponse(
            content={"message": f"File with ID {file_id} and hash {file_hash} deleted"}
        )
