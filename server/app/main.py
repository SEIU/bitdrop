from datetime import datetime
from pathlib import Path
import shutil
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class Upload(BaseModel):
    email: EmailStr
    id: uuid.UUID
    raw_hash: str
    filename: str
    base64_content: str


@app.get("/")
async def root() -> str:
    "Welcome to the file exchange service"
    return "Welcome to SEIU BitDrop!"


@app.post("/api/upload/")
async def upload_file(
    body: Upload,
) -> JSONResponse:
    "Store raw bytes of an uploaded file"
    ts = datetime.now().isoformat(timespec="seconds")
    fname = Path.home() / f"uploads" / ts / str(body.id) / body.raw_hash / body.filename
    fname.parent.mkdir(parents=True, exist_ok=True)
    with open(fname, "w") as f:
        f.write(body.base64_content)

    return JSONResponse(
        content={"id": str(body.id), "filename": body.filename, "timestamp": ts}
    )


@app.get("/api/download/{id}")
def download_file(id: str) -> JSONResponse:
    "Download a file by its ID token"
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{id}/*/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {id}"}, status_code=404
        )
    elif len(matches) > 1:
        return JSONResponse(
            content={"message": f"Multiple files found with ID {id}"}, status_code=409
        )
    else:
        file = matches[0]
        *_, raw_hash, filename = file.parts
        base64_content = file.read_text()
        return JSONResponse(
            content={
                "filename": f"{filename}",
                "raw_hash": f"{raw_hash}",
                "base64_content": base64_content,
            }
        )


@app.delete("/api/download/{id}/{raw_hash}")
def delete_file(id: str, raw_hash: str) -> JSONResponse:
    "Delete a file by its ID and raw hash"
    uploads_dir = Path.home() / "uploads"

    matches = list(uploads_dir.glob(f"*/{id}/{raw_hash}/*"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {id} and hash {raw_hash}"},
            status_code=404,
        )
    else:
        for file in matches:
            ts_dir = file.parent.parent.parent
            shutil.rmtree(ts_dir)

        return JSONResponse(
            content={"message": f"File with ID {id} and hash {raw_hash} deleted"}
        )
