import { StrictMode } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import Upload from "./pages/Upload/Upload.jsx";
import Download from "./pages/Download.jsx";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const rootElement = document.getElementById("root");

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route path="foo" element={<Upload />} />
          <Route path="bar" element={<Download />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
