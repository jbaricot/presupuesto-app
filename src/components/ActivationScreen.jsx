/**
 * components/ActivationScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla para quien tiene cuenta pero todavía no activó su acceso
 * (estado 'pending'). Pide el código del bono; si el usuario abrió el
 * enlace del bono en este mismo navegador, App.jsx ya lo intentó solo.
 */
import React, { useState } from "react";
import { Wallet, Gift, Loader2 } from "lucide-react";
import { C, FONTS } from "../theme.js";
import { activateTrial } from "../lib/data.js";
import { inputStyle, Btn } from "./ui.jsx";

export default function ActivationScreen({ onActivated, onSignOut }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const row = await activateTrial(code.trim());
      onActivated(row);
    } catch (err) {
      setError(err.message || "No se pudo activar el código.");
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif", padding: 16, boxSizing: "border-box" }}>
      <style>{FONTS}</style>
      <div style={{ width: "100%", maxWidth: 400, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 32, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color={C.white} />
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: C.ink }}>Mi Libro de Cuentas</div>
        </div>
        <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
          Tu cuenta está creada. Ingresa el código de tu bono para activar tu acceso de prueba.
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
            Código del bono
            <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej. BONO90" autoCapitalize="characters"
              style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
          </label>
          {error && <div style={{ fontSize: 12.5, color: C.coral }}>{error}</div>}
          <Btn type="submit" disabled={busy} style={{ justifyContent: "center" }}>
            {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Gift size={14} />}
            {busy ? "Activando…" : "Activar mi acceso"}
          </Btn>
          <Btn variant="ghost" onClick={onSignOut} disabled={busy} style={{ justifyContent: "center" }}>Cerrar sesión</Btn>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
