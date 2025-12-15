import axios from "axios";

const baseURL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://api.b2.seiu.org";

const api = axios.create({
  baseURL: baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export default api;
