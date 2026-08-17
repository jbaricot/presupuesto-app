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
    pay_day: String(budget.pay_day || 1),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      provision: String(budget.provision || ""), fijos: String(budget.fijos || ""),
      creditos: String(budget.creditos || ""), variables: String(budget.variables || ""),
      pay_day: String(budget.pay_day || 1),
    });
  }, [budget]);

  const total = ["provision", "fijos", "creditos", "variables"].reduce((a, k) => a + Number(form[k] || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        provision: Number(form.provision || 0), fijos: Number(form.fijos || 0),
        creditos: Number(form.creditos || 0), variables: Number(form.variables || 0),
        pay_day: Math.min(Math.max(Number(form.pay_day || 1), 1), 28),
      };
      const saved = await upsertBudget(userId, payload);
      setBudget(saved);
    } catch (error) {
      alert("Error al actualizar el presupuesto: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const ROWS = [
    { key: "provision", label: "Provisión/Ahorrros" },
    { key: "fijos", label: "Gastos fijos" },
    { key: "creditos", label: "Créditos" },
    { key: "variables", label: "Gastos variables" },
  ];

  return (
    <div>
      <SectionTitle eyebrow="Metas mensuales" title="Presupuesto" />
      <Card style={{ padding: 22, maxWidth: 480, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>
          El día en que recibes tu ingreso principal. Con esto, tus períodos dejan de ser meses calendario y pasan a ser ciclos de pago — por ejemplo, si te pagan el 26, cada ciclo va del 26 de un mes al 25 del siguiente, agrupando así los últimos días del mes con el mes que ese pago financia.
          <br /><br />
          <strong style={{ color: C.inkSoft }}>Este día es solo de referencia.</strong> Si un mes te pagan otro día (por un fin de semana, festivo o adelanto), la app ajusta el ciclo solo con que registres el ingreso con su fecha real — no necesitas cambiar esta configuración cada vez.
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Día de pago del mes (1 - 28)">
            <input type="number" min="1" max="28" style={inputStyle} value={form.pay_day} onChange={(e) => setForm({ ...form, pay_day: e.target.value })} disabled={saving} />
          </Field>
          <Btn type="submit" disabled={saving}><Check size={14} /> {saving ? "Guardando..." : "Guardar día de pago"}</Btn>
        </form>
      </Card>
      <Card style={{ padding: 22, maxWidth: 480 }}>
        <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 16 }}>
          Define cuánto planeas destinar cada ciclo a cada rubro. El panorama comparará tus gastos reales contra estos límites.
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROWS.map((r) => (
            <Field key={r.key} label={r.label}>
              <input type="number" min="0" style={inputStyle} value={form[r.key]} onChange={(e) => setForm({ ...form, [r.key]: e.target.value })} placeholder="0" disabled={saving} />
            </Field>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${C.line}`, marginTop: 4 }}>
            <span style={{ fontWeight: 700, color: C.ink, fontSize: 13.5 }}>Total mensual</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 700, color: C.ink, fontSize: 15 }}>{fmtCOP(total)}</span>
          </div>
          <Btn type="submit" disabled={saving}><Check size={14} /> {saving ? "Guardando..." : "Guardar presupuesto"}</Btn>
        </form>
      </Card>
    </div>
  );
}