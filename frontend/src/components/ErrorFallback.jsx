import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router";

function ErrorFallback({ error, redirect }) {
  const [copyStatus, setCopyStatus] = useState("");
  const navigate = useNavigate();

  const goBack = () => {
    navigate(redirect);
  };

  // It's indented this way so it copies with correct indentation (sorry).
  const errorDetailsToCopy = `Error Message: ${error.message}
${error.stack}
Component Props (if available via component stack): ${error.componentStack || "Not available"}`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetailsToCopy);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000); // Clear message after 2 seconds
    } catch (err) {
      console.error("Failed to copy error details: ", err);
      setCopyStatus("Failed to copy!");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  return (
    <Box sx={{ padding: "22px" }}>
      <Typography
        sx={{
          fontSize: "1.3rem",
          marginBottom: "3px",
        }}
      >
        Oops! Something went wrong.
      </Typography>
      {/* <Typography>
        You can help us out by copying and pasting this error into an email or
        slack message to your data support person.
      </Typography> */}
      <Box sx={{ display: "flex", justifyContent: "right", marginTop: "10px" }}>
        {/* <Button
          onClick={(e) => {
            handleCopy();
          }}
        >
          <ContentCopyIcon sx={{ marginRight: "5px" }} />
          {copyStatus || "Copy"}
        </Button> */}

        <Button onClick={goBack}>Go Back</Button>
      </Box>

      <details>
        <Typography sx={{ fontFamily: "monospace" }}>
          Error: {error.message}
          <br></br>
          {error.stack}
        </Typography>
      </details>
    </Box>
  );
}

export default ErrorFallback;
