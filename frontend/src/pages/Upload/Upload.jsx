import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { getBackendUrl } from "../../utils";
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
  CircularProgress,
} from "@mui/material";

const inputBoxStyles = {
  marginBottom: "30px",
};

export default function Upload() {
  const backendUrl = getBackendUrl();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [postIsSuccessful, setPostIsSuccessful] = useState(false);
  const [navId, setNavId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setCanSubmit(selectedFile && isValidEmail(email));
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
    let url = `${backendUrl}/api/upload/`;
    let body = {
      email: email,
      id: id,
      raw_hash: fileHash,
      filename: fileName,
      base64_content: encryptedFile,
    };
    try {
      const response = await axios.post(url, body);
      console.log("File posted successfully:", response.data);
      setLoading(false);
      setPostIsSuccessful(true);
    } catch (error) {
      console.error("Error posting file:", error);
      setLoading(false);
      // TODO show some messaging
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
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
    setPassword(generatePassword());
    setEmail("");
    setFileName("");
    setLoading(false);
    setPostIsSuccessful(false);
  };

  const goToDownload = () => {
    navigate(`verify?id=${navId}`);
  };

  return (
    <Container sx={containerStyles}>
      {loading ? (
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {postIsSuccessful ? (
            <>
              <Box>
                <Box sx={{ marginBottom: "10px" }}>
                  <Typography>Success!</Typography>
                  <Typography>
                    The download link was sent to {email}. Copy the password and
                    share via a different channel, such as Slack, Signal, or
                    text message. The person who receives the link will be able
                    to click on it, enter the password, and download the file.
                  </Typography>
                </Box>

                <PasswordField password={password} />

                <Button sx={{ marginTop: "20px" }} onClick={handleReset}>
                  Send Another File
                </Button>
              </Box>
              <Box>
                {/* FOR DEVELOPMENT ONLY */}
                <Button onClick={goToDownload}>Verify Download (devs)</Button>
              </Box>
            </>
          ) : (
            <>
              <Box>
                <Box sx={inputBoxStyles}>
                  <Typography>1. Upload the file you want to share.</Typography>
                  <Box>
                    <Typography>File selected: {fileName}</Typography>
                    <Uploader handleFileDrop={handleFileDrop} />
                  </Box>
                </Box>
                <Box sx={inputBoxStyles}>
                  <Typography>
                    2. Enter the email of the person you want to share the file
                    with. An email with a link to download the file will be
                    automatically be sent to them.
                  </Typography>
                  <TextField
                    type="email"
                    label="Email (required)"
                    variant="outlined"
                    onChange={handleEmailChange}
                  />
                </Box>
                <Box sx={inputBoxStyles}>
                  <Typography>
                    Files will be deleted after 24 hours or at first download.
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Button onClick={handlePost} disabled={!canSubmit}>
                  Submit
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Container>
  );
}
