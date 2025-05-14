import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n"; // Import i18n configuration
import { ThemeProvider } from "./lib/ThemeContext";
import { BrowserRouter } from "react-router-dom";

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
