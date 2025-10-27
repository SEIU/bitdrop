from base64 import b64encode
from pathlib import Path
import re
import secrets
from time import sleep

import pytest

from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def setup():
    from app.main import app

    client = TestClient(app)
    token = secrets.token_hex(10)
    yield client, token


def test_upload_file(setup):
    client, token = setup
    response = client.post(
        f"/api/upload/{token}-1/abcde12345/file.txt",
        data=b"Hello World!",
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "file.txt"
    assert data["id"] == f"{token}-1"
    assert re.match(r"^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", data["timestamp"])

    new_file = (
        Path.home()
        / "uploads"
        / data["timestamp"]
        / f"{token}-1"
        / "abcde12345"
        / "file.txt"
    )
    assert new_file.exists()


def test_download_file(setup):
    sleep(1.5)  # Hack to get different timestamps for dirs
    client, token = setup
    response = client.post(
        f"/api/upload/{token}-2/abcde12345/file.txt",
        data=b"Adios",
    )
    response = client.get(f"/api/download/{token}-2")
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "file.txt"
    assert data["raw_hash"] == "abcde12345"
    assert b64encode(data["base64_content"].encode()) == b"UVdScGIzTT0="

    new_file = next((Path.home() / "uploads").glob(f"*/{token}-2/*/file.txt"))
    assert new_file.exists()


@pytest.mark.dependency(depends_on=["test_upload_file", "test_download_file"])
def test_delete_file(setup):
    sleep(3)  # Hack to get different timestamps for dirs
    client, token = setup
    response = client.post(
        f"/api/upload/{token}-3/abcde/file.txt",
        data=b"Hello World!",
    )
    response = client.delete(f"/api/download/{token}-3/abcde")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == f"File with ID {token}-3 and hash abcde deleted"

    new_file = list((Path.home() / "uploads").glob(f"*/{token}-3/*/file.txt"))
    assert new_file == [] # No such path exists
