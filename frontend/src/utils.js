import axios from "axios";
const PASSWORD_LENGTH = 4;

export function getBackendUrl() {
  const developmentUrl = "http://127.0.0.1:8000";
  if (window.location.hostname === "localhost") {
    return developmentUrl;
  }
  return import.meta.env.VITE_BACKEND_URL;
}

export const generatePassword = async () => {
  const wordList = await axios
    .get("/wordlist.10000.gz", {
      responseType: "arraybuffer",
    })
    .then((response) => {
      const decoder = new TextDecoder("utf-8");
      const decompressedData = decoder.decode(response.data);
      const words = decompressedData.trim().split("\n");
      return words;
    })
    .catch((error) =>
      console.error("Error fetching or decompressing file:", error)
    );

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

export const encryptFile = async (file, password, hash) => {
  const encoder = new TextEncoder();
  const encodedPassword = encoder.encode(password);
  const passwordBuffer = encodedPassword.buffer;
  let key = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const ivHex = hash.slice(0, 32);
  let iv = hexToBytes(ivHex);

  let encodedFile = encoder.encode(file);
  let ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    key,
    encodedFile
  );
  return ciphertext;
};
