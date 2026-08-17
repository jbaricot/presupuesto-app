/**
 * @file BudgetTab.jsx
 * @description Módulo de control de presupuesto por tipo de gasto.
 */

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { Card, SectionTitle, PeriodNav, Field, inputStyle, Btn, ProgressBar } from "../components/ui.jsx";
import { fetchBudget, upsertBudget } from "../lib/data.js";

export default function BudgetTab({ 
  userId, 
  transactions = [], 
  period = "", 
  setPeriod = () => {}, 
  payDay = 1, 
  incomeAnchors = [] 
}) {
  const [form, setForm] = useState({
    provision: 0,
    fijos: 0,
    creditos: 0,
    variables: 0,
    pay_day: payDay || 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar presupuesto desde Supabase de forma segura
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!userId) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const data = await fetchBudget(userId);
        if (data && isMounted) {
          setForm({
            provision: data.provision ?? 0,
            fijos: data.fijos ?? 0,
            creditos: data.creditos ?? 0,
            variables: data.variables ?? 0,
            pay_day: data.pay_day ?? payDay ?? 1
          });
        }
      } catch (e) {
        console.error("Error al cargar presupuesto:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [userId, payDay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await upsertBudget(userId, {
        provision: Number(form.provision || 0),
        fijos: Number(form.fijos || 0),
        creditos: Number(form.creditos || 0),
        variables: Number(form.variables || 0),
        pay_day: Number(form.pay_day || 1)
      });
      alert("¡Presupuesto guardado con éxito!");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Período de respaldo seguro si la app aún lo está cargando
  const activePeriod = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  // Filtrar y sumar transacciones reales del período activo por tipo
  const currentTx = transactions.filter(t => t.period === activePeriod);
  
  const spentFijos = currentTx.filter(t => t.type === "fijo").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentVariables = currentTx.filter(t => t.type === "variable").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentCreditos = currentTx.filter(t => t.type === "credito").reduce((a, b) => a + Number(b.value || 0), 0);
  const spentProvision = currentTx.filter(t => t.type === "provision").reduce((a, b) => a + Number(b.value || 0), 0);

  const totalSpent = spentFijos + spentVariables + spentCreditos + spentProvision;
  const totalLimit = Number(form.fijos || 0) + Number(form.variables || 0) + Number(form.creditos || 0) + Number(form.provision || 0);
  const globalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

  if (loading) {
    return <div style={{ padding: 24, color: C.inkSoft }}>Cargando módulo de presupuesto...</div>;
  }

  return (
    <div>
      <SectionTitle 
        eyebrow="Control y disciplina" 
        title="Presupuesto por Tipo de Gasto" 
        right={<PeriodNav period={activePeriod} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />} 
      />

      {/* Tarjetas Resumen */}
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
        
        {/* Formulario de Configuración */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 12 }}>CONFIGURAR TOPES Y DÍA DE PAGO</div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Día de pago (pay_day)">
              <input type="number" min="1" max="31" style={inputStyle} value={form.pay_day} onChange={e => setForm({...form, pay_day: e.target.value})} required disabled={saving} />
            </Field>
            <Field label="Gastos Fijos">
              <input type="number" min="0" style={inputStyle} value={form.fijos} onChange={e => setForm({...form, fijos: e.target.value})} disabled={saving} />
            </Field>
            <Field label="Gastos Variables">
              <input type="number" min="0" style={inputStyle} value={form.variables} onChange={e => setForm({...form, variables: e.target.value})} disabled={saving} />
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

        {/* Monitoreo Visual */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 12 }}>MONITOREO EN TIEMPO REAL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Gastos Fijos", spent: spentFijos, limit: Number(form.fijos || 0) },
              { label: "Gastos Variables", spent: spentVariables, limit: Number(form.variables || 0) },
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