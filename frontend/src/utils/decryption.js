import {
  hexToBytes,
  deriveKeyFromPassword,
  base64ToArrayBuffer,
} from "./utils";

export const decryptFile = async (chunks, password, hash) => {
  try {
    // key derivation
    const saltHex = hash.slice(0, 32);
    const salt = hexToBytes(saltHex);
    const key = await deriveKeyFromPassword(password, salt);

    let plainTextChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      // base64 decoding
      let encryptedBuffer = await base64ToArrayBuffer(chunks[i]);
      if (!encryptedBuffer)
        throw new Error(`Chunk ${i + 1} could not be decoded.`);

      const nonce = encryptedBuffer.slice(0, 12);
      const ciphertextWithTag = encryptedBuffer.slice(12);

      // decryption
      try {
        const decryptedChunk = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: nonce },
          key,
          ciphertextWithTag
        );
        plainTextChunks.push(decryptedChunk);
      } catch (cryptoErr) {
        // catch this specifically to provide a better error message
        return {
          success: false,
          message:
            "Decryption failed. Incorrect password or corrupted file data.",
          error: cryptoErr,
        };
      }
    }

    const plaintextBuffer = reassembleChunks(plainTextChunks);
    const plaintextBlob = new Blob([plaintextBuffer], {
      type: "application/octet-stream",
    });

    return {
      success: true,
      data: plaintextBlob,
    };
  } catch (err) {
    return {
      success: false,
      message: "Something went wrong during decryption.",
      error: err,
    };
  }
};

const reassembleChunks = (chunks) => {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
  const finalArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    const chunkView = new Uint8Array(chunk);
    finalArray.set(chunkView, offset);
    offset += chunk.byteLength;
  }
  return finalArray.buffer;
};
