import React from "react";
import ReactDOM from "react-dom/client";
import { loadConfig } from "./config/api";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));

loadConfig()
  .catch(() => undefined)
  .finally(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
