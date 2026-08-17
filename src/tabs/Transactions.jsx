import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Pencil, Trash2, Upload, Download } from "lucide-react";
import { C, TX_TYPES, TX_TYPE_LABEL, PAYMENT_METHODS } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { periodForTransaction, cyclePeriodLabelSmart } from "../lib/payCycle.js";
import { Card, SectionTitle, PeriodNav, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
import { addTransaction, updateTransaction, deleteTransaction, addContribution, addInvestment } from "../lib/data.js";
import ImportModal from "../components/ImportModal.jsx";

const SORT_OPTIONS = [
  { id: "date_desc", label: "Fecha (más reciente)" },
  { id: "date_asc", label: "Fecha (más antigua)" },
  { id: "value_desc", label: "Valor (mayor primero)" },
  { id: "value_asc", label: "Valor (menor primero)" },
  { id: "name_asc", label: "Nombre (A-Z)" },
];

function sortTx(list, sortBy) {
  const sorted = list.slice();
  switch (sortBy) {
    case "date_asc": return sorted.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    case "value_desc": return sorted.sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    case "value_asc": return sorted.sort((a, b) => Number(a.value || 0) - Number(b.value || 0));
    case "name_asc": return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "date_desc":
    default: return sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }
}

function emptyTx(period) {
  return { period, date: "", name: "", type: "variable", category: "", payment_method: "Débito", value: "", paid: false, allocation: "none", platform: "" };
}

export default function TransactionsTab({
  userId, transactions, setTransactions, categories, period, setPeriod, payDay, incomeAnchors,
  goals, contributions, setContributions, investments, setInvestments
}) {
  const [form, setForm] = useState(emptyTx(period));
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState("todos");
  const [filterCategory, setFilterCategory] = useState("todos");
  const [sortBy, setSortBy] = useState("date_desc");
  const [saving, setSaving] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => { setForm(emptyTx(period)); setEditingId(null); }, [period]);

  const periodTx = useMemo(() => {
    const filtered = transactions.filter((t) => {
      const matchPeriod = t.period === period;
      const matchType = filterType === "todos" || t.type === filterType;
      const matchCategory = filterCategory === "todos" || t.category === filterCategory;
      return matchPeriod && matchType && matchCategory;
    });
    return sortTx(filtered, sortBy);
  }, [transactions, period, filterType, filterCategory, sortBy]);

  const totals = useMemo(() => {
    const sum = (type) => transactions.filter((t) => t.period === period && t.type === type).reduce((a, t) => a + Number(t.value || 0), 0);
    return { ingreso: sum("ingreso"), fijo: sum("fijo"), variable: sum("variable"), credito: sum("credito"), provision: sum("provision") };
  }, [transactions, period]);

  const exportToCSV = () => {
    if (periodTx.length === 0) {
      alert("No hay movimientos en este período para exportar.");
      return;
    }

    const headers = ["Fecha", "Nombre", "Tipo", "Categoría", "Método de Pago", "Valor", "Pagado"];
    const rows = periodTx.map(t => [
      t.date || "",
      `"${(t.name || "").replace(/"/g, '""')}"`,
      t.type,
      `"${(t.category || "").replace(/"/g, '""')}"`,
      t.payment_method || "",
      t.value,
      t.paid ? "Sí" : "No"
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `transacciones_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.value) return;

    setSaving(true);
    try {
      const derivedPeriod = form.date ? periodForTransaction(form.type, form.date, payDay, incomeAnchors) : period;

      const payload = { ...form, period: derivedPeriod, value: Number(form.value), date: form.date || null };
      delete payload.allocation;
      delete payload.platform;

      if (editingId) {
        const updated = await updateTransaction(editingId, payload);
        setTransactions(transactions.map((t) => (t.id === editingId ? updated : t)));
      } else {
        const created = await addTransaction(userId, payload);
        setTransactions([created, ...transactions]);

        if (form.type === "provision") {
          const val = Number(form.value);

          if (form.allocation && form.allocation.startsWith("goal_")) {
            const goalId = form.allocation.replace("goal_", "");
            const newContrib = await addContribution(userId, { goalId, period: derivedPeriod, value: val, transactionId: created.id });
            setContributions([...contributions, newContrib]);
          }
          else if (form.allocation && form.allocation.startsWith("inv_")) {
            const invType = form.allocation.replace("inv_", "");
            const newInv = await addInvestment(userId, {
              period: derivedPeriod,
              date: form.date || null,
              reserva: invType === "reserva" ? val : 0,
              renta_fija: invType === "renta_fija" ? val : 0,
              renta_variable: invType === "renta_variable" ? val : 0
            });
            setInvestments([...investments, newInv]);
          }

          if (form.platform && form.platform.trim() !== "") {
            const newInvPlatform = await addInvestment(userId, {
              period: derivedPeriod,
              date: form.date || null,
              platform: form.platform.trim(),
              aporte: val,
              retiros: 0,
              rendimientos: 0,
              costos: 0,
              reserva: val,
              renta_fija: 0,
              renta_variable: 0
            });
            setInvestments([...investments, newInvPlatform]);
          }
        }
      }
      setForm(emptyTx(period));
      setEditingId(null);
    } catch (err) {
      alert("Error guardando: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (t) => { setForm({ ...t, value: String(t.value), allocation: "none", platform: "" }); setEditingId(t.id); };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await deleteTransaction(id);
      setTransactions(transactions.filter((t) => t.id !== id));
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  const handleSaveBulk = async (parsedRows) => {
    try {
      const newTransactions = [];
      for (const row of parsedRows) {
        const derivedPeriod = row.date ? periodForTransaction(row.type, row.date, payDay, incomeAnchors) : period;

        const payload = {
          user_id: userId,
          name: row.name,
          type: row.type,
          category: row.category,
          payment_method: row.payment_method,
          value: Number(row.value),
          date: row.date,
          period: derivedPeriod,
          paid: true
        };

        const created = await addTransaction(userId, payload);
        newTransactions.push(created);
      }

      setTransactions(prev => [...newTransactions, ...prev]);
      alert(`¡Éxito! Se importaron ${newTransactions.length} movimientos.`);
    } catch (error) {
      throw error;
    }
  };

  return (
    <div>
      <SectionTitle eyebrow="Registro" title="Transactions" right={<PeriodNav period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />} />
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
        <Btn variant="ghost" onClick={exportToCSV}>
          <Download size={14} /> Exportar CSV
        </Btn>
        <Btn variant="ghost" onClick={() => setIsImportModalOpen(true)}>
          <Upload size={14} /> Importar CSV
        </Btn>
      </div>

      <ImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        categories={categories}
        onSaveBulk={handleSaveBulk}
      />
      <div className="mlc-grid-form-l">
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR MOVIMIENTO" : "NUEVO MOVIMIENTO"}
          </div>
          
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Ahorro mensual" required disabled={saving} />
            </Field>

            <Field label="Tipo">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={saving}>
                {TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>

            {form.type === "provision" && (
              <div style={{ background: C.paperAlt, padding: 10, borderRadius: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft }}>VINCULACIÓN AUTOMÁTICA DE AHORRO</div>

                <Field label="Registrar en Inversiones (Escribe la Plataforma / Entidad)">
                  <input
                    style={inputStyle}
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    placeholder="Ej. Nubank, Skandia (Opcional)"
                    disabled={saving || editingId}
                  />
                </Field>

                <Field label="O vincular a Meta / Fondo clásico">
                  <select style={inputStyle} value={form.allocation} onChange={(e) => setForm({ ...form, allocation: e.target.value })} disabled={saving || editingId}>
                    <option value="none">Ninguna vinculación extra</option>
                    <option value="inv_reserva">Fondo de Reserva (Oxígeno)</option>
                    {goals && goals.length > 0 && (
                      <optgroup label="Metas Financieras">
                        {goals.map(g => (
                          <option key={g.id} value={`goal_${g.id}`}>Meta: {g.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </Field>
                {editingId && <span style={{ fontSize: 10, color: C.inkFaint }}>* La vinculación automática solo aplica al crear movimientos nuevos.</span>}
              </div>
            )}

            {form.type !== "ingreso" && (
              <Field label="Categoría">
                <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={saving}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
            )}

            <Field label="Método de pago">
              <select style={inputStyle} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} disabled={saving}>
                {PAYMENT_METHODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Fecha">
              <input type="date" style={inputStyle} value={form.date || ""} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={saving} />
            </Field>

            {form.date && (
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: -4 }}>
                Se registrará en el ciclo: <strong style={{ color: C.inkSoft }}>{cyclePeriodLabelSmart(periodForTransaction(form.type, form.date, payDay, incomeAnchors), payDay, incomeAnchors)}</strong>
              </div>
            )}

            <Field label="Valor (COP)">
              <input type="number" min="0" style={inputStyle} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" required disabled={saving} />
            </Field>

            {form.type === "fijo" && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} disabled={saving} /> ¿Pagado?
              </label>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingId ? "Guardar cambios" : "Agregar")}</Btn>
              {editingId && <Btn type="button" variant="ghost" onClick={() => { setForm(emptyTx(period)); setEditingId(null); }} disabled={saving}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        <div>
          <div className="mlc-grid-metrics" style={{ marginBottom: 14 }}>
            {TX_TYPES.map((t) => (
              <Card key={t.id} style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 700, letterSpacing: 0.3 }}>{t.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: C.ink, marginTop: 3, fontWeight: 600 }}>{fmtCompact(totals[t.id])}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3 }}>{cyclePeriodLabelSmart(period, payDay, incomeAnchors).toUpperCase()}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select style={{ ...inputStyle, fontSize: 12.5, padding: "5px 8px" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="todos">Todos los tipos</option>
                {TX_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              <select style={{ ...inputStyle, fontSize: 12.5, padding: "5px 8px" }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="todos">Todas las categorías</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>

              <select style={{ ...inputStyle, fontSize: 12.5, padding: "5px 8px" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <Card style={{ overflow: "hidden" }}>
            {periodTx.length === 0 ? <Empty text="No hay movimientos para este filtro." /> : (
              <div>
                {periodTx.map((t, i) => (
                  <div key={t.id} className="mlc-row-tx" style={{ padding: "10px 14px", borderTop: i === 0 ? "none" : `1px solid ${C.line}`, fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.ink }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: C.inkFaint }}>{t.category || TX_TYPE_LABEL[t.type]} • {t.payment_method}{t.date ? " • " + t.date : ""}</div>
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap",
                      background: t.type === "ingreso" ? C.sageSoft : C.paperAlt, color: t.type === "ingreso" ? C.sage : C.inkSoft,
                    }}>{TX_TYPE_LABEL[t.type]}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: t.type === "ingreso" ? C.sage : C.ink, whiteSpace: "nowrap" }}>
                      {t.type === "ingreso" ? "+" : "-"}{fmtCOP(t.value)}
                    </span>
                    <button onClick={() => edit(t)} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", color: C.coral }}><Trash2 size={14} /></button>
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