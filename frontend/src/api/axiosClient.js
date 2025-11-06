import axios from "axios";

const baseURL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "api.b2.seiu.org";

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  // httpsAgent: new https.Agent({
  //   rejectUnauthorized: false,
  // }),
});

export default api;
