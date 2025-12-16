import api from "./axiosClient";

export const clumpDownload = async (fileId) => {
  try {
    const res = await api.get(`/download/${fileId}`);
    if (!res.error && res.data) {
      return {
        chunks: res.data.chunks,
        fileName: res.data.fileName,
        fileHash: res.data.fileHash,
      };
    } else {
      return res;
    }
  } catch (err) {
    // handle error
  }
};

export const chunkedDownload = async (fileId, numChunks) => {
  console.log("chunk");
  let download = { chunks: [] };
  for (let i = 1; i <= numChunks; i++) {
    let res = await api.get(`download-chunk/${fileId}/${i}`);
    if (!res.error && res.data) {
      download.chunks.push(res.data.chunk);
      if (i === numChunks) {
        download.fileName = res.data.filename;
        download.fileHash = res.data.fileHash;
      }
    }
  }
  console.log(download);
  return download;
  // in a loop for numChunks times
  // make api call
  // if successful put chunk in chunk array
  // if not successful (corrupted, timed out, other error) try again
};
