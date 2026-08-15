import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { C, TX_TYPES, TX_TYPE_LABEL, PAYMENT_METHODS } from "../theme.js";
import { fmtCOP, fmtCompact, periodLabel } from "../lib/helpers.js";
import { Card, SectionTitle, PeriodPicker, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
import { addTransaction, updateTransaction, deleteTransaction } from "../lib/data.js";

function emptyTx(period) {
  return { period, date: "", name: "", type: "variable", category: "", payment_method: "Débito", value: "", paid: false };
}

export default function TransactionsTab({ userId, transactions, setTransactions, categories, period, setPeriod }) {
  const [form, setForm] = useState(emptyTx(period));
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState("todos");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(emptyTx(period)); setEditingId(null); }, [period]);

  const periodTx = useMemo(
    () => transactions.filter((t) => t.period === period && (filterType === "todos" || t.type === filterType)),
    [transactions, period, filterType]
  );

  const totals = useMemo(() => {
    const sum = (type) => transactions.filter((t) => t.period === period && t.type === type).reduce((a, t) => a + Number(t.value || 0), 0);
    return { ingreso: sum("ingreso"), fijo: sum("fijo"), variable: sum("variable"), credito: sum("credito"), provision: sum("provision") };
  }, [transactions, period]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    setSaving(true);
    try {
      const payload = { ...form, period, value: Number(form.value), date: form.date || null };
      if (editingId) {
        const updated = await updateTransaction(editingId, payload);
        setTransactions(transactions.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await addTransaction(userId, payload);
        setTransactions([created, ...transactions]);
      }
      setForm(emptyTx(period));
      setEditingId(null);
    } catch (err) {
      alert("Error guardando: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (t) => { setForm({ ...t, value: String(t.value) }); setEditingId(t.id); };
  const remove = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    await deleteTransaction(id);
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  return (
    <div>
      <SectionTitle eyebrow="Registro" title="Transacciones" right={<PeriodPicker period={period} setPeriod={setPeriod} />} />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR MOVIMIENTO" : "NUEVO MOVIMIENTO"}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Mercado D1" required />
            </Field>
            <Field label="Tipo">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            {form.type !== "ingreso" && (
              <Field label="Categoría">
                <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Seleccionar…</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Método de pago">
              <select style={inputStyle} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Fecha">
              <input type="date" style={inputStyle} value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Valor (COP)">
              <input type="number" min="0" style={inputStyle} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" required />
            </Field>
            {form.type === "fijo" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> ¿Pagado?
              </label>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {editingId ? "Guardar cambios" : "Agregar"}</Btn>
              {editingId && <Btn type="button" variant="ghost" onClick={() => { setForm(emptyTx(period)); setEditingId(null); }}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
            {TX_TYPES.map((t) => (
              <Card key={t.id} style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700, letterSpacing: 0.3 }}>{t.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: C.ink, marginTop: 3, fontWeight: 600 }}>{fmtCompact(totals[t.id])}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3 }}>{periodLabel(period).toUpperCase()}</div>
            <select style={{ ...inputStyle, fontSize: 12.5, padding: "5px 8px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <Card style={{ overflow: "hidden" }}>
            {periodTx.length === 0 ? <Empty text="No hay movimientos para este filtro." /> : (
              <div>
                {periodTx.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((t, i) => (
                  <div key={t.id} style={{
                    display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center",
                    padding: "10px 14px", borderTop: i === 0 ? "none" : `1px solid ${C.line}`, fontSize: 13,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.ink }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>{t.category || TX_TYPE_LABEL[t.type]} · {t.payment_method}{t.date ? " · " + t.date : ""}</div>
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
                      background: t.type === "ingreso" ? C.sageSoft : C.paperAlt, color: t.type === "ingreso" ? C.sage : C.inkSoft,
                    }}>{TX_TYPE_LABEL[t.type]}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: t.type === "ingreso" ? C.sage : C.ink, whiteSpace: "nowrap" }}>
                      {t.type === "ingreso" ? "+" : "-"}{fmtCOP(t.value)}
                    </span>
                    <button onClick={() => edit(t)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
