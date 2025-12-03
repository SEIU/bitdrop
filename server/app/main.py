from datetime import datetime
import os
from pathlib import Path
import shutil
import uuid

import boto3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import requests

bitdrop = "https://b2.seiu.org"

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
    message: str = "Someone has shared a file with you on SEIU BitDrop!"
    unit_test: bool = False


class Captcha(BaseModel):
    recaptchaToken: str


class Chunk(BaseModel):
    fileId: uuid.UUID
    chunkIndex: int
    totalChunks: int
    encryptedData: str


def verify_recaptcha(token, secret_key, remote_ip=None):
    url = "https://www.google.com/recaptcha/api/siteverify"
    data = {
        'secret': secret_key,
        'response': token.recaptchaToken,
        'remoteip': remote_ip
    }
    response = requests.post(url, data=data, verify=True)
    result = response.json()
    return result.get("success", False)


@app.get("/")
async def root() -> str:
    return "Welcome to SEIU BitDrop!"


@app.post("/authentication")
def authentication(token: Captcha) -> JSONResponse:
    "This endpoint is for authentication purposes."
    verified = verify_recaptcha(token, os.getenv("RECAPTCHA_SECRET_KEY"))
    return JSONResponse(content=verified)


@app.post("/upload-chunk")
async def upload_chunk(chunk: Chunk) -> JSONResponse:
    "Store the chunk of the file"
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
        }
    )


@app.post("/complete-upload")
async def complete_upload(
    body: CompleteUpload,
) -> JSONResponse:
    "Complete upload of chunks and send an email"
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

    # Send the email
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


@app.get("/download/{fileId}")
def download_file(fileId: str) -> JSONResponse:
    "Download a file by its ID token"
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{fileId}/*/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {fileId}"}, status_code=404
        )
    elif len(matches) > 1:
        return JSONResponse(
            content={"message": f"Multiple files found with ID {fileId}"},
            status_code=409,
        )
    else:
        file_dir = matches[0]
        chunks = []
        for chunk in sorted(file_dir.glob("*")):
            chunks.append(Path(chunk).read_text())

        *_, fileHash, filename = file_dir.parts
        return JSONResponse(
            content={
                "filename": str(filename),
                "fileHash": str(fileHash),
                "totalChunks": len(chunks),
                "chunks": chunks,
            }
        )


@app.delete("/download/{fileId}/{fileHash}")
def delete_file(fileId: str, fileHash: str) -> JSONResponse:
    "Delete a file by its fileId and fileHash"
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{fileId}/{fileHash}/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {fileId} and hash {fileHash}"},
            status_code=404,
        )
    else:
        for file in matches:
            ts_dir = file.parent.parent.parent
            shutil.rmtree(ts_dir)

        return JSONResponse(
            content={"message": f"File with ID {fileId} and hash {fileHash} deleted"}
        )
