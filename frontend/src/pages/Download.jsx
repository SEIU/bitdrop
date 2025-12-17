import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { decryptFile } from "../utils/decryption";
import {
  Button,
  TextField,
  Typography,
  Container,
  Box,
  Alert,
  LinearProgress,
} from "@mui/material";
import { containerStyles } from "../components/sharedStyles";
import {
  chunkedDownload,
  clumpDownload,
  deleteFile,
  downloadBlob,
  getNumberOfChunks,
} from "../api/download";
const MAX_DOWNLOAD_CHUNKS = 10; // TODO env variable

export default function Download() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (password !== "") {
      setDownloadDisabled(false);
    }
  }, [password]);

  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  };

  // perform a series of fetches and other actions
  // return from the function if anything fails
  const handleDownload = async () => {
    setDownloading(true);
    let id = searchParams.get("id");
    let downloadResponse;

    // get number of chunks in download
    const numChunksResponse = await getNumberOfChunks(id);
    if (!numChunksResponse.success) return handleFailure(numChunksResponse);

    // fetch file
    if (numChunksResponse.data <= MAX_DOWNLOAD_CHUNKS) {
      // this download has relatively few chunks, ok to download all chunks in one request
      downloadResponse = await clumpDownload(id);
    } else {
      // too many chunks for one request, download one chunk at a time
      downloadResponse = await chunkedDownload(id, numChunksResponse.data);
    }
    if (!downloadResponse.success) return handleFailure(downloadResponse);

    // decrypyt file
    const decryptionResult = await decryptFile(
      downloadResponse.chunks,
      password,
      downloadResponse.fileHash
    );
    if (!decryptionResult.success) return handleFailure(decryptionResult);

    // download file
    let downloadBlobResult = downloadBlob(
      decryptionResult.data,
      downloadResponse.fileName
    );
    if (downloadBlobResult) {
      // delete file
      deleteFile(id, downloadResponse.fileHash);
    }
    setDownloading(false);
    setDownloadDisabled(true);
  };

  const handleFailure = (res) => {
    setDownloading(false);
    setAlertMessage(res.message);
    console.log(res);
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
  };

  return (
    <>
      {downloading && <LinearProgress sx={{ height: "8px" }} />}
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
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
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
            sx={{
              marginTop: "40px",
              width: {
                xs: "100%",
                md: "fit-content",
              },
            }}
            onClick={handleDownload}
            disabled={downloadDisabled || downloading}
          >
            Download
          </Button>
        </Box>
      </Container>
    </>
  );
}
