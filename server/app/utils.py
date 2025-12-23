from base64 import b64decode
from collections import namedtuple
from datetime import datetime
from hashlib import sha256
import io
from pathlib import Path

from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import PBKDF2

Decrypt = namedtuple(
    "Decrypt",
    "status filename timestamp num_chunks hash_original hash_download buffer",
)


def derive_key_from_password(password: str, salt: bytes):
    pw_bytes = password.encode()
    return PBKDF2(pw_bytes, salt, 32, count=300000, hmac_hash_module=SHA256)


def decrypt(file_id: str, password: str) -> Decrypt:
    uploads = Path.home() / "uploads"
    match = list(uploads.glob(f"*/{file_id}/*/*"))
    if len(match) == 0:
        return Decrypt(
            status="MISSING",
            filename=None,
            timestamp=None,
            num_chunks=None,
            hash_original=None,
            hash_download=None,
            buffer=None,
        )
    elif len(match) > 1:
        return Decrypt(
            status="DUPLICATE",
            filename=None,
            timestamp=None,
            num_chunks=None,
            hash_original=None,
            hash_download=None,
            buffer=None,
        )

    download = match[0]
    timestamp = download.parent.parent.parent.name
    file_hash = download.parent.name
    chunks = sorted(download.glob("*"), key=lambda s: int(s.name))

    salt_hex = file_hash[:32]
    salt = bytes.fromhex(salt_hex)
    key = derive_key_from_password(password, salt)

    plaintext = io.BytesIO()
    for n, chunk in enumerate(chunks):
        data = b64decode(chunk.read_text())
        nonce = data[:12]
        ciphertext = data[12:-16]
        tag = data[-16:]
        cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
        try:
            # If chunk does not verify, something is corrupted
            data = cipher.decrypt_and_verify(ciphertext, tag)
            plaintext.write(data)
        except Exception as err:
            # Write nonsense to the buffer which will cause wrong SHA
            plaintext.write(f"BAD CHUNK {n + 1} ({err})\n".encode())

    plaintext.seek(0)
    m = sha256()
    m.update(plaintext.getvalue())

    status = "OK" if file_hash == m.hexdigest() else "CORRUPT"
    return Decrypt(
        status=status,
        filename=download.name,
        timestamp=timestamp,
        num_chunks=len(chunks),
        hash_original=file_hash,
        hash_download=m.hexdigest(),
        buffer=plaintext,
    )


def log(msg):
    print(f"{datetime.now().isoformat()}: {msg}")
