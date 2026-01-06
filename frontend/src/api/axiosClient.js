import axios from "axios";
const BITDROP_SERVER = import.meta.env.VITE_BITDROP_SERVER;

const baseURL =
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : BITDROP_SERVER;

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

export default api;
