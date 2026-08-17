import { MONTHS_ES } from "../theme.js";

/**
 * Ciclos de pago: un "período" sigue representándose como "YYYY-MM" (igual que antes),
 * pero su significado cambia según payDay:
 *   - payDay = 1  → el período "2026-07" es el mes calendario de julio (comportamiento clásico).
 *   - payDay = 26 → el período "2026-07" es el ciclo del 26 de julio al 25 de agosto,
 *                   es decir, el dinero que te pagan el 26/jul y con el que vives hasta el 25/ago.
 * Así no fue necesario cambiar el esquema de transacciones/inversiones/metas.
 */

function pad(n) { return String(n).padStart(2, "0"); }

export function periodForDate(dateStr, payDay) {
  const pd = Math.min(Math.max(Number(payDay) || 1, 1), 28); // 1–28 para evitar meses cortos
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  let y = d.getFullYear();
  let m = d.getMonth(); // 0-indexed
  if (d.getDate() < pd) {
    m -= 1;
    if (m < 0) { m = 11; y -= 1; }
  }
  return `${y}-${pad(m + 1)}`;
}

export function currentPeriod(payDay) {
  return periodForDate(null, payDay);
}

export function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function cycleRange(period, payDay) {
  const pd = Math.min(Math.max(Number(payDay) || 1, 1), 28);
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, pd);
  const end = new Date(y, m, pd - 1);
  return { start, end };
}

const shortDate = (d) => `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`;

export function cyclePeriodLabel(period, payDay) {
  const pd = Math.min(Math.max(Number(payDay) || 1, 1), 28);
  if (pd <= 1) {
    const [y, m] = period.split("-");
    return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y}`;
  }
  const { start, end } = cycleRange(period, payDay);
  return `${shortDate(start)} – ${shortDate(end)} ${end.getFullYear()}`;
}

export function monthAbbrev(period) {
  const [y, m] = period.split("-");
  return `${MONTHS_ES[parseInt(m, 10) - 1].slice(0, 3)} ${y.slice(2, 4)}`;
}

/**
 * ===== Ciclos dinámicos basados en ingresos reales =====
 * Si el salario no siempre cae el mismo día (fines de semana, festivos, adelantos),
 * en vez de forzar un día fijo cada mes, usamos las fechas reales de tus transacciones
 * tipo "ingreso" como anclas del ciclo. El "día de pago" configurado en Presupuesto
 * solo se usa como respaldo cuando todavía no hay un ingreso registrado para ese ciclo
 * (por ejemplo, el mes que aún no te han pagado).
 */

export function getIncomeAnchors(transactions) {
  const dates = (transactions || [])
    .filter((t) => t.type === "ingreso" && t.date)
    .map((t) => t.date);
  return Array.from(new Set(dates)).sort();
}

export function periodForDateSmart(dateStr, payDay, anchors) {
  const d = dateStr || new Date().toISOString().slice(0, 10);
  let chosen = null;
  for (const a of anchors) {
    if (a <= d) chosen = a;
    else break;
  }
  if (chosen) {
    const gapDays = (new Date(d + "T00:00:00") - new Date(chosen + "T00:00:00")) / 86400000;
    // Si la ancla más cercana quedó demasiado lejos (más de ~40 días), probablemente
    // faltan ingresos registrados entre medio: no la uses, cae al día nominal.
    if (gapDays <= 40) {
      const [y, m] = chosen.split("-");
      return `${y}-${m}`;
    }
  }
  return periodForDate(dateStr, payDay); // sin ancla reciente: usar el día nominal
}

/**
 * Determina el período de una transacción según su tipo:
 * - Si es un "ingreso", su propia fecha DEFINE el inicio de un ciclo nuevo
 *   (no hay que buscar el ancla anterior, sería mezclarlo con el ciclo previo).
 * - Para cualquier otro tipo (gasto fijo, variable, crédito, provisión), se usa
 *   la ancla de ingreso más cercana hacia atrás (periodForDateSmart).
 */
export function periodForTransaction(type, dateStr, payDay, anchors) {
  if (type === "ingreso") {
    const d = dateStr || new Date().toISOString().slice(0, 10);
    return d.slice(0, 7);
  }
  return periodForDateSmart(dateStr, payDay, anchors);
}

export function cycleRangeSmart(period, payDay, anchors) {
  const idx = anchors.findIndex((a) => a.slice(0, 7) === period);
  if (idx === -1) return cycleRange(period, payDay); // sin ingreso registrado ese ciclo: nominal
  const start = new Date(anchors[idx] + "T00:00:00");
  let end;
  if (idx + 1 < anchors.length) {
    end = new Date(anchors[idx + 1] + "T00:00:00");
    end.setDate(end.getDate() - 1);
  } else {
    end = cycleRange(period, payDay).end; // aún no llega el siguiente ingreso: fecha de cierre estimada
  }
  return { start, end };
}

export function cyclePeriodLabelSmart(period, payDay, anchors) {
  const pd = Math.min(Math.max(Number(payDay) || 1, 1), 28);
  if (pd <= 1) {
    const [y, m] = period.split("-");
    return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y}`;
  }
  const { start, end } = cycleRangeSmart(period, payDay, anchors);
  return `${shortDate(start)} – ${shortDate(end)} ${end.getFullYear()}`;
}
