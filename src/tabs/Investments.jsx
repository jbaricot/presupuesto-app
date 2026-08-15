import React, { useState, useMemo } from "react";
import { Plus, X, Pencil, Trash2, PiggyBank } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { C } from "../theme.js";
import { fmtCOP, fmtCompact, periodLabel, currentPeriod } from "../lib/helpers.js";
import { Card, SectionTitle, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
import { addInvestment, updateInvestment, deleteInvestment } from "../lib/data.js";

function emptyInv(period) { return { period, date: "", reserva: "", renta_fija: "", renta_variable: "" }; }

export default function InvestmentsTab({ userId, investments, setInvestments }) {
  const [form, setForm] = useState(emptyInv(currentPeriod()));
  const [editingId, setEditingId] = useState(null);

  const chartData = useMemo(() => {
    let acc = 0;
    return investments.slice().sort((a, b) => a.period.localeCompare(b.period)).map((i) => {
      const total = Number(i.reserva || 0) + Number(i.renta_fija || 0) + Number(i.renta_variable || 0);
      acc += total;
      return { label: periodLabel(i.period).slice(0, 3) + " " + i.period.slice(2, 4), acumulado: acc };
    });
  }, [investments]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.period) return;
    const payload = {
      period: form.period, date: form.date || null,
      reserva: Number(form.reserva || 0), renta_fija: Number(form.renta_fija || 0), renta_variable: Number(form.renta_variable || 0),
    };
    if (editingId) {
      const updated = await updateInvestment(editingId, payload);
      setInvestments(investments.map((i) => (i.id === editingId ? updated : i)));
    } else {
      const created = await addInvestment(userId, payload);
      setInvestments([...investments, created]);
    }
    setForm(emptyInv(currentPeriod()));
    setEditingId(null);
  };

  const edit = (i) => { setForm({ ...i, reserva: String(i.reserva), renta_fija: String(i.renta_fija), renta_variable: String(i.renta_variable) }); setEditingId(i.id); };
  const remove = async (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await deleteInvestment(id);
    setInvestments(investments.filter((i) => i.id !== id));
  };

  const totalAll = investments.reduce((a, i) => a + Number(i.reserva || 0) + Number(i.renta_fija || 0) + Number(i.renta_variable || 0), 0);

  return (
    <div>
      <SectionTitle eyebrow="Reserva y crecimiento" title="Inversión" />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR REGISTRO" : "NUEVO REGISTRO"}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Período"><input type="month" style={inputStyle} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></Field>
            <Field label="Reserva de oxígeno"><input type="number" min="0" style={inputStyle} value={form.reserva} onChange={(e) => setForm({ ...form, reserva: e.target.value })} /></Field>
            <Field label="Renta fija"><input type="number" min="0" style={inputStyle} value={form.renta_fija} onChange={(e) => setForm({ ...form, renta_fija: e.target.value })} /></Field>
            <Field label="Renta variable"><input type="number" min="0" style={inputStyle} value={form.renta_variable} onChange={(e) => setForm({ ...form, renta_variable: e.target.value })} /></Field>
            <Field label="Fecha"><input type="date" style={inputStyle} value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn type="submit"><Plus size={14} /> {editingId ? "Guardar" : "Agregar"}</Btn>
              {editingId && <Btn variant="ghost" onClick={() => { setForm(emptyInv(currentPeriod())); setEditingId(null); }}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        <div>
          <Card style={{ padding: 18, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkSoft, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
              <PiggyBank size={15} /> TOTAL INVERTIDO ACUMULADO
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 600, color: C.ink, marginTop: 6 }}>{fmtCOP(totalAll)}</div>
            {chartData.length > 1 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="acumulado" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} name="Acumulado" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card style={{ overflow: "hidden" }}>
            {investments.length === 0 ? <Empty text="Sin registros todavía." /> : investments.slice().sort((a, b) => b.period.localeCompare(a.period)).map((i, idx) => (
              <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", gap: 12, alignItems: "center", padding: "10px 14px", borderTop: idx === 0 ? "none" : `1px solid ${C.line}`, fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: C.ink }}>{periodLabel(i.period)}</div>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: C.inkSoft }}>Reserva {fmtCompact(i.reserva)}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: C.inkSoft }}>R.Fija {fmtCompact(i.renta_fija)}</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: C.inkSoft }}>R.Var {fmtCompact(i.renta_variable)}</span>
                <button onClick={() => edit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
                <button onClick={() => remove(i.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={14} /></button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
