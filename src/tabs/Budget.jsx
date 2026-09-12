/**
 * @file tabs/Budget.jsx
 * @description Configuración de topes de gasto por rubro (gastos esenciales, 
 * gastos no esenciales, créditos, provisión), del día de pago, y de qué plataformas 
 * de inversión forman el fondo de emergencia.
 */

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { Card, SectionTitle, PeriodNav, Field, inputStyle, Btn, ProgressBar } from "../components/ui.jsx";
import { upsertBudget } from "../lib/data.js";

export default function BudgetTab({ 
  userId, 
  transactions = [], 
  investments = [],
  period = "", 
  setPeriod = () => {}, 
  payDay = 1, 
  incomeAnchors = [],
  budget,
  setBudget
}) {
  const [form, setForm] = useState({
    provision: budget?.provision ?? 0,
    gastos_esenciales: budget?.gastos_esenciales ?? 0,
    gastos_no_esenciales: budget?.gastos_no_esenciales ?? 0,
    creditos: budget?.creditos ?? 0,
    imprevistos: budget?.imprevistos ?? 0, // <-- NUEVO
    pay_day: budget?.pay_day ?? payDay ?? 1,
  });
  const [saving, setSaving] = useState(false);

  const availablePlatforms = Array.from(new Set(investments.map(i => i.platform).filter(Boolean)));
  const selectedPlatforms = form.emergency_fund_platforms
    ? form.emergency_fund_platforms.split(",").map(p => p.trim()).filter(Boolean)
    : [];

  const togglePlatform = (platform) => {
    const next = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter(p => p !== platform)
      : [...selectedPlatforms, platform];
    setForm({ ...form, emergency_fund_platforms: next.join(", ") });
  };

  useEffect(() => {
    if (budget) {
      setForm({
        provision: budget.provision ?? 0,
        gastos_esenciales: budget.gastos_esenciales ?? 0,
        creditos: budget.creditos ?? 0,
        gastos_no_esenciales: budget.gastos_no_esenciales ?? 0,
        pay_day: budget.pay_day ?? payDay ?? 1,
        emergency_fund_platforms: budget.emergency_fund_platforms ?? "",
      });
    }
  }, [budget, payDay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedBudget = await upsertBudget(userId, {
        provision: Number(form.provision || 0),
        gastos_esenciales: Number(form.gastos_esenciales || 0),
        creditos: Number(form.creditos || 0),
        imprevistos: Number(form.imprevistos || 0),
        gastos_no_esenciales: Number(form.gastos_no_esenciales || 0),
        pay_day: Number(form.pay_day || 1),
        emergency_fund_platforms: form.emergency_fund_platforms || null,
      });
      
      setBudget(updatedBudget); 
      alert("¡Presupuesto guardado con éxito!");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const activePeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const currentTx = transactions.filter(t => t.period === activePeriod);
  
  const spentEsenciales = currentTx.filter(t => t.type === "gastos_esenciales").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentNoEsenciales = currentTx.filter(t => t.type === "gastos_no_esenciales").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentCreditos = currentTx.filter(t => t.type === "credito").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentProvision = currentTx.filter(t => t.type === "provision").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentImprevistos = currentTx.filter(t => t.type === "imprevistos").reduce((a, b) => a + Number(b.value || 0), 0);

  const totalSpent = spentEsenciales + spentNoEsenciales + spentCreditos + spentProvision + spentImprevistos;
  const totalLimit = Number(form.gastos_esenciales || 0) + Number(form.gastos_no_esenciales || 0) + Number(form.creditos || 0) + Number(form.provision || 0) + Number(form.imprevistos || 0);
  const globalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  return (
    <div>
      <SectionTitle 
        eyebrow="Control y disciplina" 
        title="Presupuesto por Tipo de Gasto" 
        right={<PeriodNav period={activePeriod} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />} 
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>GASTO REAL</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, color: C.ink, marginTop: 4 }}>
            {fmtCOP(totalSpent)}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>LÍMITE TOTAL</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, color: C.sage, marginTop: 4 }}>
            {fmtCOP(totalLimit)}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700 }}>CONSUMO GLOBAL</div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, fontWeight: 600, color: globalPct > 100 ? C.coral : C.ink, marginTop: 4 }}>
            {globalPct.toFixed(1)}%
          </div>
        </Card>
      </div>

      <div className="mlc-grid-form-l" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
        
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 12 }}>CONFIGURAR TOPES Y DÍA DE PAGO</div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Día de pago (pay_day)">
              <input type="number" min="1" max="31" style={inputStyle} value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} required disabled={saving} />
            </Field>

            <Field label="Plataformas de tu fondo de emergencia">
              {availablePlatforms.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, background: C.paperAlt, borderRadius: 7, padding: "8px 10px" }}>
                  {availablePlatforms.map(p => (
                    <label key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
                      <input type="checkbox" checked={selectedPlatforms.includes(p)} onChange={() => togglePlatform(p)} disabled={saving} />
                      {p}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  style={inputStyle}
                  value={form.emergency_fund_platforms}
                  onChange={e => setForm({ ...form, emergency_fund_platforms: e.target.value })}
                  placeholder="Ej. Skandia, Colfondos (aún no tienes plataformas en Inversión)"
                  disabled={saving}
                />
              )}
            </Field>
            <div style={{ fontSize: 11, color: C.inkFaint, marginTop: -4 }}>
              El Panorama sumará el saldo neto de estas plataformas para "Meses de reserva cubiertos". Puedes marcar una o varias.
            </div>

            <Field label="Gastos Esenciales">
              <input type="number" min="0" style={inputStyle} value={form.gastos_esenciales} onChange={e => setForm({...form, gastos_esenciales: e.target.value})} disabled={saving} />
            </Field>
            <Field label="Gastos No Esenciales">
              <input type="number" min="0" style={inputStyle} value={form.gastos_no_esenciales} onChange={e => setForm({...form, gastos_no_esenciales: e.target.value})} disabled={saving} />
            </Field>
            <Field label="Créditos y Deudas">
              <input type="number" min="0" style={inputStyle} value={form.creditos} onChange={e => setForm({...form, creditos: e.target.value})} disabled={saving} />
            </Field>
            <Field label="Provisiones y Ahorros">
              <input type="number" min="0" style={inputStyle} value={form.provision} onChange={e => setForm({...form, provision: e.target.value})} disabled={saving} />
            </Field>
            <div style={{ marginTop: 8 }}>
              <Btn type="submit" disabled={saving}><Check size={14} /> {saving ? "Guardando..." : "Guardar presupuesto"}</Btn>
            </div>
          </form>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 12 }}>MONITOREO EN TIEMPO REAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Gastos Esenciales", spent: spentEsenciales, limit: Number(form.gastos_esenciales || 0) },
              { label: "Gastos No Esenciales", spent: spentNoEsenciales, limit: Number(form.gastos_no_esenciales || 0) },
              { label: "Créditos y Deudas", spent: spentCreditos, limit: Number(form.creditos || 0) },
              { label: "Provisiones y Ahorros", spent: spentProvision, limit: Number(form.provision || 0) },
            ].map(item => {
              const pct = item.limit > 0 ? (item.spent / item.limit) * 100 : 0;
              const barColor = pct >= 100 ? C.coral : pct >= 80 ? C.gold : C.sage;

              return (
                <div key={item.label} style={{ background: C.paperAlt, padding: 12, borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: C.ink }}>{item.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: C.inkSoft }}>
                      {fmtCOP(item.spent)} / {fmtCOP(item.limit)}
                    </span>
                  </div>
                  <ProgressBar pct={Math.min(pct, 100)} color={barColor} />
                </div>
              );
            })}
          </div>
        </Card>

      </div>
    </div>
  );
}