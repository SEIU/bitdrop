import { useEffect, useState } from "react";
import Uploader from "./Uploader";
import { generatePassword } from "../../utils/generatePassword";
import { Container, Box, Typography, TextField } from "@mui/material";

export default function Upload() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const handleFileDrop = (file) => {
    console.log(file);
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
        <Typography>Here is some information and instructions</Typography>
      </Box>
      <Box>
        <Box>
          <Typography>{password}</Typography>
          <Typography>file selected</Typography>
          <Typography>email file to</Typography>
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
