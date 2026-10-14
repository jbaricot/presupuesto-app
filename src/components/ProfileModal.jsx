/**
 * components/ProfileModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Menú "Mi perfil": datos de la cuenta, estado del acceso, cambiar
 * contraseña, descargar copia de los datos (JSON), ver textos legales,
 * cerrar sesión y ELIMINAR el perfil con todos sus datos.
 *
 * Props: email, accessInfo ({state, daysLeft}), access (fila user_access),
 *   exportData (objeto con los datos del usuario), onChangePassword(),
 *   onSignOut(), onDeleted(), onClose()
 */
import React, { useState, useEffect } from "react";
import { X, Key, Download, LogOut, FileText, Trash2, Loader2 } from "lucide-react";
import { C } from "../theme.js";
import { Btn, inputStyle } from "./ui.jsx";
import { deleteMyAccount } from "../lib/data.js";
import LegalModal from "./LegalModal.jsx";

export const CONFIRM_WORD = "ELIMINAR";

function accessText(info, access) {
  if (info.state === "active") return "Acceso activo";
  if (info.state === "trial") {
    const fecha = new Date(access.trial_ends_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    return `Acceso de prueba: vence el ${fecha} (${info.daysLeft} ${info.daysLeft === 1 ? "día" : "días"})`;
  }
  if (info.state === "expired") return "Acceso de prueba vencido (solo lectura)";
  return "Acceso pendiente de activación";
}

export default function ProfileModal({ email, accessInfo, access, exportData, onChangePassword, onSignOut, onDeleted, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [legalDoc, setLegalDoc] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy && !legalDoc) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, legalDoc, onClose]);

  const download = () => {
    const payload = { exportado_el: new Date().toISOString(), cuenta: email, ...exportData };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mis_datos_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deleteMyAccount();
      onDeleted();
    } catch (err) {
      setError("No se pudo eliminar tu perfil: " + (err.message || "error desconocido"));
      setBusy(false);
    }
  };

  const rowBtn = (icon, label, onClick, extra = {}) => (
    <button type="button" onClick={onClick} disabled={busy} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: `1px solid ${C.line}`,
      borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontWeight: 600, color: C.ink, cursor: "pointer", fontFamily: "'Inter',sans-serif", ...extra,
    }}>{icon}{label}</button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Mi perfil"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", padding: 16, backdropFilter: "blur(2px)" }}>
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, padding: 22, fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 600, color: C.ink }}>Mi perfil</div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 600, wordBreak: "break-all" }}>{email}</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 2, marginBottom: 16 }}>{accessText(accessInfo, access || {})}</div>

        {!confirming ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rowBtn(<Key size={15} />, "Cambiar contraseña", onChangePassword)}
            {rowBtn(<Download size={15} />, "Descargar copia de mis datos (JSON)", download)}
            {rowBtn(<FileText size={15} />, "Términos de uso", () => setLegalDoc("terms"))}
            {rowBtn(<FileText size={15} />, "Política de tratamiento de datos", () => setLegalDoc("policy"))}
            {rowBtn(<LogOut size={15} />, "Cerrar sesión", onSignOut)}
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 8, paddingTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.coral, letterSpacing: 0.4, marginBottom: 8 }}>ZONA DE PELIGRO</div>
              {rowBtn(<Trash2 size={15} />, "Eliminar mi perfil y todos mis datos", () => { setConfirming(true); setError(""); }, { color: C.coral, border: `1px solid ${C.coralSoft}` })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 700 }}>¿Eliminar tu perfil?</div>
            <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
              Se borrarán tu cuenta y <strong>todos tus datos</strong>: transacciones, categorías, presupuesto, metas e inversiones. Esta acción es inmediata e <strong>irreversible</strong>. Si quieres conservar algo, descarga antes una copia de tus datos.
            </div>
            <Btn variant="ghost" onClick={download} disabled={busy} style={{ justifyContent: "center" }}><Download size={14} /> Descargar copia primero</Btn>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
              Para confirmar escribe {CONFIRM_WORD}
              <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} autoComplete="off" placeholder={CONFIRM_WORD}
                style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
            </label>
            {error && <div style={{ fontSize: 12.5, color: C.coral }}>{error}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => { setConfirming(false); setTyped(""); setError(""); }} disabled={busy}>Cancelar</Btn>
              <Btn variant="danger" onClick={remove} disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}>
                {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                {busy ? "Eliminando…" : "Eliminar definitivamente"}
              </Btn>
            </div>
          </div>
        )}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
    </div>
  );
}
