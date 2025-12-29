import api from "./axiosClient";
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export const verifyHumanity = async () => {
  try {
    const recaptchaToken = await grecaptcha.execute(RECAPTCHA_SITE_KEY, {
      action: "upload",
    });
    const res = await api.post(`/authentication`, {
      recaptchaToken: recaptchaToken,
    });
    return res;
  } catch (err) {
    console.error("Authentication failed, ", err);
    return false;
  }
};

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
