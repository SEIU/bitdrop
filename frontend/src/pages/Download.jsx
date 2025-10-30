import { useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router";
import { getBackendUrl } from "../utils";
import { decryptFile } from "../utils";
import { Button, TextField, Typography } from "@mui/material";

export default function Download() {
  const backendUrl = getBackendUrl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const handleChangePassword = (e) => {
    setPassword(e.target.value);
  };

  const handleDownload = async () => {
    let id = searchParams.get("id");
    let url = `${backendUrl}/api/download/${id}`;

    try {
      const response = await axios.get(url);
      console.log("File downloaded successfully:", response.data);
      let hash = response.data.raw_hash;
      decryptFile(response.data.base64_content, password, hash);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  return (
    <>
      <Typography>Password: </Typography>
      <TextField
        value={password}
        variant="outlined"
        onChange={handleChangePassword}
      />
      <Button onClick={handleDownload}>Download</Button>
    </>
  );
}
