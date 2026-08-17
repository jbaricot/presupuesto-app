import React, { useState, useMemo } from "react";
import { Plus, Trash2, TrendingUp, ChevronDown, ChevronUp, Pencil, X, Check, FolderTree, Target } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { cyclePeriodLabelSmart, shiftPeriod, periodForTransaction } from "../lib/payCycle.js";
import { Card, SectionTitle, Field, inputStyle, Btn, ProgressBar, Empty } from "../components/ui.jsx";
import { addGoal, deleteGoal, addContribution, updateContribution, deleteContribution, addTransaction } from "../lib/data.js";

export default function GoalsTab({ userId, goals, setGoals, contributions, setContributions, period, payDay, incomeAnchors, transactions, setTransactions }) {
  const [form, setForm] = useState({ name: "", total: "", dueDate: "", parentGoalId: "" });
  const [contribValues, setContribValues] = useState({});
  const [syncToTxGoals, setSyncToTxGoals] = useState({});
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

  const submitGoal = async (e) => {
    e.preventDefault();
    if (!form.name || !form.total) return;
    
    setSaving(true);
    try {
      const created = await addGoal(userId, { 
        name: form.name, 
        total: Number(form.total), 
        dueDate: form.dueDate || null,
        parentGoalId: form.parentGoalId || null 
      });
      setGoals([...goals, created]);
      setForm({ name: "", total: "", dueDate: "", parentGoalId: "" });
    } catch (error) {
      alert("Error al crear la meta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async (id) => {
    if (!confirm("¿Eliminar esta meta (y sus sub-metas/aportes asociados)?")) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id && g.parent_goal_id !== id));
    } catch (error) {
      alert("Error al eliminar la meta: " + error.message);
    }
  };

  const submitContribution = async (goalId, goalName) => {
    const val = Number(contribValues[goalId]);
    if (!val) return;
    
    setSaving(true);
    try {
      const created = await addContribution(userId, { goalId, period, value: val });
      setContributions([...contributions, created]);
      setContribValues({ ...contribValues, [goalId]: "" });
      setExpandedGoalId(goalId);

      const shouldSync = syncToTxGoals[goalId] !== false;
      if (shouldSync && setTransactions) {
        const derivedPeriod = periodForTransaction("provision", null, payDay, incomeAnchors);
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
        setTransactions([newTx, ...transactions]);
      }
    } catch (error) {
      alert("Error al registrar el aporte: " + error.message);
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
      const updated = await updateContribution(contribId, { value: val });
      setContributions(contributions.map(c => c.id === contribId ? updated : c));
      setEditingContribId(null);
      setEditContribValue("");
    } catch (error) {
      alert("Error al actualizar el aporte: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeContribution = async (id) => {
    if (!confirm("¿Eliminar este aporte?")) return;
    try {
      await deleteContribution(id);
      setContributions(contributions.filter((c) => c.id !== id));
    } catch (error) {
      alert("Error al eliminar el aporte: " + error.message);
    }
  };

  return (
    <div>
      <SectionTitle eyebrow="A futuro" title="Metas y Sub-metas" />
      <div className="mlc-grid-form-s">
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>NUEVA META O SUB-META</div>
          <form onSubmit={submitGoal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="¿Es una Sub-meta? (Opcional)">
              <select 
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} 
                value={form.parentGoalId} 
                onChange={(e) => setForm({ ...form, parentGoalId: e.target.value })} 
                disabled={saving}
              >
                <option value="">No (Es una Meta Principal / Macro-meta)</option>
                {parentGoals.map(p => (
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

            <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Creando..." : "Crear meta"}</Btn>
          </form>
        </Card>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goalsWithProgress.length === 0 && <Card style={{ padding: 18 }}><Empty text="Aún no tienes metas creadas." /></Card>}
          
          {goalsWithProgress.map((parent) => {
            const isParentChecked = syncToTxGoals[parent.id] !== false;
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
                  <button onClick={() => removeGoal(parent.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={15} /></button>
                </div>
                
                <div style={{ marginTop: 10 }}><ProgressBar pct={parent.pct} color={C.gold} /></div>

                {!parent.hasSubGoals && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="number" min="0" placeholder={`Aporte para ${cyclePeriodLabelSmart(period, payDay, incomeAnchors)}`} style={{ ...inputStyle, flex: 1, boxSizing: "border-box" }}
                        value={contribValues[parent.id] || ""} onChange={(e) => setContribValues({ ...contribValues, [parent.id]: e.target.value })} disabled={saving} />
                      <Btn variant="ghost" disabled={saving} onClick={() => submitContribution(parent.id, parent.name)}><Plus size={14} /> Aportar</Btn>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.inkSoft, marginTop: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={isParentChecked} onChange={(e) => setSyncToTxGoals({ ...syncToTxGoals, [parent.id]: e.target.checked })} disabled={saving} />
                      Registrar automáticamente como transacción de provisión
                    </label>
                  </div>
                )}

                {parent.hasSubGoals && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, borderLeft: `2px solid ${C.line}`, paddingLeft: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 4 }}>
                      <FolderTree size={13} /> SUB-METAS DE ESTE BOLSILLO
                    </div>

                    {parent.subGoals.map(sub => {
                      const isSubChecked = syncToTxGoals[sub.id] !== false;
                      return (
                        <div key={sub.id} style={{ background: C.paperAlt, padding: 12, borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{sub.name}</div>
                              <div style={{ fontSize: 11, color: C.inkFaint }}>{fmtCOP(sub.saved)} de {fmtCOP(sub.target_total)}</div>
                            </div>
                            <button onClick={() => removeGoal(sub.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={13} /></button>
                          </div>
                          
                          <div style={{ marginTop: 6 }}><ProgressBar pct={sub.pct} color={C.sage} /></div>

                          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                            <input type="number" min="0" placeholder="Aporte ciclo" style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, flex: 1, boxSizing: "border-box" }}
                              value={contribValues[sub.id] || ""} onChange={(e) => setContribValues({ ...contribValues, [sub.id]: e.target.value })} disabled={saving} />
                            <Btn variant="ghost" style={{ padding: "5px 10px", fontSize: 12 }} disabled={saving} onClick={() => submitContribution(sub.id, `${parent.name} › ${sub.name}`)}><Plus size={12} /> Aportar</Btn>
                          </div>
                          
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.inkSoft, marginTop: 4, cursor: "pointer" }}>
                            <input type="checkbox" checked={isSubChecked} onChange={(e) => setSyncToTxGoals({ ...syncToTxGoals, [sub.id]: e.target.checked })} disabled={saving} />
                            Registrar en transacciones
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  <button onClick={() => setExpandedGoalId(expandedGoalId === parent.id ? null : parent.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.inkSoft, fontWeight: 600, padding: 0 }}>
                    {expandedGoalId === parent.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {expandedGoalId === parent.id ? "Ocultar historial general" : "Ver historial de aportes"}
                  </button>

                  {expandedGoalId === parent.id && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {parent.goalContribs.length === 0 ? (
                        <div style={{ fontSize: 12, color: C.inkFaint }}>No hay aportes directos registrados en esta macro-meta.</div>
                      ) : (
                        parent.goalContribs.slice().sort((a, b) => b.period.localeCompare(a.period)).map(c => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.paperAlt, padding: '8px 12px', borderRadius: 6 }}>
                            {editingContribId === c.id ? (
                              <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                                <input type="number" min="0" style={{ ...inputStyle, padding: '4px 8px', fontSize: 13, flex: 1 }} value={editContribValue} onChange={(e) => setEditContribValue(e.target.value)} disabled={saving} />
                                <button onClick={() => saveContribEdit(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sage }}><Check size={15} /></button>
                                <button onClick={() => setEditingContribId(null)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><X size={15} /></button>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div style={{ fontSize: 11, color: C.inkFaint }}>{cyclePeriodLabelSmart(c.period, payDay, incomeAnchors)}</div>
                                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: C.ink }}>{fmtCOP(c.value)}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                  <button onClick={() => startEditContrib(c)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkFaint }}><Pencil size={13} /></button>
                                  <button onClick={() => removeContribution(c.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.coral }}><Trash2 size={13} /></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}