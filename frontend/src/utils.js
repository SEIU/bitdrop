import axios from "axios";
import api from "./api/axiosClient";
const PASSWORD_LENGTH = 4;
const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB for chunking
const MAX_RETRIES = 5;

export const generatePassword = async () => {
  const wordList = await axios
    .get("/wordlist-10k-clean.json")
    .then((response) => {
      return response.data;
    })
    .catch((error) => console.error("Error fetching word file:", error));

  const passwordParts = [];
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    let randomInt = Math.floor(Math.random() * wordList.length);
    passwordParts.push(wordList[randomInt]);
  }
  const password = passwordParts.join("-");
  return password;
};

export const isValidEmail = (input) => {
  // Pretty good regex for email address validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

export const createToken = () => {
  return window.crypto.randomUUID();
};

// Must calculate SHA-256 hash of the (full) file to check integrity
export const createFileHash = (file) => {
  if (!file) return Promise.resolve(null);

  return new Promise(async (resolve, reject) => {
    try {
      const crypto = window.crypto.subtle;
      const reader = new FileReader();

      const buffer = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsArrayBuffer(file);
      });

      const hashBuffer = await crypto.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hexHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      resolve(hexHash);
    } catch (e) {
      reject(e);
    }
  });
};

const generateNonce = () => {
  return window.crypto.getRandomValues(new Uint8Array(12));
};

const concatBuffers = (buffer1, buffer2) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

// converts hexidecimal string into byte array
const hexToBytes = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
};

// convert ArrayBuffer to Base64 string for storage/transmission
const arrayBufferToBase64 = (buffer) => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(",")[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(blob);
  });
};

// convert Base64 string back to ArrayBuffer for crypto operations
const base64ToArrayBuffer = async (base64) => {
  const dataUrl = `data:application/octet-stream;base64,${base64}`;
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
};

export const getIV = (hash) => {
  // Use the SECOND 16 bytes (index 32 to 64) for the IV
  const ivHex = hash.slice(32, 64);
  const iv = hexToBytes(ivHex);
  return iv; // Uint8Array of length 16
};

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

async function deriveKeyFromPassword(password, salt) {
  const passwordBytes = new TextEncoder().encode(password);
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 300000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return aesKey;
}
