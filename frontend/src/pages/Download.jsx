import { useState, useEffect, useCallback } from "react";
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
const CLUMP_DOWNLOAD_LIMIT = import.meta.env.VITE_CLUMP_DOWNLOAD_LIMIT || 10;

export default function Download() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [downloadDisabled, setDownloadDisabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusMessage, setDownloadStatusMessage] = useState(null);
  const updateProgress = useCallback(
    (percent) => setDownloadProgress(percent),
    []
  );
  const updateMessage = useCallback((msg) => setDownloadStatusMessage(msg), []);

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
    updateMessage("Getting ready to download...");

    // get number of chunks in download
    const numChunksResponse = await getNumberOfChunks(id);
    if (!numChunksResponse.success) return handleFailure(numChunksResponse);

    // fetch file
    if (numChunksResponse.data <= CLUMP_DOWNLOAD_LIMIT) {
      // this download has relatively few chunks, ok to download all chunks in one request
      updateMessage("Downloading...");
      downloadResponse = await clumpDownload(id);
    } else {
      // too many chunks for one request, download one chunk at a time
      downloadResponse = await chunkedDownload(
        id,
        numChunksResponse.data,
        updateMessage,
        updateProgress
      );
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
    updateMessage("Download complete!");
  };

  const handleFailure = (res) => {
    setDownloading(false);
    setDownloadStatusMessage(null);
    setAlertMessage(res.message);
    console.log(res);
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
  };

  return (
    <>
      {downloading && downloadProgress === 0 && (
        <LinearProgress sx={{ height: "8px" }} />
      )}
      {downloading && downloadProgress > 0 && downloadProgress < 100 && (
        <LinearProgress
          variant="determinate"
          value={downloadProgress}
          sx={{ height: "8px" }}
        />
      )}
      <Container sx={containerStyles}>
        {downloadStatusMessage && (
          <Alert severity="info" sx={{ marginBottom: "20px" }}>
            Upload Status:{" "}
            <span className="font-bold">{downloadStatusMessage}</span>
          </Alert>
        )}
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
              sx={{ width: "20em" }}
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
