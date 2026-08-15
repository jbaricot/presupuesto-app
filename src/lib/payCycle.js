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
