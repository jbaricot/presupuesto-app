import React, { useState } from "react";
import { Wallet, Mail, Loader2 } from "lucide-react";
import { C, FONTS } from "../theme.js";
import { supabase } from "../supabaseClient.js";
import { inputStyle, Btn } from "./ui.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif" }}>
      <style>{FONTS}</style>
      <div style={{ width: 380, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color={C.white} />
          </div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: C.ink }}>Mi Libro de Cuentas</div>
        </div>

        {status === "sent" ? (
          <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6 }}>
            <Mail size={22} color={C.sage} style={{ marginBottom: 10 }} />
            <br />
            Te enviamos un enlace de acceso a <strong style={{ color: C.ink }}>{email}</strong>. Ábrelo desde este mismo dispositivo o navegador para entrar.
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
              Correo electrónico
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                style={{ ...inputStyle, width: "100%", marginTop: 6, boxSizing: "border-box" }}
              />
            </label>
            {status === "error" && <div style={{ fontSize: 12.5, color: C.coral }}>{errorMsg}</div>}
            <Btn type="submit" disabled={status === "sending"} style={{ justifyContent: "center" }}>
              {status === "sending" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Mail size={14} />}
              {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
            </Btn>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </form>
        )}
      </div>
    </div>
  );
}
