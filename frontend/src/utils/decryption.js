import {
  hexToBytes,
  deriveKeyFromPassword,
  base64ToArrayBuffer,
} from "./utils";

export const decryptFile = async (chunks, password, hash) => {
  const saltHex = hash.slice(0, 32);
  const salt = hexToBytes(saltHex);
  const key = await deriveKeyFromPassword(password, salt);
  let plainTextChunks = [];

  for (let i = 0; i < chunks.length; i++) {
    let encryptedBuffer = await base64ToArrayBuffer(chunks[i]);
    let decryptedChunk;
    const nonce = encryptedBuffer.slice(0, 12);
    const ciphertextWithTag = encryptedBuffer.slice(12);

    try {
      decryptedChunk = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce },
        key,
        ciphertextWithTag
      );
    } catch (err) {
      console.error(
        `Decryption failed at chunk ${i + 1}/${chunks.length}.`,
        err
      );
      throw new Error(
        "Decryption failed. Please check your password or ensure the file is not corrupted."
      );
    }
    plainTextChunks.push(decryptedChunk);
  }

  const plaintextBuffer = reassembleChunks(plainTextChunks);

  const plaintextBlob = new Blob([plaintextBuffer], {
    type: "application/octet-stream",
  });
  return plaintextBlob;
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
