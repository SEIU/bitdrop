from pathlib import Path
import re
import secrets
import shutil
import uuid

import pytest

from fastapi.testclient import TestClient

tokens = ["a1e9f39c-8f5d-4417-ab83-b39e56cf9c6f"]  # Fix tokens[0]
tokens.extend([str(uuid.uuid4()) for _ in range(9)])  # Generate 10 unique tokens


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    # Remove all previous uploads and temporary files
    shutil.rmtree(Path.home() / "uploads", ignore_errors=True)
    for token in tokens:
        shutil.rmtree(f"/tmp/{token}", ignore_errors=True)


@pytest.fixture(scope="module")
def setup():
    from app.main import app

    client = TestClient(app)
    yield client, tokens


def test_root(setup, cleanup):
    _ = cleanup
    client, _tokens = setup
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == "Welcome to SEIU BitDrop!"


@pytest.mark.parametrize("chunkIndex", [1, 2, 3])
def test_upload_three_chunks(setup, chunkIndex):
    client, tokens = setup
    fileId = tokens[0]
    body = {
        "fileId": fileId,
        "chunkIndex": chunkIndex,
        "totalChunks": 3,
        "encryptedData": secrets.token_hex(10),
    }
    response = client.post("upload-chunk", json=body)
    assert response.status_code == 201
    assert response.json()["message"] == "Chunk uploaded successfully"
    chunk_file = Path("/tmp") / fileId / f"of-3" / f"{chunkIndex}"
    assert response.json()["chunk_file"] == str(chunk_file)
    assert chunk_file.exists()


@pytest.mark.parametrize("chunkIndex", [4, 5])
def test_upload_invalid_chunk_index(setup, chunkIndex):
    client, tokens = setup
    fileId = tokens[2]
    body = {
        "fileId": fileId,
        "chunkIndex": chunkIndex,
        "totalChunks": 3,
        "encryptedData": secrets.token_hex(10),
    }
    response = client.post("upload-chunk", json=body)
    assert response.status_code == 400
    assert (
        response.json()["message"]
        == f"chunkIndex was {chunkIndex}, but totalChunks is only 3"
    )


@pytest.mark.parametrize("chunkIndex", [-1, 0])
def test_upload_non_positive_chunk_index(setup, chunkIndex):
    client, tokens = setup
    fileId = tokens[3]
    body = {
        "fileId": fileId,
        "chunkIndex": chunkIndex,
        "totalChunks": 3,
        "encryptedData": secrets.token_hex(10),
    }
    response = client.post("upload-chunk", json=body)
    assert response.status_code == 400
    assert (
        response.json()["message"]
        == f"chunkIndex and totalChunks must be natural numbers"
    )


@pytest.mark.parametrize("chunkIndex", [1, 2])
def test_upload_non_positive_total_chunks(setup, chunkIndex):
    client, tokens = setup
    fileId = tokens[4]
    body = {
        "fileId": fileId,
        "chunkIndex": chunkIndex,
        "totalChunks": -3,
        "encryptedData": secrets.token_hex(10),
    }
    response = client.post("upload-chunk", json=body)
    assert response.status_code == 400
    assert (
        response.json()["message"]
        == f"chunkIndex and totalChunks must be natural numbers"
    )


@pytest.mark.dependency(depends_on=["test_upload_three_chunks"])
def test_complete_upload(setup):
    client, tokens = setup
    fileId = tokens[0]
    body = {
        "fileId": fileId,
        "fileHash": "77e4d140d5636d",
        "email": "pii-recipient@example.org",
        "filename": "file.txt",
        "unit_test": True,
    }
    response = client.post("complete-upload", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["MessageId"] is None  # No email in unit tests
    assert data["filename"] == "file.txt"
    assert fileId in data["link"]
    assert data["fileId"] == fileId
    assert re.match(r"20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d", data["timestamp"])


@pytest.mark.dependency(depends_on=["test_complete_upload"])
def test_download_file(setup):
    client, tokens = setup
    fileId = tokens[0]
    response = client.get(f"/download/{fileId}")
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "file.txt"
    assert data["fileHash"] == "77e4d140d5636d"
    assert data["totalChunks"] == 3
    assert len(data["chunks"]) == 3


@pytest.mark.dependency(depends_on=["test_download_file"])
def test_not_deleted_file(setup):
    "File should exist until explicitly deleted"
    _client, tokens = setup
    fileId = tokens[0]
    matches = list((Path.home() / "uploads").glob(f"*/{fileId}"))
    assert len(matches) == 1


@pytest.mark.dependency(depends_on=["test_not_deleted_file"])
def test_delete_file(setup):
    client, tokens = setup
    fileId = tokens[0]
    response = client.delete(f"/download/{fileId}/77e4d140d5636d")
    assert response.status_code == 200
    matches = list((Path.home() / "uploads").glob(f"*/{fileId}"))
    assert len(matches) == 0
