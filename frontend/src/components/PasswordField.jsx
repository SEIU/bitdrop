import { Box, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const passwordBoxStyles = {
  padding: "15px",
  border: "#8080805c 1px solid",
  borderRadius: "5px",
  width: "fit-content",
};

export default function PasswordField({ password }) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      alert(`${password} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <Typography sx={passwordBoxStyles}>{password}</Typography>
      <ContentCopyIcon
        color="primary"
        sx={{ marginLeft: "10px", cursor: "pointer" }}
        onClick={copyToClipboard}
      />
    </Box>
  );
}
