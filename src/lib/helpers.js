import { MONTHS_ES } from "../theme.js";

export const fmtCOP = (v) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v || 0);

export const fmtCompact = (v) =>
  new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(v || 0);

export const periodLabel = (p) => {
  if (!p) return "";
  const [y, m] = p.split("-");
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${y}`;
};

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
