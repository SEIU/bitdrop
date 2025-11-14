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

export const createFileHash = (file) => {
  if (!file) return Promise.resolve(null);

  return new Promise(async (resolve, reject) => {
    try {
      const crypto = window.crypto.subtle;
      const reader = new FileReader();

      // hash the first 512KB to avoid memory issues for large files,
      // while still providing a unique-enough ID for the key salt.
      const chunkToHash = file.slice(0, 512 * 1024);

      const buffer = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsArrayBuffer(chunkToHash);
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

const hexToBytes = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
};

// convert ArrayBuffer to Base64 string for storage/transmission
const arrayBufferToBase64 = (buffer) => {
  // create intermediate binary string
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// convert Base64 string back to ArrayBuffer for crypto operations
const base64ToArrayBuffer = (base64) => {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

// encrypts a single file chunk and upload with retries/exponential backoff
const encryptAndUploadChunk = async (
  chunk,
  key,
  fileId,
  chunkIndex,
  totalChunks,
  fileName,
  hash
) => {
  const ivHex = hash.slice(0, 32);
  let iv = hexToBytes(ivHex);

  // read the chunk into an ArrayBuffer
  const chunkBuffer = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(chunk);
  });

  // encrypt the chunk
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv },
    key,
    chunkBuffer
  );

  // prepare chunk payload
  const chunkPayload = {
    fileId: fileId,
    chunkIndex: chunkIndex,
    totalChunks: totalChunks,
    fileName: fileName,
    iv: arrayBufferToBase64(iv),
    encryptedData: arrayBufferToBase64(ciphertext),
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

  // create encryption key
  const key = await deriveKeyFromPassword(password, salt);

  let offset = 0;
  let successfulChunks = 0;

  updateMessage(`Now uploading ${numChunks} parts...`);

  for (let i = 0; i < numChunks; i++) {
    // yield to the main thread briefly to prevent UI freezing
    await new Promise((resolve) => setTimeout(resolve, 0));

    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = selectedFile.slice(offset, end);

    const success = await encryptAndUploadChunk(
      chunk,
      key,
      id,
      i,
      numChunks,
      selectedFile.name,
      fileHash
    );

    if (!success) {
      throw new Error(
        `Upload failed at chunk ${i + 1}/${numChunks}. See console for details.`
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

export const decryptFile = async (base64_content, password, hash) => {
  const ivHex = hash.slice(0, 32);
  let iv = hexToBytes(ivHex);
  const key = await deriveKeyFromPassword(password, iv);

  let contentArrayBuffer = base64ToArrayBuffer(base64_content);

  // --- Decryption ---
  try {
    let decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      contentArrayBuffer
    );

    const plaintextBlob = new Blob([decrypted], {
      type: "application/octet-stream",
    });
    return plaintextBlob;
  } catch (error) {
    // TODO handle error messaging for user
    console.error("Decryption Failed", error);
    throw new Error("Decryption failed.");
  }
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
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  return aesKey;
}
