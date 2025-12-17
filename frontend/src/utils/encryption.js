const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB for chunking
const MAX_RETRIES = 5;
import api from "../api/axiosClient";
import {
  generateNonce,
  concatBuffers,
  hexToBytes,
  getIV,
  deriveKeyFromPassword,
  arrayBufferToBase64,
} from "./utils";

// encrypts a single file chunk and upload with retries/exponential backoff
const encryptAndUploadChunk = async (
  chunk,
  key,
  fileId,
  chunkIndex,
  totalChunks
) => {
  const nonce = generateNonce();

  // read the chunk into an ArrayBuffer
  const chunkBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(chunk);
  });

  // encrypt the chunk
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    chunkBuffer
  );

  const fullEncryptedData = concatBuffers(nonce.buffer, ciphertext);

  // prepare chunk payload
  const chunkPayload = {
    fileId: fileId,
    chunkIndex: chunkIndex,
    totalChunks: totalChunks,
    encryptedData: await arrayBufferToBase64(fullEncryptedData),
  };

  // upload with retries
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const delay = 1000 * Math.pow(2, attempt);
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      await api.post(`/upload-chunk`, chunkPayload);
      return true;
    } catch (error) {
      console.error(
        `[Chunk ${chunkIndex}] Upload failed on attempt ${attempt + 1}:`,
        error.message
      );
      if (attempt === MAX_RETRIES - 1) {
        console.error(`[Chunk ${chunkIndex}] Permanent failure.`);
      }
      return false;
    }
  }
};

// TODO high-level description
export const uploadChunkedFile = async ({
  selectedFile,
  password,
  fileHash,
  id,
  updateProgress,
  updateMessage,
}) => {
  const totalSize = selectedFile.size;
  const numChunks = Math.ceil(totalSize / CHUNK_SIZE);

  const saltHex = fileHash.slice(0, 32);
  const salt = hexToBytes(saltHex);
  const iv = getIV(fileHash);

  // create encryption key
  const key = await deriveKeyFromPassword(password, salt);

  let offset = 0;
  let successfulChunks = 0;

  updateMessage(`Now uploading ${numChunks} parts...`);

  for (let i = 1; i <= numChunks; i++) {
    // yield to the main thread briefly to prevent UI freezing
    await new Promise((resolve) => setTimeout(resolve, 0));

    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = selectedFile.slice(offset, end);

    const result = await encryptAndUploadChunk(
      chunk,
      key,
      id,
      i,
      numChunks,
      iv
    );

    if (!result) {
      throw new Error(
        `Upload failed at chunk ${i}/${numChunks}. See console for details.`
      );
    }

    successfulChunks++;
    const currentProgress = Math.round((successfulChunks / numChunks) * 100);
    updateProgress(currentProgress);
    updateMessage(
      `Chunk ${i + 1} of ${numChunks} uploaded. Encrypting next chunk...`
    );

    offset = end;
  }
  updateMessage("File uploaded successfully!");
  return true;
};
