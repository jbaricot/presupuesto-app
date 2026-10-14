/**
 * components/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Acceso con correo + contraseña: iniciar sesión (signInWithPassword) o
 * crear cuenta (signUp). Crear cuenta NO da acceso a escribir datos por sí
 * sola: la cuenta nace 'pending' y se activa con el código del bono (ver
 * lib/access.js y supabase/migration_v5_acceso_y_rls.sql).
 * No recibe props: obtiene todo de supabaseClient.js directamente.
 */
import React, { useState } from "react";
import { Wallet, Lock, Loader2 } from "lucide-react";
import { C, FONTS } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { inputStyle, Btn } from "./ui.jsx";
import { getStoredBono } from "../lib/access.js";
import { TERMS_VERSION } from "../lib/legal.js";
import LegalModal from "./LegalModal.jsx";

export default function Login({ notice = "" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState(getStoredBono() ? "register" : "login"); // login | register
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | sending | error | confirm
  const [errorMsg, setErrorMsg] = useState("");
  const hasBono = Boolean(getStoredBono());

  const switchMode = (m) => { setMode(m); setStatus("idle"); setErrorMsg(""); setConfirm(""); setAccepted(false); };

  const submitRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 6) { setStatus("error"); setErrorMsg("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirm) { setStatus("error"); setErrorMsg("Las contraseñas no coinciden."); return; }
    if (!accepted) { setStatus("error"); setErrorMsg("Debes aceptar los Términos y la Política de datos para crear tu cuenta."); return; }
    setStatus("sending");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // terms_version viaja solo si marcó la casilla; el servidor guarda versión y fecha.
      options: { emailRedirectTo: window.location.origin, data: { terms_version: TERMS_VERSION } },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(/already registered/i.test(error.message) ? "Ese correo ya tiene cuenta. Inicia sesión." : error.message);
      return;
    }
    // Con confirmación de correo activada no hay sesión todavía.
    setStatus(data.session ? "idle" : "confirm");
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : error.message
      );
      return;
    }
    setStatus("idle");
  };

  const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", color: C.ink, textDecoration: "underline", fontSize: "inherit", fontFamily: "inherit" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif", padding: 16, boxSizing: "border-box" }}>
      <style>{FONTS}</style>
      <div style={{ width: "100%", maxWidth: 380, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 32, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color={C.white} />
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: C.ink }}>Mi Libro de Cuentas</div>
        </div>

        {notice && <div style={{ fontSize: 13, color: C.sage, fontWeight: 600, marginBottom: 14 }}>{notice}</div>}

        {status === "confirm" ? (
          <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6 }}>
            Te enviamos un correo a <strong style={{ color: C.ink }}>{email}</strong>. Ábrelo y confirma tu cuenta
            {hasBono ? " desde este mismo navegador para que tu bono se active solo." : "."} Luego vuelve aquí e inicia sesión.
            <div style={{ marginTop: 14 }}>
              <Btn variant="ghost" onClick={() => switchMode("login")} style={{ justifyContent: "center", width: "100%" }}>Ir a iniciar sesión</Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={mode === "login" ? submitPassword : submitRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "register" && hasBono && (
              <div style={{ fontSize: 12.5, color: C.sage, fontWeight: 600 }}>Tienes un bono listo: se activará al crear tu cuenta.</div>
            )}
            <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
              Correo electrónico
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
            </label>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
              Contraseña
              <input type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "login" ? "Tu contraseña" : "Mínimo 6 caracteres"}
                style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
            </label>
            {mode === "register" && (
              <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
                Confirmar contraseña
                <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña"
                  style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
              </label>
            )}
            {mode === "register" && (
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
                <span>
                  Acepto los{" "}
                  <button type="button" onClick={() => setLegalDoc("terms")} style={linkBtn}>Términos de uso</button>
                  {" "}y autorizo el tratamiento de mis datos según la{" "}
                  <button type="button" onClick={() => setLegalDoc("policy")} style={linkBtn}>Política de datos</button>.
                </span>
              </label>
            )}
            {status === "error" && <div style={{ fontSize: 12.5, color: C.coral }}>{errorMsg}</div>}
            <Btn type="submit" disabled={status === "sending"} style={{ justifyContent: "center" }}>
              {status === "sending" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={14} />}
              {status === "sending" ? (mode === "login" ? "Entrando…" : "Creando…") : (mode === "login" ? "Entrar" : "Crear cuenta")}
            </Btn>
            <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, color: C.inkSoft, fontFamily: "'Inter',sans-serif", textDecoration: "underline" }}>
              {mode === "login" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta: iniciar sesión"}
            </button>
          </form>
        )}
        {mode === "login" && status !== "confirm" && (
          <div style={{ marginTop: 16, fontSize: 11.5, color: C.inkFaint, textAlign: "center" }}>
            <button type="button" onClick={() => setLegalDoc("terms")} style={linkBtn}>Términos de uso</button>
            {" · "}
            <button type="button" onClick={() => setLegalDoc("policy")} style={linkBtn}>Política de datos</button>
          </div>
        )}
        {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
