import { useEffect, useState, useCallback } from "react";
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
  uploadChunkedFile,
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
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [postIsSuccessful, setPostIsSuccessful] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [fileId, setFileId] = useState("");
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
    let intervalId;
    const checkRecaptcha = () => {
      if (typeof grecaptcha !== "undefined" && grecaptcha.ready) {
        clearInterval(intervalId); // stop polling on success
        grecaptcha.ready(() => {
          setCaptchaReady(true);
          console.log("reCAPTCHA is ready.");
        });
      } else {
        console.warn("reCAPTCHA script not yet available, checking again...");
      }
    };
    intervalId = setInterval(checkRecaptcha, 500);
    // stop the interval when the component unmounts.
    return () => {
      clearInterval(intervalId);
    };
  }, []);

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
    setFileName(file[0].name);
  };

  const handlePost = async () => {
    setLoading(true);
    setAlertMessage(null);
    let id = createToken();
    setFileId(id);

    try {
      // verify humanity
      const recaptchaToken = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {
        action: "upload",
      });
      const isHuman = await api.post(`/authentication`, {
        recaptchaToken: recaptchaToken,
      });
      if (!isHuman) {
        setLoading(false);
        setAlertMessage("CAPTCHA verification failed. Please try again.");
        console.error("Not a human.");
      } else {
        // get the initial file hash (partial hash for large files, full for small files)
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
      }
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
      setAlertMessage("There was a problem uploading your file.");
      // setPostIsSuccessful(true); // XXX FOR DEVS
    }
  };

  const handleUploadCompletion = async (fileHash, id) => {
    let finalBody = {
      email: email,
      fileId: id,
      fileHash: fileHash,
      filename: fileName,
    };
    let response;

    try {
      // attempt to send final request with retries in case it arrives before the last chunk
      for (let attempt = 0; attempt < 3; attempt++) {
        const delay = 1000 * Math.pow(3, attempt);
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        response = await api.post(`/complete-upload`, finalBody);
        if (!response.error) {
          console.log("File posted successfully:", response.data);
          setPostIsSuccessful(true);
          updateMessage("Upload complete.");
          setUploadProgress(100);
          setLoading(false);
          break;
        }
      }
      if (response.error) {
        console.error("Error posting file:", response);
        setLoading(false);
        setAlertMessage("There was a problem uploading your file.");
        setPostIsSuccessful(false);
      }
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
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
