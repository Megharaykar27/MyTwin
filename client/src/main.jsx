import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400-italic.css";
import "./index.css";
import { MotionConfig } from "framer-motion";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: "easeOut" }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: 999, background: "#16141F", color: "#fff", fontSize: 14 } }} />
    </MotionConfig>
  </StrictMode>,
);
