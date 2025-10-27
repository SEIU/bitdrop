import Uploader from "./Uploader";
import { Container, Box, Typography } from "@mui/material";

export default function Upload() {
  const handleFileUpload = (upload) => {
    console.log(upload);
  };

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
        <Uploader handleFileUpload={handleFileUpload} />
      </Box>
    </Container>
  );
}
