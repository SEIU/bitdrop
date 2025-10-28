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

export default function Uploader({ handleFileDrop }) {
  const onDrop = (selectedFile) => {
    handleFileDrop(selectedFile);
  };

  return (
    <>
      <Box sx={dropZoneStyles}>
        <Dropzone onDrop={onDrop}>
          {({ getRootProps, getInputProps }) => (
            <Box {...getRootProps()}>
              <input {...getInputProps()} />
              <Box>
                <CloudUploadIcon />
                <Typography>
                  Drag & drop a file here, or click to select a file
                </Typography>
              </Box>
            </Box>
          )}
        </Dropzone>
      </Box>
    </>
  );
}
