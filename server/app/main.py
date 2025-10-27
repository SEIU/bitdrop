import base64
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


async def parse_body(request: Request):
    data: bytes = await request.body()
    return data


@app.post("/api/upload/{id}/{raw_hash}/{filename}")
async def upload_file(
    id: str,
    raw_hash: str,
    filename: str,
    file: bytes = Depends(parse_body),
) -> JSONResponse:
    "Store raw bytes of an uploaded file"
    ts = datetime.now().isoformat(timespec="seconds")
    fname = Path.home() / f"uploads" / ts / id / raw_hash / filename
    fname.parent.mkdir(parents=True, exist_ok=True)
    with open(fname, "wb") as f:
        f.write(file)

    return JSONResponse(content={"id": id, "filename": filename, "timestamp": ts})


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
        base64_content = base64.b64encode(file.read_bytes()).decode()
        print(f"XXX {raw_hash=} {filename=} {base64_content=}")
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

    matches = list(uploads_dir.glob(f"**/{id}/{raw_hash}/**"))
    if not matches:
        return JSONResponse(
            content={"message": f"No file found with ID {id} and raw hash {raw_hash}"},
            status_code=404,
        )
    else:
        for file in matches:
            file.unlink()

        return JSONResponse(
            content={"message": f"File with ID {id} and raw hash {raw_hash} deleted"}
        )
