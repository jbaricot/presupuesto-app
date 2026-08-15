import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { Card, SectionTitle, Field, inputStyle, Btn } from "../components/ui.jsx";
import { upsertBudget } from "../lib/data.js";

export default function BudgetTab({ userId, budget, setBudget }) {
  const [form, setForm] = useState({
    provision: String(budget.provision || ""), fijos: String(budget.fijos || ""),
    creditos: String(budget.creditos || ""), variables: String(budget.variables || ""),
  });

  useEffect(() => {
    setForm({ provision: String(budget.provision || ""), fijos: String(budget.fijos || ""), creditos: String(budget.creditos || ""), variables: String(budget.variables || "") });
  }, [budget]);

  const total = ["provision", "fijos", "creditos", "variables"].reduce((a, k) => a + Number(form[k] || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const payload = { provision: Number(form.provision || 0), fijos: Number(form.fijos || 0), creditos: Number(form.creditos || 0), variables: Number(form.variables || 0) };
    const saved = await upsertBudget(userId, payload);
    setBudget(saved);
  };

  const ROWS = [
    { key: "provision", label: "Provisión" },
    { key: "fijos", label: "Gastos fijos" },
    { key: "creditos", label: "Créditos" },
    { key: "variables", label: "Gastos variables" },
  ];

  return (
    <div>
      <SectionTitle eyebrow="Metas mensuales" title="Presupuesto" />
      <Card style={{ padding: 22, maxWidth: 480 }}>
        <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>
          Define cuánto planeas destinar cada mes a cada rubro. El panorama comparará tus gastos reales contra estos límites.
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROWS.map((r) => (
            <Field key={r.key} label={r.label}>
              <input type="number" min="0" style={inputStyle} value={form[r.key]} onChange={(e) => setForm({ ...form, [r.key]: e.target.value })} placeholder="0" />
            </Field>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
            <span style={{ fontWeight: 700, color: C.ink, fontSize: 13.5 }}>Total mensual</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: C.ink, fontSize: 15 }}>{fmtCOP(total)}</span>
          </div>
          <Btn type="submit"><Check size={14} /> Guardar presupuesto</Btn>
        </form>
      </Card>
    </div>
  );
}
