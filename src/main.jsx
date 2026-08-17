/**
 * main.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Punto de entrada de Vite/React: monta <App/> en el <div id="root"> de
 * index.html. No hay nada más que configurar aquí.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
