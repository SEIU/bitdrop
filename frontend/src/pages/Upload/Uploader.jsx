import Dropzone from "react-dropzone";
import { Box, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useState, useEffect } from "react";

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
  padding: "20px",
};

export default function Uploader({ handleFileDrop, isDisabled, fileName }) {
  const [uploaderText, setUploaderText] = useState(
    "Drag & drop a file here, or click to select a file"
  );

  useEffect(() => {
    if (fileName) {
      setUploaderText("Drag & drop or click to replace the selected file");
    } else {
      ("Drag & drop a file here, or click to select a file");
    }
  }, [fileName]);

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
                <Typography>
                  <b>{fileName}</b>
                </Typography>
                {!isDisabled && (
                  <>
                    <CloudUploadIcon
                      sx={{ fontSize: "3.5rem", color: "#8bb8e0" }}
                    />
                    <Typography>{uploaderText}</Typography>
                  </>
                )}
              </Box>
            </Box>
          )}
        </Dropzone>
      </Box>
    </>
  );
}
