import { useState } from "react";
import { Box, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const passwordBoxStyles = {
  padding: "15px",
  border: "#8080805c 1px solid",
  borderRadius: "5px",
  width: "fit-content",
};

export default function PasswordField({ password }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      console.log("copied: ", password);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Typography sx={passwordBoxStyles}>{password}</Typography>
      {copied ? (
        <CheckCircleIcon sx={{ marginLeft: "10px", color: "#11b917" }} />
      ) : (
        <ContentCopyIcon
          color="primary"
          sx={{ marginLeft: "10px", cursor: "pointer" }}
          onClick={copyToClipboard}
        />
      )}
    </Box>
  );
}
