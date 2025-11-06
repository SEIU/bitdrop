import { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "react-router";
import { getBackendUrl } from "../utils";
import { decryptFile } from "../utils";
import {
  Button,
  TextField,
  Typography,
  Container,
  Box,
  Alert,
} from "@mui/material";
import { containerStyles } from "../components/sharedStyles";

export default function Download() {
  const backendUrl = getBackendUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    if (password !== "") {
      setDownloadDisabled(false);
    }
  }, [password]);

  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  };

  const handleDownload = async () => {
    let id = searchParams.get("id");
    let url = `${backendUrl}/download/${id}`;
    let hash;

    try {
      const response = await axios.get(url);
      hash = response.data.raw_hash;
      let plainTextBlob = await decryptFile(
        response.data.base64_content,
        password,
        response.data.raw_hash
      );
      downloadBlob(plainTextBlob, response.data.filename);
      await deleteFile(id, hash);
      setDownloadDisabled(true);
    } catch (err) {
      if (err.response?.status === 404) {
        setAlertMessage(err.response.data.message);
      } else {
        setAlertMessage(
          "There was a problem decrypting this file. Make sure you have the correct password for this asset."
        );
      }
      console.error("Error downloading file:", err);
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

  const deleteFile = async (id, hash) => {
    let url = `${backendUrl}/download/${id}/${hash}`;
    try {
      const response = await axios.delete(url);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
  };

  return (
    <Container sx={containerStyles}>
      {alertMessage && (
        <Alert
          severity="error"
          sx={{ marginBottom: "20px" }}
          onClose={handleAlertClose}
        >
          {alertMessage}
        </Alert>
      )}
      <Box
        sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Box sx={{ textAlign: "center", marginBottom: "20px" }}>
          <Typography>Enter the password to download the file.</Typography>
          <Typography>
            The file can only be downloaded once and will be automatically
            deleted from the cloud after download.
          </Typography>
        </Box>

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
          disabled={downloadDisabled}
        >
          Download
        </Button>
      </Box>
    </Container>
  );
}
