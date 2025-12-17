import api from "./axiosClient";

export const clumpDownload = async (fileId) => {
  console.log("clump");
  try {
    const res = await api.get(`/download/${fileId}`);
    if (!res.error && res.data) {
      return {
        chunks: res.data.chunks,
        fileName: res.data.fileName,
        fileHash: res.data.fileHash,
        success: true,
      };
    } else {
      console.error(res);
      return res;
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err,
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
        console.error(res);
        return {
          success: false,
          error: `download failed on chunk ${i}`,
          response: res,
        };
      }
    }
    return download;
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err,
    };
  }
};
