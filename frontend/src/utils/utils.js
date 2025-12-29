import axios from "axios";
const PASSWORD_LENGTH = 4;
const MAX_SIZE_MIB = 100;
const MAX_SIZE_BYTES = MAX_SIZE_MIB * 1024 * 1024; // 104,857,600

export const checkFileSize = (fileSize) => {
  return fileSize < MAX_SIZE_BYTES;
};

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

export const generateNonce = () => {
  return window.crypto.getRandomValues(new Uint8Array(12));
};

export const concatBuffers = (buffer1, buffer2) => {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
};

// converts hexidecimal string into byte array
export const hexToBytes = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return new Uint8Array(bytes);
};

// convert ArrayBuffer to Base64 string for storage/transmission
export const arrayBufferToBase64 = (buffer) => {
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
export const base64ToArrayBuffer = async (base64) => {
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

export const deriveKeyFromPassword = async (password, salt) => {
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
};
