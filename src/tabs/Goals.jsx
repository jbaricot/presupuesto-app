import React, { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { cyclePeriodLabel } from "../lib/payCycle.js";
import { Card, SectionTitle, Field, inputStyle, Btn, ProgressBar, Empty } from "../components/ui.jsx";
import { addGoal, deleteGoal, addContribution } from "../lib/data.js";

export default function GoalsTab({ userId, goals, setGoals, contributions, setContributions, period, payDay }) {
  const [form, setForm] = useState({ name: "", total: "", dueDate: "" });
  const [contribValues, setContribValues] = useState({});

  const goalsWithProgress = useMemo(() => {
    return goals.map((g) => {
      const saved = contributions.filter((c) => c.goal_id === g.id).reduce((a, c) => a + Number(c.value || 0), 0);
      return { ...g, saved, pct: g.target_total > 0 ? (saved / g.target_total) * 100 : 0 };
    });
  }, [goals, contributions]);

  const submitGoal = async (e) => {
    e.preventDefault();
    if (!form.name || !form.total) return;
    const created = await addGoal(userId, { name: form.name, total: Number(form.total), dueDate: form.dueDate || null });
    setGoals([...goals, created]);
    setForm({ name: "", total: "", dueDate: "" });
  };

  const removeGoal = async (id) => {
    if (!confirm("¿Eliminar esta meta y sus aportes?")) return;
    await deleteGoal(id);
    setGoals(goals.filter((g) => g.id !== id));
    setContributions(contributions.filter((c) => c.goal_id !== id));
  };

  const submitContribution = async (goalId) => {
    const val = Number(contribValues[goalId]);
    if (!val) return;
    const created = await addContribution(userId, { goalId, period, value: val });
    setContributions([...contributions, created]);
    setContribValues({ ...contribValues, [goalId]: "" });
  };

  return (
    <div>
      <SectionTitle eyebrow="A futuro" title="Metas financieras" />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>NUEVA META</div>
          <form onSubmit={submitGoal} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre"><input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Viaje" required /></Field>
            <Field label="Total a alcanzar (COP)"><input type="number" min="0" style={inputStyle} value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} required /></Field>
            <Field label="Fecha objetivo"><input type="date" style={inputStyle} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <Btn type="submit"><Plus size={14} /> Crear meta</Btn>
          </form>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goalsWithProgress.length === 0 && <Card style={{ padding: 18 }}><Empty text="Aún no tienes metas creadas." /></Card>}
          {goalsWithProgress.map((g) => (
            <Card key={g.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 17, fontWeight: 600, color: C.ink }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                    {fmtCOP(g.saved)} de {fmtCOP(g.target_total)} {g.due_date && `· objetivo ${g.due_date}`}
                  </div>
                </div>
                <button onClick={() => removeGoal(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={15} /></button>
              </div>
              <div style={{ marginTop: 10 }}><ProgressBar pct={g.pct} color={C.gold} /></div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                <input type="number" min="0" placeholder={`Aporte para ${cyclePeriodLabel(period, payDay)}`} style={{ ...inputStyle, flex: 1 }}
                  value={contribValues[g.id] || ""} onChange={(e) => setContribValues({ ...contribValues, [g.id]: e.target.value })} />
                <Btn variant="ghost" onClick={() => submitContribution(g.id)}><Plus size={14} /> Aportar</Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
