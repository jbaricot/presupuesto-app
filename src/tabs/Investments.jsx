import React, { useState, useMemo } from "react";
import { Plus, X, Pencil, Trash2, PiggyBank, Building2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { C } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { currentPeriod, cyclePeriodLabelSmart, monthAbbrev, periodForTransaction } from "../lib/payCycle.js";
import { Card, SectionTitle, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
// Importamos addTransaction desde data.js
import { addInvestment, updateInvestment, deleteInvestment, addTransaction } from "../lib/data.js";

function emptyInv(period) { 
  return { 
    period, 
    date: "", 
    platform: "Nubank", 
    aporte: "", 
    retiros: "", 
    rendimientos: "", 
    costos: "",
    syncToTx: true // Nuevo: para controlar si se crea la transacción automática
  }; 
}

export default function InvestmentsTab({ userId, investments, setInvestments, payDay, incomeAnchors, transactions, setTransactions }) {
  const [form, setForm] = useState(emptyInv(currentPeriod(payDay)));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState("todos");

  const platformsList = useMemo(() => {
    const set = new Set(investments.map(i => i.platform || "General"));
    return Array.from(set);
  }, [investments]);

  const chartData = useMemo(() => {
    let acc = 0;
    const filtered = selectedPlatformFilter === "todos" 
      ? investments 
      : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);

    return filtered.slice().sort((a, b) => a.period.localeCompare(b.period)).map((i) => {
      const baseAporte = Number(i.aporte || i.reserva || 0);
      const netPeriod = baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
      acc += netPeriod;
      return { label: monthAbbrev(i.period), acumulado: acc };
    });
  }, [investments, selectedPlatformFilter]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.period || !form.platform) return;
    
    setSaving(true);
    try {
      const aporteVal = Number(form.aporte || 0);

      const payload = {
        period: form.period, 
        date: form.date || null,
        platform: form.platform.trim(),
        aporte: aporteVal, 
        retiros: Number(form.retiros || 0), 
        rendimientos: Number(form.rendimientos || 0), 
        costos: Number(form.costos || 0),
        reserva: aporteVal, 
        renta_fija: 0, 
        renta_variable: 0
      };
      
      if (editingId) {
        const updated = await updateInvestment(editingId, payload);
        setInvestments(investments.map((i) => (i.id === editingId ? updated : i)));
      } else {
        // 1. Guardar el registro de inversión
        const created = await addInvestment(userId, payload);
        setInvestments([...investments, created]);

        // 2. Si el usuario marcó la opción y hay un aporte mayor a 0, crear la transacción automática
        if (form.syncToTx && aporteVal > 0) {
          const derivedPeriod = form.date 
            ? periodForTransaction("provision", form.date, payDay, incomeAnchors) 
            : form.period;

          const txPayload = {
            user_id: userId,
            name: `Ahorro / Inv: ${form.platform.trim()}`,
            type: "provision",
            category: "Ahorro", // Puedes cambiar esta categoría por defecto si prefieres otra
            payment_method: "Transferencia",
            value: aporteVal,
            date: form.date || null,
            period: derivedPeriod,
            paid: true
          };

          const newTx = await addTransaction(userId, txPayload);
          setTransactions([newTx, ...transactions]);
        }
      }

      setForm(emptyInv(currentPeriod(payDay)));
      setEditingId(null);
    } catch (error) {
      alert("Error al registrar el movimiento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (i) => { 
    setForm({ 
      period: i.period,
      date: i.date || "",
      platform: i.platform || "General",
      aporte: String(i.aporte ?? i.reserva ?? ""), 
      retiros: String(i.retiros ?? ""), 
      rendimientos: String(i.rendimientos ?? ""), 
      costos: String(i.costos ?? ""),
      syncToTx: false // Al editar inversión no duplicamos transacciones automáticamente
    }); 
    setEditingId(i.id); 
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await deleteInvestment(id);
      setInvestments(investments.filter((i) => i.id !== id));
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  const totalAll = investments.reduce((a, i) => {
    const baseAporte = Number(i.aporte || i.reserva || 0);
    const net = baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
    return a + net;
  }, 0);

  const filteredInvestments = selectedPlatformFilter === "todos" 
    ? investments 
    : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);

  return (
    <div>
      <SectionTitle eyebrow="Reserva y crecimiento" title="Inversión y Ahorro" />
      <div className="mlc-grid-form-s">
        
        {/* Formulario */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR REGISTRO" : "NUEVO MOVIMIENTO DE AHORRO"}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Entidad / Plataforma (Ej. Nubank, Skandia)">
              <input 
                type="text" 
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} 
                value={form.platform} 
                onChange={(e) => setForm({ ...form, platform: e.target.value })} 
                placeholder="Ej. Nubank" 
                required 
                disabled={saving} 
              />
            </Field>

            <Field label="Período">
              <input type="month" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required disabled={saving} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Aporte (+)">
                <input type="number" min="0" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.aporte} onChange={(e) => setForm({ ...form, aporte: e.target.value })} placeholder="0" disabled={saving} />
              </Field>
              <Field label="Retiros (-)">
                <input type="number" min="0" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.retiros} onChange={(e) => setForm({ ...form, retiros: e.target.value })} placeholder="0" disabled={saving} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Rendimientos (+/-)">
                <input type="number" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.rendimientos} onChange={(e) => setForm({ ...form, rendimientos: e.target.value })} placeholder="0" disabled={saving} />
              </Field>
              <Field label="Costos / Comisiones (-)">
                <input type="number" min="0" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.costos} onChange={(e) => setForm({ ...form, costos: e.target.value })} placeholder="0" disabled={saving} />
              </Field>
            </div>

            <Field label="Fecha exacta">
              <input type="date" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={saving} />
            </Field>

            {/* Checkbox opcional para reflejar en transacciones */}
            {!editingId && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  checked={form.syncToTx} 
                  onChange={(e) => setForm({ ...form, syncToTx: e.target.checked })} 
                  disabled={saving} 
                /> 
                Registrar también como transacción de provisión
              </label>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingId ? "Guardar" : "Agregar")}</Btn>
              {editingId && <Btn variant="ghost" disabled={saving} onClick={() => { setForm(emptyInv(currentPeriod(payDay))); setEditingId(null); }}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        {/* Panel derecho */}
        <div>
          <Card style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkSoft, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
                <PiggyBank size={15} /> PATRIMONIO EN INVERSIONES
              </div>
              
              <select 
                style={{ ...inputStyle, fontSize: 11.5, padding: "3px 6px" }} 
                value={selectedPlatformFilter} 
                onChange={(e) => setSelectedPlatformFilter(e.target.value)}
              >
                <option value="todos">Todas las plataformas</option>
                {platformsList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 600, color: C.ink, marginTop: 4 }}>
              {fmtCOP(totalAll)}
            </div>

            {chartData.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} domain={['auto', 'auto']} />
                    <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="acumulado" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} name="Acumulado" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Listado de Registros */}
          <Card style={{ overflow: "hidden" }}>
            {filteredInvestments.length === 0 ? <Empty text="Sin registros para esta plataforma todavía." /> : (
              filteredInvestments.slice().sort((a, b) => b.period.localeCompare(a.period)).map((i, idx) => {
                const baseAporte = Number(i.aporte || i.reserva || 0);
                const netRow = baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
                return (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "10px 14px", borderTop: idx === 0 ? "none" : `1px solid ${C.line}`, fontSize: 13 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Building2 size={13} color={C.gold} />
                        <span style={{ fontWeight: 600, color: C.ink }}>{i.platform || "General"}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 2 }}>
                        {cyclePeriodLabelSmart(i.period, payDay, incomeAnchors)} 
                        {baseAporte ? ` • Aporte: ${fmtCompact(baseAporte)}` : ""} 
                        {Number(i.rendimientos) ? ` • Rend: ${fmtCompact(i.rendimientos)}` : ""}
                        {Number(i.retiros) ? ` • Retiros: ${fmtCompact(i.retiros)}` : ""}
                      </div>
                    </div>
                    
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: C.ink }}>
                      {fmtCOP(netRow)}
                    </span>

                    <button onClick={() => edit(i)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
                    <button onClick={() => remove(i.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={14} /></button>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}