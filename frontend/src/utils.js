import axios from "axios";
const PASSWORD_LENGTH = 4;

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
        const hashBuffer = await window.crypto.subtle.digest("SHA-1", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        resolve(hashHex);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const encryptFile = async (file, password) => {
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

  let encodedFile = encoder.encode(file);
  let iv = window.crypto.getRandomValues(new Uint8Array(16));
  let ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv,
    },
    key,
    encodedFile
  );
  return ciphertext;
};
