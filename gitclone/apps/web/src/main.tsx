import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { QueryProvider } from "./providers/QueryProvider.js";
import { ThemeProvider } from "./providers/ThemeProvider.js";
import { AuthProvider } from "./providers/AuthProvider.js";
import { RealtimeProvider } from "./providers/RealtimeProvider.js";
import { AppRouter } from "./router/AppRouter.js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RealtimeProvider>
            <AppRouter />
          </RealtimeProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
