import { useEffect, useState } from "react";
import Uploader from "./Uploader";
import {
  generatePassword,
  isValidEmail,
  createToken,
  createFileHash,
  encryptFile,
} from "../../utils";
import { Container, Box, Typography, TextField, Button } from "@mui/material";

export default function Upload() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = createToken();
    console.log(token);
  }, []);

  const handleFileDrop = async (file) => {
    // make sure email is valid
    // setLoading
    let token = createToken();
    let fileHash = await createFileHash(file[0]);
    let res = await encryptFile(file[0], password);
    console.log(res);

    // encrypt content
    // postFile
    // unset loading
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  useEffect(() => {
    setPassword(generatePassword());
  }, []);

  return (
    <Container>
      <Box>
        <Typography>Instructions as needed</Typography>
        <Typography>
          Send password via a separate channel from the email address used!
        </Typography>
        <Typography>
          Files will be deleted after 24 hours or at first download.
        </Typography>
      </Box>
      <Box>
        <Box>
          <Typography>password: {password}</Typography>
          <Typography>file selected:</Typography>
          <Typography>email link to:</Typography>
          <TextField
            type="email"
            label="email"
            variant="standard"
            onChange={handleEmailChange}
          />
          <Typography>deletion link</Typography>
        </Box>
      </Box>

      <Box>
        <Uploader handleFileDrop={handleFileDrop} />
      </Box>
    </Container>
  );
}
