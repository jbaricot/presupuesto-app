/**
 * components/LegalModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Ventana con los Términos de uso y la Política de tratamiento de datos.
 * Los textos viven en lib/legal.js.
 * Props: doc ("terms" | "policy"), onClose()
 */
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { C } from "../theme.js";
import { LEGAL_DOCS } from "../lib/legal.js";

export default function LegalModal({ doc = "terms", onClose }) {
  const [current, setCurrent] = useState(doc);
  const d = LEGAL_DOCS[current];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={d.title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", justifyContent: "center", alignItems: "center", padding: 16, backdropFilter: "blur(2px)" }}>
      <div style={{ width: "100%", maxWidth: 640, maxHeight: "88vh", display: "flex", flexDirection: "column", background: C.card, borderRadius: 12, border: `1px solid ${C.line}`, fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.values(LEGAL_DOCS).map((x) => (
              <button key={x.id} type="button" onClick={() => setCurrent(x.id)} style={{
                padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                background: current === x.id ? C.ink : "transparent", color: current === x.id ? C.white : C.inkSoft,
              }}>{x.id === "terms" ? "Términos de uso" : "Política de datos"}</button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px 22px" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 600, color: C.ink, marginBottom: 12 }}>{d.title}</div>
          {d.sections.map((sec) => (
            <div key={sec.h} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{sec.h}</div>
              {(sec.p || []).map((t, i) => (
                <p key={i} style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.65, margin: "0 0 6px" }}>{t}</p>
              ))}
              {sec.b && (
                <ul style={{ margin: "0 0 6px", paddingLeft: 20 }}>
                  {sec.b.map((t, i) => (
                    <li key={i} style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.65, marginBottom: 3 }}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
