import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../../api/axiosClient";
import Uploader from "./Uploader";
import PasswordField from "../../components/PasswordField";
import { containerStyles } from "../../components/sharedStyles";
import {
  generatePassword,
  isValidEmail,
  createToken,
  createFileHash,
  processAndEncryptFile,
} from "../../utils";
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
  const [navId, setNavId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setCanSubmit(selectedFile && validEmail);
  }, [email, selectedFile]);

  const handleFileDrop = async (file) => {
    setSelectedFile(file);
    setFileName(file[0].path);
  };

  const handlePost = async () => {
    setLoading(true);

    let id = createToken();
    setNavId(id);
    let fileHash = await createFileHash(selectedFile[0]);
    let encryptedFile = await processAndEncryptFile(
      selectedFile[0],
      password,
      fileHash
    );
    let url = `/upload/`;
    let body = {
      email: email,
      id: id,
      raw_hash: fileHash,
      filename: fileName,
      base64_content: encryptedFile,
    };
    try {
      const response = await api.post(url, body);
      console.log("File posted successfully:", response.data);
      setLoading(false);
      setPostIsSuccessful(true);
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
      setAlertMessage("There was a problem uploading your file.");
      setPostIsSuccessful(true); // XXX UNHACK THIS
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
  };

  const handleAlertClose = () => {
    setAlertMessage(null);
  };

  const goToDownload = () => {
    navigate(`verify?id=${navId}`);
  };

  return (
    <>
      {loading && <LinearProgress />}

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
        <Box>
          <Box sx={inputBoxStyles}>
            <Typography>Upload the file you want to share.</Typography>
            <Box>
              <Uploader
                handleFileDrop={handleFileDrop}
                isDisabled={postIsSuccessful}
                fileName={fileName}
              />
            </Box>
          </Box>
          <Box sx={inputBoxStyles}>
            <Typography>
              Enter the email of the person you want to share the file with. An
              email with a link to download the file will be automatically be
              sent to them.
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
              disabled={!canSubmit}
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
                  The download link was sent to <b>{email}</b>. Copy the
                  password and share via a different channel, such as Slack,
                  Signal, or text message. The person who receives the link will
                  be able to click on it, enter the password, and download the
                  file.
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
              <Button onClick={goToDownload}>Verify Download (devs)</Button>
            </Box>
          </>
        )}
      </Container>
    </>
  );
}
