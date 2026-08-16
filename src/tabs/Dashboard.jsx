import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { C, CHART_COLORS } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { monthAbbrev } from "../lib/payCycle.js";
import { Card, SectionTitle, PeriodNav, ProgressBar, Empty, LedgerStamp } from "../components/ui.jsx";

export default function Dashboard({ transactions, goals, contributions, investments, budget, period, setPeriod, payDay, incomeAnchors }) {
  const periodTx = useMemo(() => transactions.filter((t) => t.period === period), [transactions, period]);

  const totals = useMemo(() => {
    const sum = (type) => periodTx.filter((t) => t.type === type).reduce((a, t) => a + Number(t.value || 0), 0);
    const ingresos = sum("ingreso");
    const fijos = sum("fijo");
    const variables = sum("variable");
    const creditos = sum("credito");
    const provision = sum("provision");
    const gastos = fijos + variables + creditos + provision;
    return { ingresos, fijos, variables, creditos, provision, gastos, saldo: ingresos - gastos };
  }, [periodTx]);

  const categoryData = useMemo(() => {
    const map = {};
    periodTx.filter((t) => t.type !== "ingreso").forEach((t) => {
      const cat = t.category || "Otro";
      map[cat] = (map[cat] || 0) + Number(t.value || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [periodTx]);

  const annualData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (!map[t.period]) map[t.period] = { period: t.period, ingresos: 0, gastos: 0 };
      if (t.type === "ingreso") map[t.period].ingresos += Number(t.value || 0);
      else map[t.period].gastos += Number(t.value || 0);
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period))
      .map((d) => ({ ...d, label: monthAbbrev(d.period) }));
  }, [transactions]);

  const goalProgress = useMemo(() => {
    return goals.map((g) => {
      const saved = contributions.filter((c) => c.goal_id === g.id).reduce((a, c) => a + Number(c.value || 0), 0);
      return { ...g, saved, pct: g.target_total > 0 ? (saved / g.target_total) * 100 : 0 };
    });
  }, [goals, contributions]);

  const budgetRows = [
    { key: "fijos", label: "Gastos fijos", actual: totals.fijos, target: budget.fijos },
    { key: "variables", label: "Gastos variables", actual: totals.variables, target: budget.variables },
    { key: "creditos", label: "Créditos", actual: totals.creditos, target: budget.creditos },
    { key: "provision", label: "Provisión", actual: totals.provision, target: budget.provision },
  ];

  const investTotal = investments.reduce((a, i) => a + Number(i.reserva || 0) + Number(i.renta_fija || 0) + Number(i.renta_variable || 0), 0);

  return (
    <div>
      <SectionTitle eyebrow="Este período" title="Panorama" right={<PeriodNav period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />} />

      <div className="mlc-grid-stamp" style={{ marginBottom: 20 }}>
        <Card style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LedgerStamp value={totals.saldo} />
        </Card>
        <div className="mlc-grid-2" style={{ gap: 14 }}>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.sage, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
              <ArrowUpRight size={15} /> INGRESOS
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, color: C.ink, marginTop: 6, fontWeight: 600 }}>{fmtCOP(totals.ingresos)}</div>
          </Card>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.coral, fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
              <ArrowDownRight size={15} /> GASTOS
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, color: C.ink, marginTop: 6, fontWeight: 600 }}>{fmtCOP(totals.gastos)}</div>
          </Card>
          <Card style={{ padding: "16px 18px", gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>PRESUPUESTO VS. REAL</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {budgetRows.map((r) => {
                const pct = r.target > 0 ? (r.actual / r.target) * 100 : r.actual > 0 ? 100 : 0;
                const over = r.target > 0 && r.actual > r.target;
                return (
                  <div key={r.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                      <span style={{ color: C.inkSoft, fontWeight: 600 }}>
                        {r.label} {over && <AlertTriangle size={12} style={{ display: "inline", marginLeft: 3, color: C.coral, verticalAlign: -2 }} />}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: over ? C.coral : C.ink }}>
                        {fmtCompact(r.actual)} / {fmtCompact(r.target)}
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={over ? C.coral : C.sage} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mlc-grid-2" style={{ marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>GASTOS POR CATEGORÍA</div>
          {categoryData.length === 0 ? <Empty text="Sin gastos registrados este período." /> : (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>TENDENCIA ANUAL</div>
          {annualData.length === 0 ? <Empty text="Aún no hay datos históricos." /> : (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={annualData}>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "Inter" }} />
                <Line type="monotone" dataKey="ingresos" stroke={C.sage} strokeWidth={2.5} dot={false} name="Ingresos" />
                <Line type="monotone" dataKey="gastos" stroke={C.coral} strokeWidth={2.5} dot={false} name="Gastos" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="mlc-grid-2">
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>METAS EN CURSO</div>
          {goalProgress.length === 0 ? <Empty text="No has creado metas todavía." /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {goalProgress.slice(0, 4).map((g) => (
                <div key={g.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: C.ink }}>{g.name}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: C.inkSoft }}>{Math.round(g.pct)}%</span>
                  </div>
                  <ProgressBar pct={g.pct} color={C.gold} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>INVERSIÓN ACUMULADA</div>
          {investments.length === 0 ? <Empty text="Sin registros de inversión." /> : (
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, color: C.ink, fontWeight: 600, marginTop: 8 }}>
              {fmtCOP(investTotal)}
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.inkSoft, fontWeight: 500, marginTop: 4 }}>
                en {investments.length} registro{investments.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
