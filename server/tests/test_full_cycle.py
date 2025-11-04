from pathlib import Path
import re
from time import sleep
import uuid

import pytest

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def setup():
    from app.main import app

    client = TestClient(app)
    tokens = [uuid.uuid4() for _ in range(10)]  # Generate 10 unique tokens
    yield client, tokens


def test_upload_file(setup):
    client, tokens = setup
    body = {
        "email": "pii-recipient@example.org",
        "id": str(tokens[1]),
        "raw_hash": "77e4d140d5636d103d797254143c498fbd057af8",
        "filename": "file.txt",
        "base64_content": "aGVsbG8gd29ybGQK...",
        "unit_test": True,
    }
    response = client.post(f"/upload", json=body)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "file.txt"
    assert data["id"] == f"{tokens[1]}"
    assert re.match(r"^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", data["timestamp"])

    new_file = (
        Path.home()
        / "uploads"
        / data["timestamp"]
        / str(tokens[1])
        / body["raw_hash"]
        / "file.txt"
    )
    assert new_file.exists()


def test_download_file(setup):
    sleep(1.5)  # Hack to get different timestamps for dirs
    client, tokens = setup
    # Upload test content
    body = {
        "email": "pii-recipient@example.org",
        "id": str(tokens[2]),
        "raw_hash": "77e4d140d5636d103d797254143c498fbd057af8",
        "filename": "file.txt",
        "base64_content": "aGVsbG8gd29ybGQK...",
    }
    client.post(f"/upload", json=body)

    # Verify downloaded content
    response = client.get(f"/download/{tokens[2]}")
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "file.txt"
    assert data["raw_hash"] == body["raw_hash"]
    assert data["base64_content"] == "aGVsbG8gd29ybGQK..."
    new_file = next((Path.home() / "uploads").glob(f"*/{tokens[2]}/*/file.txt"))
    assert new_file.exists()


@pytest.mark.dependency(depends_on=["test_upload_file", "test_download_file"])
def test_delete_file(setup):
    sleep(3)  # Hack to get different timestamps for dirs
    client, tokens = setup
    # Upload test content
    body = {
        "email": "pii-recipient@example.org",
        "id": str(tokens[3]),
        "raw_hash": "77e4d140d5636d103d797254143c498fbd057af8",
        "filename": "file.txt",
        "base64_content": "aGVsbG8gd29ybGQK...",
    }
    client.post(f"/upload", json=body)

    # Delete uploaded file
    response = client.delete(f"/download/{tokens[3]}/{body['raw_hash']}")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == f"File with ID {tokens[3]} and hash {body['raw_hash']} deleted"

    # Check that file is deleted
    new_file = list((Path.home() / "uploads").glob(f"*/{tokens[3]}/*/file.txt"))
    assert new_file == []  # No such path exists
