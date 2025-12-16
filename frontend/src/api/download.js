import api from "./axiosClient";

export const clumpDownload = async (fileId) => {
  try {
    const res = await api.get(`/download/${fileId}`);
    if (!res.error && res.data) {
      return {
        chunks: res.data.chunks,
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
  try {
    let chunks = [];
    for (let i = 1; i <= numChunks; i++) {
      let res = await api.get(`download-chunk/${fileId}/${i}`);
      console.log(res);
      // if (!res.error) {
      //   console.log(res);
      // }
    }
    // in a loop for numChunks times
    // make api call
    // if successful put chunk in chunk array
    // if not successful (corrupted, timed out, other error) try again
  } catch (err) {
    // handle error
  }
};
