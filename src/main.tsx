import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "virtual:tokens.css";
import "./design/global.css";
import "./design/components.css";
import "./app/layout.css";
import { App } from "./app/App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
