import { useEffect } from "react";
import Uploader from "./Uploader";
import { generatePassword } from "../../utils/generatePassword";
import { Container, Box, Typography } from "@mui/material";

export default function Upload() {
  const handleFileDrop = (file) => {
    console.log(file);
  };

  useEffect(() => {
    generatePassword();
  }, []);

  return (
    <Container>
      <Box>
        <Typography>Here is some information and instructions</Typography>
      </Box>
      <Box>
        <Box>
          <Typography>password</Typography>
          <Typography>file selected</Typography>
          <Typography>email file to</Typography>
          <Typography>deletion link</Typography>
        </Box>
      </Box>

      <Box>
        <Uploader handleFileDrop={handleFileDrop} />
      </Box>
    </Container>
  );
}
