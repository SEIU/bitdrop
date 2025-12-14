from base64 import b64decode
from collections import namedtuple
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


def decrypt(file_id: str, file_hash: str, password: str) -> Decrypt:
    uploads = Path.home() / "uploads"
    match = list(uploads.glob(f"*/{file_id}/{file_hash}/*"))
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
    chunks = list(download.glob("*"))

    salt_hex = file_hash[:32]
    salt = bytes.fromhex(salt_hex)
    key = derive_key_from_password(password, salt)

    for chunk in chunks:
        data = b64decode(chunk.read_text())
        nonce = data[:32]
        ciphertext_with_tag = data[32:]
        try:
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            plaintext = cipher.decrypt(ciphertext_with_tag)
            buff = io.BytesIO(plaintext)
            print("XXX", plaintext[:60])
        except (ValueError, KeyError):
            print("Incorrect decryption")

        

    return Decrypt(
        status="OK",
        filename=download.name,
        timestamp=timestamp,
        num_chunks=len(chunks),
        hash_original=file_hash,
        hash_download=None,
        buffer=buff,
    )
