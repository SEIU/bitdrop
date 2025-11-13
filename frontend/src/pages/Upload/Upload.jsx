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
  isLargeFile,
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

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export default function Upload() {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [validEmail, setValidEmail] = useState(false);
  const [emailIsTouched, setEmailIsTouched] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [largeFile, setLargeFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [postIsSuccessful, setPostIsSuccessful] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [navId, setNavId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof grecaptcha === "undefined" || !grecaptcha.ready) {
      console.error(
        "reCAPTCHA script not found. Ensure it is loaded globally in the host HTML."
      );
      return;
    }
    grecaptcha.ready(() => {
      setCaptchaReady(true);
      console.log("reCAPTCHA is ready.");
    });
  }, []);

  useEffect(() => {
    setCanSubmit(selectedFile && validEmail && captchaReady);
  }, [email, selectedFile, captchaReady]);

  const handleFileDrop = async (file) => {
    setSelectedFile(file[0]);
    setFileName(file[0].path);
  };

  const handlePost = async () => {
    setLoading(true);
    setLargeFile(isLargeFile(selectedFile));
    let id = createToken();
    setNavId(id);
    let fileHash = await createFileHash(selectedFile);
    let encryptedFile = await processAndEncryptFile(
      selectedFile,
      password,
      fileHash
    );
    let url = `/upload/`;

    try {
      const recaptchaToken = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {
        action: "upload",
      });
      let body = {
        email: email,
        id: id,
        raw_hash: fileHash,
        filename: fileName,
        base64_content: encryptedFile,
        recaptchaToken: recaptchaToken,
      };
      const response = await api.post(url, body, { timeout: 300000 });
      console.log("File posted successfully:", response.data);
      setLoading(false);
      setPostIsSuccessful(true);
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
      setLargeFile(false);
      setAlertMessage("There was a problem uploading your file.");
      // setPostIsSuccessful(true); // XXX FOR DEVS
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
      {loading && <LinearProgress sx={{ height: "8px" }} />}

      <Container sx={containerStyles}>
        {largeFile && (
          <Alert severity="info" sx={{ marginBottom: "20px" }}>
            This is a large file and may take several minutes to upload.
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
                isDisabled={postIsSuccessful}
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
