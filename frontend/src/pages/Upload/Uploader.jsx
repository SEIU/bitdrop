import { useState } from "react";
import Dropzone from "react-dropzone";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const dropZoneStyles = {
  border: "2px dashed #cccccc",
  height: "150px",
  borderRadius: "4px",
  cursor: "pointer",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  marginBottom: "1.5rem",
};

export default function Uploader({ handleFileUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = (fileToUpload) => {
    setSelectedFile(fileToUpload[0]);
    setSelectedFileName(fileToUpload[0].path);
  };

  const beginUpload = async () => {
    setLoading(true);

    const response = await uploadFile(args);
    if (!response.error && response.data) {
      handleFileUpload(response.data);
    } else {
      // handle failure
    }
    setLoading(false);
  };

  return (
    <>
      <Box sx={dropZoneStyles}>
        {!loading ? (
          selectedFile ? (
            <>
              <Typography sx={{ fontSize: "1.3rem", marginBottom: "15px" }}>
                File name here?
              </Typography>
              <Box>
                <Button onClick={() => setSelectedFile(null)}>Cancel</Button>
                <Button onClick={beginUpload}>Upload</Button>
              </Box>
            </>
          ) : (
            <Dropzone onDrop={onDrop}>
              {({ getRootProps, getInputProps }) => (
                <Box {...getRootProps({ className: "dropzone" })}>
                  <input {...getInputProps()} data-testid="file-input" />
                  <Box>
                    <CloudUploadIcon />
                    <Typography>
                      Drag & drop a file here, or click to select a file
                    </Typography>
                  </Box>
                </Box>
              )}
            </Dropzone>
          )
        ) : (
          <Box>
            <CircularProgress />
          </Box>
        )}
      </Box>
    </>
  );
}
