import Dropzone from "react-dropzone";
import { Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useEffect } from "react";

const dropZoneStyles = {
  border: "2px dashed #cccccc",
  height: "150px",
  borderRadius: "4px",
  cursor: "pointer",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  margin: "10px",
};

export default function Uploader({ handleFileDrop, isDisabled }) {
  useEffect(() => {
    console.log("dropzone is disabled: ", isDisabled);
  });

  const onDrop = (selectedFile) => {
    handleFileDrop(selectedFile);
  };

  return (
    <>
      <Box sx={dropZoneStyles}>
        <Dropzone onDrop={onDrop} disabled={isDisabled}>
          {({ getRootProps, getInputProps }) => (
            <Box {...getRootProps()}>
              <input {...getInputProps()} />
              <Box>
                <CloudUploadIcon
                  sx={{ fontSize: "3.5rem", color: "#8bb8e0" }}
                />
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
