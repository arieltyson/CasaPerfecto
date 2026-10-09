import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

createRoot(root).render(
  <StrictMode>
    <main>
      <h1>CasaPerfecto</h1>
    </main>
  </StrictMode>,
);
