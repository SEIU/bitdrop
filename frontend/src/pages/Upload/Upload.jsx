import { useEffect, useState } from "react";
import axios from "axios";
import { getBackendUrl } from "../../utils";
import Uploader from "./Uploader";
import {
  generatePassword,
  isValidEmail,
  createToken,
  createFileHash,
  encryptFile,
} from "../../utils";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";

export default function Upload() {
  const backendUrl = getBackendUrl();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [postIsSuccessful, setPostIsSuccessful] = useState(false);

  useEffect(() => {
    console.log(email);
  }, [email]);

  const handleFileDrop = async (file) => {
    setSelectedFile(file);
    setFileName(file[0].path);
  };

  const handlePost = async () => {
    setLoading(true);
    let id = createToken();
    let fileHash = await createFileHash(selectedFile[0]);
    let encryptedFile = await encryptFile(selectedFile[0], password, fileHash);
    let url = `${backendUrl}/api/upload/${id}/${fileHash}/${fileName}`;
    try {
      // maybe send the email along?
      const response = await axios.post(url, encryptedFile);
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
    setPassword(generatePassword());
  }, []);

  const handleReset = () => {
    setSelectedFile(null);
    setPassword(generatePassword());
    setEmail("");
    setFileName("");
    setLoading(false);
    setPostIsSuccessful(false);
  };

  return (
    <Container>
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          {postIsSuccessful ? (
            <>
              <Box>
                <Typography>Success!</Typography>
                <Typography>
                  The download link was sent to {email}. Don't forget to send
                  them the password via a different channel.
                </Typography>
              </Box>
              <Box>
                <Typography>Password: {password}</Typography>
                <Typography>deletion link</Typography>
              </Box>
              <Box>
                <Button onClick={handleReset}>Send Another File</Button>
              </Box>
            </>
          ) : (
            <>
              <Box>
                <Box>
                  <Typography>1. Upload the file you want to share.</Typography>
                  <Box>
                    <Typography>File selected: {fileName}</Typography>
                    <Uploader handleFileDrop={handleFileDrop} />
                  </Box>
                </Box>
                <Box>
                  <Typography>
                    2. Enter the email of the person you want to share the file
                    with. An email with a link to download the file will be
                    automatically be sent to them.
                  </Typography>
                  <TextField
                    type="email"
                    label="email"
                    variant="outlined"
                    onChange={handleEmailChange}
                  />
                </Box>
                <Box>
                  <Typography>
                    3. Copy the password and share via a different channel, such
                    as Slack, Signal, or text message. The person who receives
                    the link will be able to click on it, enter the password,
                    and download the file.
                  </Typography>
                  <Typography>Password: {password}</Typography>
                </Box>
                <Typography>
                  Files will be deleted after 24 hours or at first download.
                </Typography>
              </Box>
              <Box>
                <Button onClick={handlePost}>Submit</Button>
              </Box>
            </>
          )}
        </>
      )}
    </Container>
  );
}
