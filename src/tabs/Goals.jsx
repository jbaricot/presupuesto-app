import React, { useState, useMemo } from "react";
import { Plus, Minus, Trash2, TrendingUp, ChevronDown, ChevronUp, Pencil, X, Check, FolderTree, Target } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { cyclePeriodLabelSmart, shiftPeriod, periodForTransaction } from "../lib/payCycle.js";
import { Card, SectionTitle, PeriodNav, Field, inputStyle, Btn, ProgressBar, Empty } from "../components/ui.jsx";
// Importamos updateTransaction y deleteTransaction
import { addGoal, updateGoal, deleteGoal, addContribution, updateContribution, deleteContribution, addTransaction, updateTransaction, deleteTransaction } from "../lib/data.js";

export default function GoalsTab({ userId, goals, setGoals, contributions, setContributions, period, setPeriod, payDay, incomeAnchors, transactions, setTransactions }) {
  const [form, setForm] = useState({ name: "", total: "", dueDate: "", parentGoalId: "" });
  const [editingGoalId, setEditingGoalId] = useState(null);
  
  const [contribValues, setContribValues] = useState({});
  const [withdrawValues, setWithdrawValues] = useState({});
  const [syncToTxGoals, setSyncToTxGoals] = useState({});
  const [collapsedSubs, setCollapsedSubs] = useState({});
  
  const [saving, setSaving] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [editingContribId, setEditingContribId] = useState(null);
  const [editContribValue, setEditContribValue] = useState("");

  const parentGoals = useMemo(() => {
    return goals.filter(g => !g.parent_goal_id);
  }, [goals]);

  const goalsWithProgress = useMemo(() => {
    return parentGoals.map((parent) => {
      const subGoals = goals.filter(g => g.parent_goal_id === parent.id);

      const childrenWithProgress = subGoals.map(sub => {
        const subContribs = contributions.filter(c => c.goal_id === sub.id);
        const saved = subContribs.reduce((a, c) => a + Number(c.value || 0), 0);
        const pct = sub.target_total > 0 ? (saved / sub.target_total) * 100 : 0;
        return { ...sub, saved, pct, subContribs };
      });

      const hasSubGoals = subGoals.length > 0;
      const totalSaved = hasSubGoals 
        ? childrenWithProgress.reduce((a, s) => a + s.saved, 0)
        : contributions.filter(c => c.goal_id === parent.id).reduce((a, c) => a + Number(c.value || 0), 0);

      const totalTarget = hasSubGoals
        ? childrenWithProgress.reduce((a, s) => a + Number(s.target_total || 0), 0)
        : Number(parent.target_total || 0);

      const pct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
      const parentContribs = contributions.filter(c => c.goal_id === parent.id);

      return {
        ...parent,
        saved: totalSaved,
        target_total: totalTarget,
        pct,
        subGoals: childrenWithProgress,
        goalContribs: parentContribs,
        hasSubGoals
      };
    });
  }, [goals, contributions, parentGoals]);

  const toggleSubGoalsMenu = (parentId) => {
    setCollapsedSubs(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const submitGoal = async (e) => {
    e.preventDefault();
    if (!form.name || !form.total) return;
    
    setSaving(true);
    try {
      const payload = {
        name: form.name, 
        total: Number(form.total), 
        dueDate: form.dueDate || null,
        parentGoalId: form.parentGoalId || null 
      };

      if (editingGoalId) {
        const updated = await updateGoal(editingGoalId, payload);
        setGoals(goals.map(g => g.id === editingGoalId ? updated : g));
        setEditingGoalId(null);
      } else {
        const created = await addGoal(userId, payload);
        setGoals([...goals, created]);
      }

      setForm({ name: "", total: "", dueDate: "", parentGoalId: "" });
    } catch (error) {
      alert("Error al guardar la meta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditGoal = (g) => {
    setEditingGoalId(g.id);
    setForm({
      name: g.name,
      total: String(g.target_total),
      dueDate: g.due_date || "",
      parentGoalId: g.parent_goal_id || ""
    });
  };

  const cancelEditGoal = () => {
    setEditingGoalId(null);
    setForm({ name: "", total: "", dueDate: "", parentGoalId: "" });
  };

  const removeGoal = async (id) => {
    if (!confirm("¿Eliminar esta meta (y sus sub-metas/aportes asociados)?")) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id && g.parent_goal_id !== id));
      if (editingGoalId === id) cancelEditGoal();
    } catch (error) {
      alert("Error al eliminar la meta: " + error.message);
    }
  };

  const submitContribution = async (goalId, goalName) => {
    const val = Number(contribValues[goalId]);
    if (!val) return;
    
    setSaving(true);
    try {
      let transactionId = null;
      const shouldSync = syncToTxGoals[goalId] !== false;

      // 1. Si está marcado para sincronizar, usamos el período activo de la app
      if (shouldSync && setTransactions) {
        const derivedPeriod = period; // <-- Aquí está el cambio clave
        const txPayload = {
          user_id: userId,
          name: `Aporte a Meta: ${goalName}`,
          type: "provision",
          category: "Ahorro",
          payment_method: "Transferencia",
          value: val,
          date: new Date().toISOString().slice(0, 10),
          period: derivedPeriod,
          paid: true
        };
        const newTx = await addTransaction(userId, txPayload);
        transactionId = newTx.id;
        setTransactions([newTx, ...transactions]);
      }

      // 2. Creamos el aporte con el mismo período activo
      const created = await addContribution(userId, { goalId, period, value: val, transactionId });
      setContributions([...contributions, created]);
      setContribValues({ ...contribValues, [goalId]: "" });
      setExpandedGoalId(goalId);

    } catch (error) {
      alert("Error al registrar el aporte: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitWithdrawal = async (goalId) => {
    const val = Number(withdrawValues[goalId]);
    if (!val) return;
    
    setSaving(true);
    try {
      const created = await addContribution(userId, { goalId, period, value: -val, transactionId: null });
      setContributions([...contributions, created]);
      setWithdrawValues({ ...withdrawValues, [goalId]: "" });
      setExpandedGoalId(goalId);
    } catch (error) {
      alert("Error al registrar el retiro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditContrib = (c) => {
    setEditingContribId(c.id);
    setEditContribValue(String(c.value));
  };

  const saveContribEdit = async (contribId) => {
    const val = Number(editContribValue);
    if (!val) return;

    setSaving(true);
    try {
      const targetContrib = contributions.find(c => c.id === contribId);
      
      // 1. Actualizar el aporte en base de datos
      const updated = await updateContribution(contribId, { value: val });
      setContributions(contributions.map(c => c.id === contribId ? updated : c));

      // 2. Si tenía una transacción asociada, actualizar su valor también
      if (targetContrib && targetContrib.transaction_id && setTransactions) {
        const updatedTx = await updateTransaction(targetContrib.transaction_id, { value: val });
        setTransactions(transactions.map(t => t.id === targetContrib.transaction_id ? updatedTx : t));
      }

      setEditingContribId(null);
      setEditContribValue("");
    } catch (error) {
      alert("Error al actualizar el movimiento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeContribution = async (id) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      const targetContrib = contributions.find(c => c.id === id);

      // 1. Eliminar el aporte
      await deleteContribution(id);
      setContributions(contributions.filter((c) => c.id !== id));

      // 2. Si tenía transacción asociada, eliminarla del flujo de caja
      if (targetContrib && targetContrib.transaction_id && setTransactions) {
        await deleteTransaction(targetContrib.transaction_id);
        setTransactions(transactions.filter(t => t.id !== targetContrib.transaction_id));
      }
    } catch (error) {
      alert("Error al eliminar el movimiento: " + error.message);
    }
  };

  return (
    <div>
      <SectionTitle 
        eyebrow="A futuro" 
        title="Metas y Sub-metas" 
        right={<PeriodNav period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />} 
      />
      <div className="mlc-grid-form-s">
        
        {/* Formulario */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingGoalId ? "EDITAR META / SUB-META" : "NUEVA META O SUB-META"}
          </div>
          <form onSubmit={submitGoal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="¿Es una Sub-meta? (Opcional)">
              <select 
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} 
                value={form.parentGoalId} 
                onChange={(e) => setForm({ ...form, parentGoalId: e.target.value })} 
                disabled={saving}
              >
                <option value="">No (Es una Meta Principal / Macro-meta)</option>
                {parentGoals
                  .filter(p => p.id !== editingGoalId)
                  .map(p => (
                    <option key={p.id} value={p.id}>Sub-meta de: {p.name}</option>
                  ))}
              </select>
            </Field>

            <Field label="Nombre">
              <input style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Gastos Anuales o SOAT" required disabled={saving} />
            </Field>

            <Field label="Total a alcanzar (COP)">
              <input type="number" min="0" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required disabled={saving} />
            </Field>

            <Field label="Fecha objetivo">
              <input type="date" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} disabled={saving} />
            </Field>

            <div style={{ display: "flex", gap: 8 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingGoalId ? "Guardar cambios" : "Crear meta")}</Btn>
              {editingGoalId && (
                <Btn variant="ghost" disabled={saving} onClick={cancelEditGoal}>
                  <X size={14} /> Cancelar
                </Btn>
              )}
            </div>
          </form>
        </Card>
        
        {/* Listado */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goalsWithProgress.length === 0 && <Card style={{ padding: 18 }}><Empty text="Aún no tienes metas creadas." /></Card>}
          
          {goalsWithProgress.map((parent) => {
            const isParentChecked = syncToTxGoals[parent.id] !== false;
            const isSubCollapsed = !!collapsedSubs[parent.id];

            return (
              <Card key={parent.id} style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Target size={16} color={C.gold} />
                      <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 600, color: C.ink }}>{parent.name}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3 }}>
                      {fmtCOP(parent.saved)} de {fmtCOP(parent.target_total)} {parent.due_date && ` • objetivo ${parent.due_date}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => startEditGoal(parent)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={15} /></button>
                    <button onClick={() => removeGoal(parent.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={15} /></button>
                  </div>
                </div>
                
                <div style={{ marginTop: 10 }}><ProgressBar pct={parent.pct} color={C.gold} /></div>

                {/* Si no tiene sub-metas */}
                {!parent.hasSubGoals && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" min="0" placeholder="Aporte" style={{ ...inputStyle, flex: 1, boxSizing: "border-box" }}
                        value={contribValues[parent.id] || ""} onChange={(e) => setContribValues({ ...contribValues, [parent.id]: e.target.value })} disabled={saving} />
                      <Btn variant="ghost" disabled={saving} onClick={() => submitContribution(parent.id, parent.name)}><Plus size={14} /> Aportar</Btn>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.inkSoft, cursor: "pointer" }}>
                      <input type="checkbox" checked={isParentChecked} onChange={(e) => setSyncToTxGoals({ ...syncToTxGoals, [parent.id]: e.target.checked })} disabled={saving} />
                      Registrar aporte automáticamente como transacción de provisión
                    </label>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      <input type="number" min="0" placeholder="Retiro" style={{ ...inputStyle, flex: 1, boxSizing: "border-box" }}
                        value={withdrawValues[parent.id] || ""} onChange={(e) => setWithdrawValues({ ...withdrawValues, [parent.id]: e.target.value })} disabled={saving} />
                      <Btn variant="ghost" style={{ color: C.coral, borderColor: C.coralSoft }} disabled={saving} onClick={() => submitWithdrawal(parent.id)}><Minus size={14} /> Retirar</Btn>
                    </div>
                  </div>
                )}

                {/* SECCIÓN DE SUB-METAS */}
                {parent.hasSubGoals && (
                  <div style={{ marginTop: 16, borderLeft: `2px solid ${C.line}`, paddingLeft: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
                        <FolderTree size={13} /> SUB-METAS ({parent.subGoals.length})
                      </div>
                      <button 
                        onClick={() => toggleSubGoalsMenu(parent.id)} 
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.gold, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}
                      >
                        {isSubCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                        {isSubCollapsed ? "Desplegar sub-metas" : "Ocultar sub-metas"}
                      </button>
                    </div>

                    {!isSubCollapsed && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {parent.subGoals.map(sub => {
                          const isSubChecked = syncToTxGoals[sub.id] !== false;
                          const isSubExpanded = expandedGoalId === sub.id;

                          return (
                            <div key={sub.id} style={{ background: C.paperAlt, padding: 12, borderRadius: 8 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{sub.name}</div>
                                  <div style={{ fontSize: 11, color: C.inkFaint }}>{fmtCOP(sub.saved)} de {fmtCOP(sub.target_total)}</div>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => startEditGoal(sub)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={13} /></button>
                                  <button onClick={() => removeGoal(sub.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={13} /></button>
                                </div>
                              </div>
                              
                              <div style={{ marginTop: 6 }}><ProgressBar pct={sub.pct} color={C.sage} /></div>

                              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                                <input type="number" min="0" placeholder="Aporte" style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, flex: 1, boxSizing: "border-box" }}
                                  value={contribValues[sub.id] || ""} onChange={(e) => setContribValues({ ...contribValues, [sub.id]: e.target.value })} disabled={saving} />
                                <Btn variant="ghost" style={{ padding: "5px 10px", fontSize: 12 }} disabled={saving} onClick={() => submitContribution(sub.id, `${parent.name} › ${sub.name}`)}><Plus size={12} /> Aportar</Btn>
                              </div>
                              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.inkSoft, marginTop: 4, cursor: "pointer" }}>
                                <input type="checkbox" checked={isSubChecked} onChange={(e) => setSyncToTxGoals({ ...syncToTxGoals, [sub.id]: e.target.checked })} disabled={saving} />
                                Registrar aporte en transacciones
                              </label>

                              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                                <input type="number" min="0" placeholder="Retiro" style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, flex: 1, boxSizing: "border-box" }}
                                  value={withdrawValues[sub.id] || ""} onChange={(e) => setWithdrawValues({ ...withdrawValues, [sub.id]: e.target.value })} disabled={saving} />
                                <Btn variant="ghost" style={{ padding: "5px 10px", fontSize: 12, color: C.coral, borderColor: C.coralSoft }} disabled={saving} onClick={() => submitWithdrawal(sub.id)}><Minus size={12} /> Retirar</Btn>
                              </div>

                              <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                                <button onClick={() => setExpandedGoalId(isSubExpanded ? null : sub.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11.5, color: C.inkSoft, fontWeight: 600, padding: 0 }}>
                                  {isSubExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  {isSubExpanded ? "Ocultar historial" : "Ver historial de aportes y retiros"}
                                </button>

                                {isSubExpanded && (
                                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {sub.subContribs.length === 0 ? (
                                      <div style={{ fontSize: 11, color: C.inkFaint }}>No hay movimientos en esta sub-meta.</div>
                                    ) : (
                                      sub.subContribs.slice().sort((a, b) => b.period.localeCompare(a.period)).map(c => {
                                        const isNegative = Number(c.value) < 0;
                                        return (
                                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.white, padding: '6px 10px', borderRadius: 6 }}>
                                            {editingContribId === c.id ? (
                                              <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                                                <input type="number" style={{ ...inputStyle, padding: '4px 6px', fontSize: 12, flex: 1 }} value={editContribValue} onChange={(e) => setEditContribValue(e.target.value)} disabled={saving} />
                                                <button onClick={() => saveContribEdit(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sage }}><Check size={14} /></button>
                                                <button onClick={() => setEditingContribId(null)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><X size={14} /></button>
                                              </div>
                                            ) : (
                                              <>
                                                <div>
                                                  <div style={{ fontSize: 10.5, color: C.inkFaint }}>
                                                    {cyclePeriodLabelSmart(c.period, payDay, incomeAnchors)} {isNegative ? "• (Retiro)" : "• (Aporte)"}
                                                  </div>
                                                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, color: isNegative ? C.coral : C.ink }}>
                                                    {isNegative ? `- ${fmtCOP(Math.abs(c.value))}` : `+ ${fmtCOP(c.value)}`}
                                                  </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                  <button onClick={() => startEditContrib(c)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><Pencil size={12} /></button>
                                                  <button onClick={() => removeContribution(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.coral }}><Trash2 size={12} /></button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Historial de la Meta Principal */}
                {!parent.hasSubGoals && (
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                    <button onClick={() => setExpandedGoalId(expandedGoalId === parent.id ? null : parent.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.inkSoft, fontWeight: 600, padding: 0 }}>
                      {expandedGoalId === parent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedGoalId === parent.id ? "Ocultar historial" : "Ver historial de aportes y retiros"}
                    </button>

                    {expandedGoalId === parent.id && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {parent.goalContribs.length === 0 ? (
                          <div style={{ fontSize: 12, color: C.inkFaint }}>No hay movimientos registrados.</div>
                        ) : (
                          parent.goalContribs.slice().sort((a, b) => b.period.localeCompare(a.period)).map(c => {
                            const isNegative = Number(c.value) < 0;
                            return (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.paperAlt, padding: '8px 12px', borderRadius: 6 }}>
                                {editingContribId === c.id ? (
                                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                                    <input type="number" style={{ ...inputStyle, padding: '4px 8px', fontSize: 13, flex: 1 }} value={editContribValue} onChange={(e) => setEditContribValue(e.target.value)} disabled={saving} />
                                    <button onClick={() => saveContribEdit(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sage }}><Check size={15} /></button>
                                    <button onClick={() => setEditingContribId(null)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><X size={15} /></button>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <div style={{ fontSize: 11, color: C.inkFaint }}>
                                        {cyclePeriodLabelSmart(c.period, payDay, incomeAnchors)} {isNegative ? "• (Retiro)" : "• (Aporte)"}
                                      </div>
                                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: isNegative ? C.coral : C.ink }}>
                                        {isNegative ? `- ${fmtCOP(Math.abs(c.value))}` : `+ ${fmtCOP(c.value)}`}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                      <button onClick={() => startEditContrib(c)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><Pencil size={13} /></button>
                                      <button onClick={() => removeContribution(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.coral }}><Trash2 size={13} /></button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}