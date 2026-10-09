import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "virtual:tokens.css";
import "./design/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

createRoot(root).render(
  <StrictMode>
    <main>
      <h1>CasaPerfecto</h1>
    </main>
  </StrictMode>,
);
