/**
 * components/TrialBanner.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Aviso único del acceso de prueba (se muestra en toda la app, desde App.jsx).
 *   · prueba con más de 14 días  → línea discreta con los días restantes
 *   · 14 días o menos            → ámbar; 3 días o menos → rojo
 *   · vencida                    → solo lectura + cómo renovar
 * Props: accessInfo ({ state, daysLeft }) de describeAccess()
 */
import React from "react";
import { Info, Clock, AlertTriangle } from "lucide-react";
import { C } from "../theme.js";
import { LEGAL } from "../lib/legal.js";

export default function TrialBanner({ accessInfo }) {
  if (!accessInfo || (accessInfo.state !== "trial" && accessInfo.state !== "expired")) return null;

  let tone, Icon, title, text;

  if (accessInfo.state === "expired") {
    tone = { bg: C.coralSoft, border: C.coral, fg: C.ink };
    Icon = AlertTriangle;
    title = "Prueba finalizada";
    text = (
      <>
        Tu cuenta está en <strong>solo lectura</strong>: puedes ver y exportar tus datos, pero no registrar cambios. Para renovar tu acceso escríbenos a{" "}
        <a href={`mailto:${LEGAL.correo}`} style={{ color: C.ink, fontWeight: 600 }}>{LEGAL.correo}</a>.
      </>
    );
  } else {
    const d = accessInfo.daysLeft;
    const label = `${d} ${d === 1 ? "día" : "días"}`;
    if (d <= 3) { tone = { bg: C.coralSoft, border: C.coral, fg: C.ink }; Icon = AlertTriangle; title = "¡Tu acceso de prueba está por terminar!"; }
    else if (d <= 14) { tone = { bg: C.goldSoft, border: C.gold, fg: C.ink }; Icon = Clock; title = "Tu acceso de prueba vence pronto"; }
    else { tone = { bg: C.card, border: C.line, fg: C.inkSoft }; Icon = Info; title = null; }
    text = title
      ? <>Te quedan <strong>{label}</strong> de acceso completo. Al vencer, tu cuenta pasará a modo de solo lectura.</>
      : <>Acceso de prueba: te quedan <strong>{label}</strong>.</>;
  }

  return (
    <div role="status" style={{
      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, padding: title ? "12px 14px" : "8px 14px",
      borderRadius: 8, border: `1px solid ${tone.border}`, background: tone.bg, color: tone.fg, fontSize: 13, lineHeight: 1.5,
    }}>
      <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>}
        <div>{text}</div>
      </div>
    </div>
  );
}
