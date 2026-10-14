/**
 * components/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de acceso con correo + contraseña (signInWithPassword).
 * No crea cuentas: el usuario se crea desde Supabase (Authentication →
 * Users) y los registros públicos deben quedar deshabilitados.
 * No recibe props: obtiene todo de supabaseClient.js directamente.
 */
import React, { useState } from "react";
import { Wallet, Lock, Loader2 } from "lucide-react";
import { C, FONTS } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { inputStyle, Btn } from "./ui.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [errorMsg, setErrorMsg] = useState("");

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

        <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
            Correo electrónico
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
              style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
          </label>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
            Contraseña
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña"
              style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }} />
          </label>
          {status === "error" && <div style={{ fontSize: 12.5, color: C.coral }}>{errorMsg}</div>}
          <Btn type="submit" disabled={status === "sending"} style={{ justifyContent: "center" }}>
            {status === "sending" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={14} />}
            {status === "sending" ? "Entrando…" : "Entrar"}
          </Btn>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
