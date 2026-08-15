import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C } from "../theme.js";
import { fmtCompact } from "../lib/helpers.js";
import { shiftPeriod, cyclePeriodLabel } from "../lib/payCycle.js";

export function Card({ children, style, ...rest }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function LedgerStamp({ value }) {
  const positive = value >= 0;
  const color = positive ? C.sage : C.coral;
  const bg = positive ? C.sageSoft : C.coralSoft;
  return (
    <div style={{
      width: 132, height: 132, borderRadius: "50%", border: `2.5px solid ${color}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: bg, transform: "rotate(-4deg)", flexShrink: 0,
    }}>
      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, letterSpacing: 1.5, color, textTransform: "uppercase", fontWeight: 600 }}>
        {positive ? "Saldo +" : "Saldo -"}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, fontSize: 15, color: C.ink, marginTop: 4, textAlign: "center", padding: "0 8px" }}>
        {fmtCompact(Math.abs(value))}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'Inter',sans-serif" }}>
      <span style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, letterSpacing: 0.3 }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = {
  border: `1px solid ${C.line}`, borderRadius: 7, padding: "8px 10px", fontSize: 14,
  fontFamily: "'Inter',sans-serif", background: C.white, color: C.ink, outline: "none",
};

export function Btn({ children, onClick, variant = "primary", type = "button", style, disabled }) {
  const variants = {
    primary: { background: C.ink, color: C.white, border: `1px solid ${C.ink}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.line}` },
    danger: { background: "transparent", color: C.coral, border: `1px solid ${C.coralSoft}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...variants[variant], borderRadius: 7, padding: "8px 14px", fontSize: 13.5, fontWeight: 600,
      fontFamily: "'Inter',sans-serif", cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, ...style,
    }}>
      {children}
    </button>
  );
}

export function ProgressBar({ pct, color }) {
  const clamped = Math.min(pct, 100);
  return (
    <div style={{ height: 8, borderRadius: 5, background: C.paperAlt, overflow: "hidden" }}>
      <div style={{ width: `${clamped}%`, height: "100%", background: color, borderRadius: 5, transition: "width .3s" }} />
    </div>
  );
}

export function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div>
        {eyebrow && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.gold, fontWeight: 700, marginBottom: 2 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, color: C.ink, margin: 0, fontWeight: 600 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function PeriodPicker({ period, setPeriod }) {
  return (
    <input
      type="month"
      value={period}
      onChange={(e) => setPeriod(e.target.value)}
      style={{ ...inputStyle, fontFamily: "'IBM Plex Mono',monospace", fontSize: 13.5 }}
    />
  );
}

/** Navegador de ciclo de pago: ‹  26 Jul – 25 Ago 2026  › */
export function PeriodNav({ period, setPeriod, payDay }) {
  const label = cyclePeriodLabel(period, payDay);
  const btnStyle = {
    background: C.white, border: `1px solid ${C.line}`, borderRadius: 6, width: 28, height: 28,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.inkSoft,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button style={btnStyle} onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Ciclo anterior"><ChevronLeft size={15} /></button>
      <div style={{
        fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: C.ink,
        background: C.white, border: `1px solid ${C.line}`, borderRadius: 7, padding: "6px 12px", minWidth: 150, textAlign: "center",
      }}>
        {label}
      </div>
      <button style={btnStyle} onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Ciclo siguiente"><ChevronRight size={15} /></button>
    </div>
  );
}

export function Empty({ text }) {
  return <div style={{ padding: "30px 10px", textAlign: "center", color: C.inkFaint, fontSize: 13 }}>{text}</div>;
}
