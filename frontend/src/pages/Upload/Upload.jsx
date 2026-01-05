const EMAIL_AUTH_TOKEN = import.meta.env.VITE_EMAIL_AUTH_TOKEN;

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import Uploader from "./Uploader";
import PasswordField from "../../components/PasswordField";
import { containerStyles } from "../../components/sharedStyles";
import { uploadFinalChunk } from "../../api/upload";
import { uploadChunkedFile } from "../../utils/encryption";
import {
  generatePassword,
  isValidEmail,
  createToken,
  createFileHash,
  checkFileSize,
} from "../../utils/utils";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Alert,
} from "@mui/material";

const inputBoxStyles = {
  marginBottom: "30px",
};

export default function Upload() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [emailIsTouched, setEmailIsTouched] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [postIsSuccessful, setPostIsSuccessful] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [fileId, setFileId] = useState("");
  const [fileSizeOK, setFileSizeOK] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMessage, setUploadStatusMessage] =
    useState("Ready to upload.");
  const navigate = useNavigate();
  const updateProgress = useCallback(
    (percent) => setUploadProgress(percent),
    []
  );
  const updateMessage = useCallback((msg) => setUploadStatusMessage(msg), []);

  useEffect(() => {
    if (!fileSizeOK) {
      setAlertMessage("This file exceeds the maximum upload size of 100MB");
    } else {
      setAlertMessage(null);
    }
  }, [selectedFile]);

  useEffect(() => {
    setCanSubmit(selectedFile && validEmail && fileSizeOK);
  }, [email, selectedFile]);

  const handleFileDrop = async (file) => {
    setSelectedFile(file[0]);
    setFileName(file[0].name);
    setFileSizeOK(checkFileSize(file[0].size));
  };

  const handlePost = async () => {
    if (!EMAIL_AUTH_TOKEN) {
      setAlertMessage("There was a problem uploading your file.");
      console.error("Email auth token is missing.");
      return;
    }
    setLoading(true);
    setAlertMessage(null);
    let id = createToken();
    setFileId(id);

    try {
      const fileHash = await createFileHash(selectedFile);
      // chunked encryption and upload (multi-step process with progress tracking)
      updateMessage("Beginning upload ...");
      const isSuccess = await uploadChunkedFile({
        selectedFile,
        password,
        fileHash,
        id,
        updateProgress,
        updateMessage,
      });

      if (!isSuccess) {
        throw new Error("Chunked upload failed. Check console for details.");
      } else {
        handleUploadCompletion(fileHash, id);
      }
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
      setAlertMessage("There was a problem uploading your file.");
    }
  };

  const handleUploadCompletion = async (fileHash, id) => {
    let isSuccess = await uploadFinalChunk({
      email: email,
      fileId: id,
      fileHash: fileHash,
      filename: fileName,
      emailAuthToken: EMAIL_AUTH_TOKEN,
    });
    if (isSuccess) {
      setPostIsSuccessful(true);
      updateMessage("Upload complete.");
      setUploadProgress(100);
      setLoading(false);
    } else {
      setLoading(false);
      setAlertMessage("There was a problem uploading your file.");
      setPostIsSuccessful(false);
    }
  };

  const handleEmailChange = (e) => {
    let value = e.target.value;
    setEmail(value);
    setValidEmail(isValidEmail(value));
    setEmailIsTouched(true);
  };

  useEffect(() => {
    getPassword();
  }, []);

  const getPassword = async () => {
    const pw = await generatePassword();
    setPassword(pw);
  };

  const handleReset = () => {
    setSelectedFile(null);
    getPassword();
    setEmail("");
    setFileName(null);
    setLoading(false);
    setPostIsSuccessful(false);
    setUploadProgress(0);
    setUploadStatusMessage("Ready to upload.");
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
  };

  const goToDownload = () => {
    navigate(`verify?id=${fileId}`);
  };

  return (
    <>
      {loading && uploadProgress === 0 && (
        <LinearProgress sx={{ height: "8px" }} />
      )}{" "}
      {loading && uploadProgress > 0 && uploadProgress < 100 && (
        <LinearProgress
          variant="determinate"
          value={uploadProgress}
          sx={{ height: "8px" }}
        />
      )}
      <Container sx={containerStyles}>
        {loading && (
          <Alert severity="info" sx={{ marginBottom: "20px" }}>
            Upload Status:{" "}
            <span className="font-bold">{uploadStatusMessage}</span>
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
        <Box>
          <Box sx={inputBoxStyles}>
            <Typography>Upload the file you want to share.</Typography>
            <Box>
              <Uploader
                handleFileDrop={handleFileDrop}
                isDisabled={postIsSuccessful || loading}
                fileName={fileName}
              />
            </Box>
          </Box>
          <Box sx={inputBoxStyles}>
            <Typography>
              Enter the email of the person with whom you want to share this
              file. An email with a download link will automatically be sent to
              the recipient.
            </Typography>
            <TextField
              type="email"
              value={email}
              label="Email (required)"
              variant="outlined"
              disabled={postIsSuccessful}
              onChange={handleEmailChange}
              sx={{
                marginTop: "10px",
                width: {
                  xs: "100%",
                  md: "300px",
                },
              }}
            />
            {emailIsTouched && !validEmail && (
              <Typography sx={{ color: "red" }}>
                Please enter a valid email
              </Typography>
            )}
          </Box>
          <Box sx={inputBoxStyles}>
            <Typography>
              Files will be deleted after 24 hours or after one download.
            </Typography>
          </Box>
        </Box>
        {!postIsSuccessful && (
          <Box>
            <Button
              onClick={handlePost}
              disabled={!canSubmit || loading}
              sx={{
                width: {
                  xs: "100%",
                  md: "fit-content",
                },
              }}
            >
              Submit
            </Button>
          </Box>
        )}

        {postIsSuccessful && (
          <>
            <Box>
              <Box sx={{ marginBottom: "10px" }}>
                <Typography>Success!</Typography>
                <Typography>
                  The download link was sent to <b>{email}</b>.<br />
                  Copy the password and share over a different channel, such as
                  Slack, Signal, Google Chat or other messaging system, or via
                  SMS text message.
                  <br />
                  You may also share the passphrase of English words over the
                  telephone or speaking in person.
                  <br />
                  The person who receives the link will be able to click on the
                  link and enter the password to download the file.
                </Typography>
              </Box>

              <PasswordField password={password} />

              <Button
                sx={{
                  marginTop: "20px",
                  width: {
                    xs: "100%",
                    md: "fit-content",
                  },
                }}
                onClick={handleReset}
              >
                Send Another File
              </Button>
            </Box>
            <Box>
              {/* FOR DEVELOPMENT ONLY */}
              {/* <Button onClick={goToDownload}>Verify Download (devs)</Button> */}
            </Box>
          </>
        )}
      </Container>
    </>
  );
}
