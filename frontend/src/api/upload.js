import api from "./axiosClient";

export const uploadFinalChunk = async (finalBody) => {
  try {
    // attempt to send final request with retries in case it arrives before the previous chunk
    for (let attempt = 0; attempt < 3; attempt++) {
      const delay = 1000 * Math.pow(3, attempt);
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      let res = await api.post(`/complete-upload`, finalBody);
      if (!res.error) {
        console.log("File posted successfully:", res.data);
        return true;
      } else {
        console.error("Could not upload final chunk: ", res);
        return false;
      }
    }
  } catch (err) {
    console.error("Could not upload final chunk: ", err);
    return false;
  }
};
