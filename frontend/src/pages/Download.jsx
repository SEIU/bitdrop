import { useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router";
import { getBackendUrl } from "../utils";
import { decryptFile } from "../utils";
import { Button, TextField, Typography, Container, Box } from "@mui/material";
import { containerStyles } from "../components/sharedStyles";

export default function Download() {
  const backendUrl = getBackendUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  };

  // TODO handle file deletion

  const handleDownload = async () => {
    let id = searchParams.get("id");
    let url = `${backendUrl}/api/download/${id}`;

    try {
      const response = await axios.get(url);
      let hash = response.data.raw_hash;
      let plainTextBlob = await decryptFile(
        response.data.base64_content,
        password,
        hash
      );
      downloadBlob(plainTextBlob, response.data.filename);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container sx={containerStyles}>
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Typography sx={{ marginRight: "10px" }}>Password: </Typography>
          <TextField
            value={password}
            variant="outlined"
            onChange={handleChangePassword}
          />
        </Box>
        <Button
          sx={{ marginTop: "20px", width: "200px" }}
          onClick={handleDownload}
        >
          Download
        </Button>
      </Box>
    </Container>
  );
}
