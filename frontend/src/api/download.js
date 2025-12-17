import api from "./axiosClient";

export const getNumberOfChunks = async (fileId) => {
  try {
    let res = await api.get(`/count-chunks/${fileId}`);
    if (!res.error && res.data) {
      return {
        success: true,
        data: res.data,
      };
    } else {
      return {
        success: false,
        error: res,
        message: "Unable to get number of chunks.",
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err,
      message: "Unable to get number of chunks.",
    };
  }
};

export const clumpDownload = async (fileId) => {
  console.log("clump");
  try {
    const res = await api.get(`/download/${fileId}`);
    if (!res.error && res.data) {
      return {
        chunks: res.data.chunks,
        fileName: res.data.filename,
        fileHash: res.data.fileHash,
        success: true,
      };
    } else {
      return {
        success: false,
        error: res,
        message: "Unable to download file.",
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err,
      message: "Unable to download file.",
    };
  }
};

export const chunkedDownload = async (fileId, numChunks) => {
  console.log("chunk");
  try {
    let download = { chunks: [] };
    for (let i = 1; i <= numChunks; i++) {
      let res = await api.get(`download-chunk/${fileId}/${i}`);
      if (!res.error && res.data) {
        download.chunks.push(res.data.chunk);
        if (i === numChunks) {
          download.fileName = res.data.filename;
          download.fileHash = res.data.fileHash;
          download.success = true;
        }
      } else {
        // error downloading a chunk
        return {
          success: false,
          error: res,
          response: res,
          message: `download failed on chunk ${i}`,
        };
      }
    }
    return download;
  } catch (err) {
    return {
      success: false,
      error: err,
      message: "Chunked download failed.",
    };
  }
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};

export const deleteFile = async (id, hash) => {
  let url = `/download/${id}/${hash}`;
  try {
    const response = await api.delete(url);
  } catch (error) {
    console.error("Error downloading file:", error);
  }
};
