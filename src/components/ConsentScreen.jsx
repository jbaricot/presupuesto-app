/**
 * components/ConsentScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Se muestra a quien todavía no aceptó la versión vigente de los Términos y
 * la Política de datos (usuarios anteriores a esta función, o cuando cambia
 * TERMS_VERSION). Mientras no acepte, la app no carga sus datos.
 * Props: onAccepted(row), onSignOut()
 */
import React, { useState } from "react";
import { Wallet, Check, Loader2 } from "lucide-react";
import { C, FONTS } from "../theme.js";
import { TERMS_VERSION } from "../lib/legal.js";
import { acceptTerms } from "../lib/data.js";
import { Btn } from "./ui.jsx";
import LegalModal from "./LegalModal.jsx";

export default function ConsentScreen({ onAccepted, onSignOut }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [legalDoc, setLegalDoc] = useState(null);

  const link = (doc, text) => (
    <button type="button" onClick={() => setLegalDoc(doc)}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.ink, textDecoration: "underline", fontSize: "inherit", fontFamily: "inherit" }}>{text}</button>
  );

  const accept = async () => {
    setBusy(true);
    setError("");
    try {
      onAccepted(await acceptTerms(TERMS_VERSION));
    } catch (err) {
      setError(err.message || "No se pudo registrar tu aceptación.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif", padding: 16, boxSizing: "border-box" }}>
      <style>{FONTS}</style>
      <div style={{ width: "100%", maxWidth: 420, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 32, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color={C.white} />
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: C.ink }}>Antes de continuar</div>
        </div>
        <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
          Actualizamos nuestros {link("terms", "Términos de uso")} y la {link("policy", "Política de tratamiento de datos")}. Para seguir usando la app necesitamos que los leas y los aceptes.
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: C.inkSoft, lineHeight: 1.5, cursor: "pointer", marginBottom: 14 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
          <span>He leído y acepto los Términos de uso y autorizo el tratamiento de mis datos personales según la Política de tratamiento de datos.</span>
        </label>
        {error && <div style={{ fontSize: 12.5, color: C.coral, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={accept} disabled={!checked || busy} style={{ justifyContent: "center" }}>
            {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {busy ? "Guardando…" : "Aceptar y continuar"}
          </Btn>
          <Btn variant="ghost" onClick={onSignOut} disabled={busy} style={{ justifyContent: "center" }}>No acepto, cerrar sesión</Btn>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
}
