/**
 * tabs/Investments.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Seguimiento de inversiones por plataforma (Nubank, Skandia, etc.), con
 * aporte/retiro/rendimiento/costo por registro. El patrimonio neto de cada
 * fila es aporte - retiros + rendimientos - costos (ver `netRow`/`netPeriod`
 * en los distintos useMemo). `reserva`/`renta_fija`/`renta_variable` son
 * columnas heredadas que se siguen llenando (reserva = aporte) solo para
 * que el indicador "meses de reserva" del Dashboard siga funcionando sin
 * tener que tocarlo — ver el comentario en lib/data.js sobre esto.
 *
 * Igual que en Transacciones, aportar acá puede crear opcionalmente una
 * transacción de provisión vinculada (casilla "syncToTx").
* Incluye exportación a CSV con formato anual (Ene-Dic) y BOM UTF-8.
 */
import React, { useState, useMemo } from "react";
import { Plus, X, Pencil, Trash2, PiggyBank, Building2, Download } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { C } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { currentPeriod, cyclePeriodLabelSmart, monthAbbrev, periodForTransaction } from "../lib/payCycle.js";
import { Card, SectionTitle, PeriodNav, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
import { addInvestment, updateInvestment, deleteInvestment, addTransaction, updateTransaction, deleteTransaction } from "../lib/data.js";

function emptyInv(period) { 
  return { 
    period, 
    date: "", 
    platform: "Nubank", 
    aporte: "", 
    retiros: "", 
    rendimientos: "", 
    costos: "",
    syncToTx: true,
    transactionId: null,
  }; 
}

export default function InvestmentsTab({ userId, investments, setInvestments, payDay, incomeAnchors, period, setPeriod, transactions, setTransactions }) {
  const [form, setForm] = useState(emptyInv(period));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState("todos");

  const platformsList = useMemo(() => {
    const set = new Set(investments.map(i => i.platform || "General"));
    return Array.from(set);
  }, [investments]);

  const chartData = useMemo(() => {
    const filtered = selectedPlatformFilter === "todos" 
      ? investments 
      : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);

    const periodMap = {};
    filtered.forEach(i => {
      const p = i.period;
      if (!periodMap[p]) periodMap[p] = 0;
      const baseAporte = Number(i.aporte || i.reserva || 0);
      const netPeriod = baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
      periodMap[p] += netPeriod;
    });

    let acc = 0;
    return Object.entries(periodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, netVal]) => {
        acc += netVal;
        return { label: monthAbbrev(p), acumulado: acc };
      });
  }, [investments, selectedPlatformFilter]);

  const totalAll = useMemo(() => {
    const filtered = selectedPlatformFilter === "todos" 
      ? investments 
      : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);

    return filtered.reduce((a, i) => {
      const baseAporte = Number(i.aporte || i.reserva || 0);
      const net = baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
      return a + net;
    }, 0);
  }, [investments, selectedPlatformFilter]);

  const timelineCostsReturns = useMemo(() => {
    const filtered = selectedPlatformFilter === "todos" 
      ? investments 
      : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);
    
    const map = {};
    filtered.forEach(i => {
      if (!map[i.period]) map[i.period] = { period: i.period, label: monthAbbrev(i.period), rendimientos: 0, costos: 0 };
      map[i.period].rendimientos += Number(i.rendimientos || 0);
      map[i.period].costos += Number(i.costos || 0);
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  }, [investments, selectedPlatformFilter]);

  const platformCostsReturns = useMemo(() => {
    const map = {};
    investments.forEach(i => {
      const plat = i.platform || "General";
      if (!map[plat]) map[plat] = { platform: plat, rendimientos: 0, costos: 0 };
      map[plat].rendimientos += Number(i.rendimientos || 0);
      map[plat].costos += Number(i.costos || 0);
    });
    return Object.values(map);
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    return investments.filter(i => {
      const matchPeriod = i.period === period;
      const matchPlatform = selectedPlatformFilter === "todos" || (i.platform || "General") === selectedPlatformFilter;
      return matchPeriod && matchPlatform;
    });
  }, [investments, period, selectedPlatformFilter]);

  // Función para exportar el resumen anual tipo Excel
  const exportInvestmentsCSV = () => {
    const year = period ? period.split("-")[0] : new Date().getFullYear().toString();
    
    const filtered = selectedPlatformFilter === "todos" 
      ? investments 
      : investments.filter(i => (i.platform || "General") === selectedPlatformFilter);

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    let runningTotal = 0;
    let totalAporteSum = 0;
    let totalRetirosSum = 0;
    let totalRendimientosSum = 0;
    let totalCostosSum = 0;

    const rows = monthNames.map((monthName, idx) => {
      const monthNum = String(idx + 1).padStart(2, "0");
      const periodKey = `${year}-${monthNum}`;

      const monthInvs = filtered.filter(i => i.period === periodKey);

      const aporte = monthInvs.reduce((sum, i) => sum + Number(i.aporte || i.reserva || 0), 0);
      const retiros = monthInvs.reduce((sum, i) => sum + Number(i.retiros || 0), 0);
      const rendimientos = monthInvs.reduce((sum, i) => sum + Number(i.rendimientos || 0), 0);
      const costos = monthInvs.reduce((sum, i) => sum + Number(i.costos || 0), 0);

      const netPeriod = aporte - retiros + rendimientos - costos;
      runningTotal += netPeriod;

      totalAporteSum += aporte;
      totalRetirosSum += retiros;
      totalRendimientosSum += rendimientos;
      totalCostosSum += costos;

      return [
        monthName,
        aporte,
        retiros,
        rendimientos,
        runningTotal,
        -costos
      ];
    });

    const headers = ["Mes", "Aporte", "Retiros", "Rendimientos", "Total", "Costos"];
    const summaryRow = ["Total", totalAporteSum, totalRetirosSum, totalRendimientosSum, runningTotal, -totalCostosSum];

    const csvContent = [headers.join(","), ...rows.map(r => r.join(",")), summaryRow.join(",")].join("\n");
    
    // BOM para soporte UTF-8 en Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `resumen_inversiones_${year}_${selectedPlatformFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.period || !form.platform) return;
    
    setSaving(true);
    try {
      const aporteVal = Number(form.aporte || 0);
      let transactionId = form.transactionId || null;

      if (form.syncToTx && aporteVal > 0 && !editingId) {
        // Registro nuevo: crea la transacción de provisión vinculada.
        const derivedPeriod = form.date 
          ? periodForTransaction("provision", form.date, payDay, incomeAnchors) 
          : form.period;

        const txPayload = {
          user_id: userId,
          name: `Ahorro / Inv: ${form.platform.trim()}`,
          type: "provision",
          category: "Ahorro",
          payment_method: "Transferencia",
          value: aporteVal,
          date: form.date || null,
          period: derivedPeriod,
          paid: true
        };

        const newTx = await addTransaction(userId, txPayload);
        transactionId = newTx.id;
        setTransactions([newTx, ...transactions]);
      } else if (editingId && form.syncToTx && transactionId) {
        // Registro existente CON transacción vinculada y sincronización activa:
        // actualiza esa transacción para que refleje el nuevo aporte/fecha,
        // en vez de dejarla desactualizada silenciosamente.
        const derivedPeriod = form.date
          ? periodForTransaction("provision", form.date, payDay, incomeAnchors)
          : form.period;

        const updatedTx = await updateTransaction(transactionId, {
          name: `Ahorro / Inv: ${form.platform.trim()}`,
          value: aporteVal,
          date: form.date || null,
          period: derivedPeriod,
        });
        setTransactions(transactions.map((t) => (t.id === transactionId ? updatedTx : t)));
      }

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
        renta_variable: 0,
        ...(transactionId && { transaction_id: transactionId })
      };
      
      if (editingId) {
        const updated = await updateInvestment(editingId, payload);
        setInvestments(investments.map((i) => (i.id === editingId ? updated : i)));
      } else {
        const created = await addInvestment(userId, payload);
        setInvestments([...investments, created]);
      }

      setForm(emptyInv(period));
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
      syncToTx: Boolean(i.transaction_id),
      transactionId: i.transaction_id || null,
    }); 
    setEditingId(i.id); 
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este registro y su transacción asociada?")) return;
    try {
      const targetInvestment = investments.find((i) => i.id === id);

      await deleteInvestment(id);
      setInvestments(investments.filter((i) => i.id !== id));

      if (targetInvestment && targetInvestment.transaction_id && setTransactions) {
        await deleteTransaction(targetInvestment.transaction_id);
        setTransactions(transactions.filter((t) => t.id !== targetInvestment.transaction_id));
      }
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  return (
    <div>
      <SectionTitle 
        eyebrow="Reserva y crecimiento" 
        title="Inversión y Ahorro" 
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn variant="ghost" onClick={exportInvestmentsCSV} style={{ padding: "6px 12px", fontSize: 12 }}>
              <Download size={14} /> Exportar Resumen CSV
            </Btn>
            <PeriodNav period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />
          </div>
        } 
      />
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

            {(!editingId || form.transactionId) && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginTop: 4 }}>
                <input 
                  type="checkbox" 
                  checked={form.syncToTx} 
                  onChange={(e) => setForm({ ...form, syncToTx: e.target.checked })} 
                  disabled={saving} 
                /> 
                {editingId
                  ? "Actualizar también la transacción de provisión vinculada"
                  : "Registrar aporte también como transacción de provisión"}
              </label>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingId ? "Guardar" : "Agregar")}</Btn>
              {editingId && <Btn variant="ghost" disabled={saving} onClick={() => { setForm(emptyInv(period)); setEditingId(null); }}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        {/* Panel derecho */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Tarjeta de Patrimonio y Gráfico de Acumulado */}
          <Card style={{ padding: 18 }}>
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

          {/* Opción 1: Gráfico de Rendimientos vs Costos (Por Período) */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
              RENDIMIENTOS VS COSTOS (POR PERÍODO)
            </div>
            {timelineCostsReturns.length === 0 ? (
              <Empty text="Sin datos suficientes." />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={timelineCostsReturns}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="rendimientos" fill={C.sage} name="Rendimientos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costos" fill={C.coral} name="Costos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Opción 2: Gráfico de Rendimientos vs Costos (Desglose por Plataforma) */}
          <Card style={{ padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
              RENDIMIENTOS VS COSTOS (POR PLATAFORMA)
            </div>
            {platformCostsReturns.length === 0 ? (
              <Empty text="Sin datos suficientes." />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={platformCostsReturns}>
                  <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                  <XAxis dataKey="platform" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="rendimientos" fill={C.sage} name="Rendimientos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costos" fill={C.coral} name="Costos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Listado de Registros filtrado por período */}
          <Card style={{ overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontSize: 12, fontWeight: 700, color: C.inkSoft, borderBottom: `1px solid ${C.line}` }}>
              REGISTROS DEL PERÍODO FILTRADO
            </div>
            {filteredInvestments.length === 0 ? <Empty text="Sin registros para este período." /> : (
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