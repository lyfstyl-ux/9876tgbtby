import { Buffer } from "buffer";
import process from "process";

// Ensure globals are available early
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).process = process;
  (window as any).global = window;
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Providers } from "./components/Providers";

createRoot(document.getElementById("root")!).render(
  <Providers>
    <App />
  </Providers>
);
