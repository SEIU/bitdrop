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
