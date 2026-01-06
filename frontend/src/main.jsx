import { StrictMode } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "@mui/material";
import { customTheme } from "../src/branding/theme.js";
import Upload from "./pages/Upload/Upload.jsx";
import Download from "./pages/Download.jsx";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={customTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Upload />} />
            <Route path="verify" element={<Download />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
