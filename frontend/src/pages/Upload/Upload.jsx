import { useEffect, useState } from "react";
import Uploader from "./Uploader";
import { generatePassword } from "../../utils/generatePassword";
import { isValidEmail } from "../../utils/isValidEmail";
import { Container, Box, Typography, TextField, Button } from "@mui/material";

export default function Upload() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileDrop = (file) => {
    console.log(file);
    // make sure email is valid
    // setLoading
    // other stuff
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
