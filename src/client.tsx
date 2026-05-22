import React from "react";
import { createRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

const root = document.getElementById("root");
if (!root) {
    throw new Error("Root element not found");
}

createRoot(root).render(
    <React.StrictMode>
        <StartClient />
    </React.StrictMode>,
);
