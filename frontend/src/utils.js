import axios from "axios";
const PASSWORD_LENGTH = 4;

export function getBackendUrl() {
  const developmentUrl = "http://127.0.0.1:8000";
  if (window.location.hostname === "localhost") {
    return developmentUrl;
  }
  return "https://api.b2.seiu.org";
}

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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
};

export const createToken = () => {
  return window.crypto.randomUUID();
};

export const createFileHash = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target.result;
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hexHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        resolve(hexHash);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
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

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target.result);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

export const processAndEncryptFile = async (file, password, hash) => {
  const fileContentBuffer = await readFileAsArrayBuffer(file);
  const ciphertextBase64 = await encryptFile(fileContentBuffer, password, hash);
  return ciphertextBase64;
};

export const encryptFile = async (fileContentBuffer, password, hash) => {
  // create initialization vector from hash
  const ivHex = hash.slice(0, 32);
  let iv = hexToBytes(ivHex);
  // create key from password using iv as salt
  const key = await deriveKeyFromPassword(password, iv);

  let ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv: iv },
    key,
    fileContentBuffer
  );
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
  return ciphertextBase64;
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
