/**
 * tabs/Dashboard.jsx ("Panorama")
 * ─────────────────────────────────────────────────────────────────────────
 * Vista de indicadores del ciclo activo: saldo, ingresos/gastos, presupuesto
 * vs. real, gastos por categoría, tendencia anual, y dos indicadores de
 * salud financiera (tasa de ahorro y meses de reserva cubiertos — ver los
 * comentarios en línea de cada cálculo más abajo). Es de solo lectura: no
 * escribe nada en Supabase, solo deriva todo de las props que le pasa App.jsx.
 */
import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Clock } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";
import { C, CHART_COLORS } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { monthAbbrev, cycleRangeSmart } from "../lib/payCycle.js";
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
    const parentGoals = goals.filter(g => !g.parent_goal_id);
    return parentGoals.map((parent) => {
      const subGoals = goals.filter(g => g.parent_goal_id === parent.id);
      const hasSubGoals = subGoals.length > 0;

      const childrenWithProgress = subGoals.map(sub => {
        const saved = contributions.filter(c => c.goal_id === sub.id).reduce((a, c) => a + Number(c.value || 0), 0);
        return { saved, target_total: Number(sub.target_total || 0) };
      });

      const totalSaved = hasSubGoals 
        ? childrenWithProgress.reduce((a, s) => a + s.saved, 0)
        : contributions.filter((c) => c.goal_id === parent.id).reduce((a, c) => a + Number(c.value || 0), 0);

      const totalTarget = hasSubGoals
        ? childrenWithProgress.reduce((a, s) => a + s.target_total, 0)
        : Number(parent.target_total || 0);

      const pct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

      return { ...parent, saved: totalSaved, target_total: totalTarget, pct };
    });
  }, [goals, contributions]);

  /** Tasa de ahorro: % del ingreso del ciclo que fue a provisión/ahorro */
  const savingsRate = totals.ingresos > 0 ? (totals.provision / totals.ingresos) * 100 : null;

  /** Meses de reserva cubiertos: reserva de oxígeno actual / promedio de gastos fijos recientes */
  const monthsOfReserve = useMemo(() => {
    if (investments.length === 0) return null;
    const latestInv = investments.slice().sort((a, b) => b.period.localeCompare(a.period))[0];
    const reserva = Number(latestInv.reserva || 0);
    const byPeriod = {};
    transactions.filter((t) => t.type === "fijo").forEach((t) => {
      byPeriod[t.period] = (byPeriod[t.period] || 0) + Number(t.value || 0);
    });
    const recentPeriods = Object.keys(byPeriod).sort().slice(-3);
    if (recentPeriods.length === 0) return null;
    const avgFijos = recentPeriods.reduce((a, p) => a + byPeriod[p], 0) / recentPeriods.length;
    if (avgFijos <= 0) return null;
    return { reserva, avgFijos, months: reserva / avgFijos };
  }, [investments, transactions]);

  /** Pacing / Velocidad de Gasto: Compara el tiempo transcurrido vs el presupuesto consumido */
  const pacing = useMemo(() => {
    const { start, end } = cycleRangeSmart(period, payDay, incomeAnchors);
    const now = new Date();
    
    const totalDays = Math.max(1, (end - start) / 86400000);
    const elapsedDays = Math.max(0, Math.min((now - start) / 86400000, totalDays));
    const timePct = (elapsedDays / totalDays) * 100;
    
    const budgetOp = Number(budget.fijos) + Number(budget.variables);
    const spentOp = totals.fijos + totals.variables;
    const spentPct = budgetOp > 0 ? (spentOp / budgetOp) * 100 : 0;
    
    const isDanger = spentPct > (timePct + 5); // +5% de margen de tolerancia
    
    return { timePct, spentPct, elapsedDays: Math.round(elapsedDays), totalDays: Math.round(totalDays), isDanger };
  }, [period, payDay, incomeAnchors, budget, totals]);

  /** Evolución del Patrimonio Neto: Efectivo acumulado + Inversiones */
  const netWorthData = useMemo(() => {
    let accCash = 0;
    let accInv = 0;
    
    const allPeriods = Array.from(new Set([...transactions.map(t => t.period), ...investments.map(i => i.period)])).sort();
    
    return allPeriods.map(p => {
      const txs = transactions.filter(t => t.period === p);
      const inFlow = txs.filter(t => t.type === "ingreso").reduce((a, t) => a + Number(t.value), 0);
      const outFlow = txs.filter(t => t.type !== "ingreso").reduce((a, t) => a + Number(t.value), 0);
      accCash += (inFlow - outFlow);
      
      const invs = investments.filter(i => i.period === p);
      const periodInv = invs.reduce((a, i) => a + Number(i.reserva) + Number(i.renta_fija) + Number(i.renta_variable), 0);
      accInv += periodInv;
      
      return {
        label: monthAbbrev(p),
        Patrimonio: accCash + accInv,
      };
    });
  }, [transactions, investments]);

  const rateColor = (v, good, ok) => (v >= good ? C.sage : v >= ok ? C.gold : C.coral);

  const budgetRows = [
    { key: "fijos", label: "Gastos fijos", actual: totals.fijos, target: budget.fijos },
    { key: "variables", label: "Gastos variables", actual: totals.variables, target: budget.variables },
    { key: "creditos", label: "Créditos", actual: totals.creditos, target: budget.creditos },
    { key: "provision", label: "Provisión", actual: totals.provision, target: budget.provision },
  ];

  const investTotal = investments.reduce((a, i) => a + Number(i.reserva || 0) + Number(i.renta_fija || 0) + Number(i.renta_variable || 0), 0);
  // --- LÓGICA DEL RANKING DE CATEGORÍAS ---
  const categoryRanking = useMemo(() => {
    const map = {};
    transactions
      .filter(t => t.period === period && t.type !== "ingreso" && t.category)
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + Number(t.value || 0);
      });
    
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, period]);
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 4 }}>TASA DE AHORRO</div>
          {savingsRate === null ? (
            <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 8 }}>Registra ingresos este ciclo para calcularla.</div>
          ) : (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 600, color: rateColor(savingsRate, 20, 10) }}>
                {savingsRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>de tu ingreso fue a provisión/ahorro este ciclo</div>
            </>
          )}
        </Card>

        <Card style={{ padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 4 }}>MESES DE RESERVA CUBIERTOS</div>
          {monthsOfReserve === null ? (
            <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 8 }}>Registra tu reserva e histórico de fijos para calcularlo.</div>
          ) : (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 28, fontWeight: 600, color: rateColor(monthsOfReserve.months, 3, 1) }}>
                {monthsOfReserve.months.toFixed(1)}
              </div>
              <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>
                con {fmtCompact(monthsOfReserve.reserva)} de reserva operativa
              </div>
            </>
          )}
        </Card>

        <Card style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3 }}>VELOCIDAD DE GASTO OPERATIVO</div>
            {pacing.isDanger && <AlertTriangle size={15} color={C.coral} />}
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkFaint, marginBottom: 4 }}>
            <span>Día {pacing.elapsedDays} de {pacing.totalDays}</span>
            <span>{pacing.timePct.toFixed(0)}% del tiempo</span>
          </div>
          <ProgressBar pct={pacing.timePct} color={C.inkFaint} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.inkSoft, fontWeight: 600, marginTop: 10, marginBottom: 4 }}>
            <span>Consumo (Fijos + Var)</span>
            <span style={{ color: pacing.isDanger ? C.coral : C.sage }}>{pacing.spentPct.toFixed(0)}% gastado</span>
          </div>
          <ProgressBar pct={pacing.spentPct} color={pacing.isDanger ? C.coral : C.sage} />
          
          <div style={{ fontSize: 11, color: pacing.isDanger ? C.coral : C.inkFaint, marginTop: 8, lineHeight: 1.3 }}>
            {pacing.isDanger ? "Tu ritmo de gasto supera el avance de los días. Ajusta variables." : "Ritmo de gasto saludable acorde al tiempo del ciclo."}
          </div>
        </Card>
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

      <div style={{ marginBottom: 20 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 10 }}>EVOLUCIÓN DEL PATRIMONIO NETO</div>
          {netWorthData.length === 0 ? <Empty text="Aún no hay datos históricos." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.sage} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={C.sage} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: "Inter", fill: C.inkSoft }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Inter", fill: C.inkSoft }} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
                <Area type="monotone" dataKey="Patrimonio" stroke={C.sage} strokeWidth={3} fillOpacity={1} fill="url(#colorPatrimonio)" />
              </AreaChart>
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
        {/* Tarjeta de Top Gastos por Categoría */}
      {/* Top Gastos por Categoría */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 14 }}>
            TOP GASTOS POR CATEGORÍA
          </div>
          
          {categoryRanking.length === 0 ? (
            <Empty text="No hay gastos registrados en este período." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categoryRanking.map((cat, idx) => {
                const maxVal = categoryRanking[0].value;
                const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                
                return (
                  <div key={cat.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ fontWeight: 600, color: C.ink }}>
                        {idx + 1}. {cat.name}
                      </span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600, color: C.ink }}>
                        {fmtCOP(cat.value)}
                      </span>
                    </div>
                    
                    <div style={{ background: C.paperAlt, height: 6, borderRadius: 3, overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${pct}%`, 
                          background: idx === 0 ? C.coral : C.gold, 
                          height: "100%", 
                          borderRadius: 3,
                          transition: "width 0.3s ease"
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}