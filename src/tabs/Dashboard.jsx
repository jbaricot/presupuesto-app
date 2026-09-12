/**
 * tabs/Dashboard.jsx ("Panorama")
 * ─────────────────────────────────────────────────────────────────────────
 * Vista de indicadores del ciclo activo: saldo, ingresos/gastos, presupuesto
 * vs. real, gastos por categoría, tendencia anual, y dos indicadores de
 * salud financiera (tasa de ahorro y meses de reserva cubiertos — ver los
 * comentarios en línea de cada cálculo más abajo). Es de solo lectura: no
 * escribe nada en Supabase, solo deriva todo de las props que le pasa App.jsx.
 * Vista de indicadores del ciclo activo.
 * Ahora incluye la exportación de la Matriz Anual de Presupuesto a CSV.
 * Vista de indicadores del ciclo activo adaptada a la nueva nomenclatura:
 * gastos_esenciales y gastos_no_esenciales.
 */
import React, { useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Download } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";
import { C, CHART_COLORS } from "../theme.js";
import { fmtCOP, fmtCompact } from "../lib/helpers.js";
import { monthAbbrev, cycleRangeSmart } from "../lib/payCycle.js";
import { Card, SectionTitle, PeriodNav, ProgressBar, Empty, LedgerStamp, Btn } from "../components/ui.jsx";

export default function Dashboard({ transactions, goals, contributions, investments, budget, period, setPeriod, payDay, incomeAnchors }) {
  const periodTx = useMemo(() => transactions.filter((t) => t.period === period), [transactions, period]);
  
  // 1. ACTUALIZADO: Sumas usando los nuevos IDs de tipos de gasto
  const totals = useMemo(() => {
    const sum = (type) => periodTx.filter((t) => t.type === type).reduce((a, t) => a + Number(t.value || 0), 0);
    const ingresos = sum("ingreso");
    const gastos_esenciales = sum("gastos_esenciales");
    const gastos_no_esenciales = sum("gastos_no_esenciales");
    const creditos = sum("credito");
    const provision = sum("provision");
    const gastos = gastos_esenciales + gastos_no_esenciales + creditos + provision;
    return { ingresos, gastos_esenciales, gastos_no_esenciales, creditos, provision, gastos, saldo: ingresos - gastos };
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

  const savingsRate = totals.ingresos > 0 ? (totals.provision / totals.ingresos) * 100 : null;

  const netInvestmentValue = (i) => {
    const baseAporte = Number(i.aporte ?? i.reserva ?? 0);
    return baseAporte - Number(i.retiros || 0) + Number(i.rendimientos || 0) - Number(i.costos || 0);
  };

  // 2. ACTUALIZADO: Meses de reserva usa el promedio de 'gastos_esenciales' y lee las plataformas dinámicas
  const monthsOfReserve = useMemo(() => {
    if (investments.length === 0) return null;
    
    const emergencyPlatforms = budget?.emergency_fund_platforms 
      ? budget.emergency_fund_platforms.split(",").map(p => p.trim().toLowerCase()).filter(Boolean)
      : [];

    const reservaActual = investments
      .filter(i => {
        const plat = (i.platform || "").toLowerCase();
        if (emergencyPlatforms.length > 0) {
          return emergencyPlatforms.some(ep => plat.includes(ep));
        }
        return plat.includes("skandia") || plat.includes("colfondos");
      })
      .reduce((sum, i) => sum + netInvestmentValue(i), 0);

    const byPeriod = {};
    transactions.filter((t) => t.type === "gastos_esenciales").forEach((t) => {
      byPeriod[t.period] = (byPeriod[t.period] || 0) + Number(t.value || 0);
    });
    
    const recentPeriods = Object.keys(byPeriod).sort().slice(-3);
    if (recentPeriods.length === 0 || reservaActual <= 0) return null;
    
    const avgFijos = recentPeriods.reduce((a, p) => a + byPeriod[p], 0) / recentPeriods.length;
    if (avgFijos <= 0) return null;
    
    return { reserva: reservaActual, avgFijos, months: reservaActual / avgFijos };
  }, [investments, transactions, budget]);

  // 3. ACTUALIZADO: Pacing evalúa el consumo sumando esenciales + no esenciales
  const pacing = useMemo(() => {
    const { start, end } = cycleRangeSmart(period, payDay, incomeAnchors);
    const now = new Date();
    
    const totalDays = Math.max(1, (end - start) / 86400000);
    const elapsedDays = Math.max(0, Math.min((now - start) / 86400000, totalDays));
    const timePct = (elapsedDays / totalDays) * 100;
    
    const budgetOp = Number(budget?.gastos_esenciales || 0) + Number(budget?.gastos_no_esenciales || 0);
    const spentOp = totals.gastos_esenciales + totals.gastos_no_esenciales;
    const spentPct = budgetOp > 0 ? (spentOp / budgetOp) * 100 : 0;
    
    const isDanger = spentPct > (timePct + 5); 
    
    return { timePct, spentPct, elapsedDays: Math.round(elapsedDays), totalDays: Math.round(totalDays), isDanger };
  }, [period, payDay, incomeAnchors, budget, totals]);

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
      const periodInv = invs.reduce((a, i) => a + netInvestmentValue(i), 0);
      accInv += periodInv;
      
      return { label: monthAbbrev(p), Patrimonio: accCash + accInv };
    });
  }, [transactions, investments]);

  // 4. ACTUALIZADO: Exportador usa la nueva nomenclatura
  const exportAnnualMatrix = () => {
    const year = period ? period.split("-")[0] : new Date().getFullYear().toString();
    const yearTxs = transactions.filter(t => t.period && t.period.startsWith(`${year}-`));
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const headerMonths = monthNames.map(m => `${m}-${year.slice(2)}`);

    const matrix = { ingreso: {}, gastos_esenciales: {}, gastos_no_esenciales: {}, credito: {}, provision: {} };

    yearTxs.forEach(t => {
      const tType = t.type;
      const tCat = t.category || (tType === "ingreso" ? t.name : "Sin categoría");
      const mIndex = parseInt(t.period.split("-")[1], 10) - 1;

      if (!matrix[tType]) return;
      if (!matrix[tType][tCat]) matrix[tType][tCat] = Array(12).fill(0);

      matrix[tType][tCat][mIndex] += Number(t.value || 0);
    });

    const headers = ["GRUPO", "CATEGORÍA", "PRESUPUESTO", ...headerMonths];
    const rows = [headers.join(",")];

    const addGroup = (groupKey, groupName, isExpense) => {
      const categories = Object.keys(matrix[groupKey]).sort();
      let subtotal = Array(12).fill(0);

      categories.forEach(cat => {
        const vals = matrix[groupKey][cat];
        vals.forEach((v, i) => subtotal[i] += v);
        const formattedVals = vals.map(v => v === 0 ? "" : (isExpense ? -v : v));
        rows.push(`"${groupName}","${cat}","",${formattedVals.join(",")}`);
      });

      if (groupKey === "ingreso" && categories.length > 0) {
        const formattedVals = subtotal.map(v => v === 0 ? "" : v);
        rows.push(`"TOTAL INGRESOS","", "",${formattedVals.join(",")}`);
      }

      return subtotal;
    };

    const inSub = addGroup("ingreso", "INGRESOS", false);
    const fixSub = addGroup("gastos_esenciales", "GASTOS ESENCIALES", true);
    const varSub = addGroup("gastos_no_esenciales", "GASTOS NO ESENCIALES", true);
    const provSub = addGroup("provision", "PROVISIONES", true);
    const credSub = addGroup("credito", "PLAN FINANCIERO (Deudas)", true);

    const netFlow = Array(12).fill(0).map((_, i) => {
      return inSub[i] - fixSub[i] - varSub[i] - credSub[i] - provSub[i];
    });

    rows.push(`"FLUJO NETO","", "",${netFlow.map(v => v === 0 ? "" : v).join(",")}`);

    const csvContent = rows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Matriz_Presupuesto_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rateColor = (v, good, ok) => (v >= good ? C.sage : v >= ok ? C.gold : C.coral);

  // 5. ACTUALIZADO: Tarjetas de control de presupuesto leyendo las nuevas propiedades
  const budgetRows = [
    { key: "gastos_esenciales", label: "Gastos Esenciales", actual: totals.gastos_esenciales, target: budget?.gastos_esenciales || 0 },
    { key: "gastos_no_esenciales", label: "Gastos No Esenciales", actual: totals.gastos_no_esenciales, target: budget?.gastos_no_esenciales || 0 },
    { key: "creditos", label: "Créditos", actual: totals.creditos, target: budget?.creditos || 0 },
    { key: "provision", label: "Provisión", actual: totals.provision, target: budget?.provision || 0 },
  ];

  const investTotal = investments.reduce((a, i) => a + netInvestmentValue(i), 0);
  
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
      <SectionTitle 
        eyebrow="Este período" 
        title="Panorama" 
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn variant="ghost" onClick={exportAnnualMatrix} style={{ padding: "6px 12px", fontSize: 12 }}>
              <Download size={14} /> Exportar Matriz Anual
            </Btn>
            <PeriodNav period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />
          </div>
        } 
      />
      
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
            <span>Consumo (Esenciales + No Esenc.)</span>
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