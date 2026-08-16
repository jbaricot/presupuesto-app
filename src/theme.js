export const C = {
  paper: "#EDEFE7",
  paperAlt: "#E2E5DA",
  card: "#F7F8F3",
  ink: "#1C2A45",
  inkSoft: "#5B6B87",
  inkFaint: "#93A0B5",
  gold: "#C68A3D",
  goldSoft: "#EFDDBB",
  coral: "#BE5B42",
  coralSoft: "#F1D9CF",
  sage: "#5B7F63",
  sageSoft: "#D9E4D6",
  line: "#D3D6C6",
  white: "#FCFCFA",
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
body { margin:0; background:${C.paperAlt}; }

/* ===== Layout responsive ===== */
.mlc-grid-2      { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
.mlc-grid-stamp  { display:grid; grid-template-columns: auto 1fr; gap:20px; }
.mlc-grid-form-s { display:grid; grid-template-columns: 300px 1fr; gap:20px; align-items:start; }
.mlc-grid-form-l { display:grid; grid-template-columns: 340px 1fr; gap:20px; align-items:start; }
.mlc-grid-metrics{ display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; }

.mlc-row-tx  { display:grid; grid-template-columns: 1fr auto auto auto auto; gap:12px; align-items:center; }
.mlc-row-inv { display:grid; grid-template-columns: 1fr auto auto auto auto auto; gap:12px; align-items:center; }
.mlc-row-cat { display:grid; grid-template-columns: 1fr auto auto; gap:12px; align-items:center; }

@media (max-width: 760px) {
  .mlc-shell { padding: 14px 10px 40px !important; }
  .mlc-card-pad { padding: 16px !important; }
  .mlc-grid-2, .mlc-grid-stamp, .mlc-grid-form-s, .mlc-grid-form-l { grid-template-columns: 1fr !important; }
  .mlc-grid-metrics { grid-template-columns: repeat(2, 1fr) !important; }
  .mlc-row-tx, .mlc-row-cat { grid-template-columns: 1fr !important; row-gap: 6px !important; padding: 12px 14px !important; }
  .mlc-row-tx > *:not(:first-child), .mlc-row-cat > *:not(:first-child) { justify-self: start !important; }
  .mlc-row-inv { grid-template-columns: 1fr 1fr !important; row-gap: 6px !important; }
  .mlc-hide-mobile { display:none !important; }
  h2 { font-size: 20px !important; }
}
`;

export const CHART_COLORS = ["#1C2A45", "#C68A3D", "#5B7F63", "#BE5B42", "#7C8FB0", "#A9865B", "#8CA98F", "#D4A373", "#4A5A78", "#B0805C"];

export const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const TX_TYPES = [
  { id: "ingreso", label: "Ingreso" },
  { id: "fijo", label: "Gasto fijo" },
  { id: "variable", label: "Gasto variable" },
  { id: "credito", label: "Crédito" },
  { id: "provision", label: "Provisión / Ahorro" },
];
export const TX_TYPE_LABEL = Object.fromEntries(TX_TYPES.map(t => [t.id, t.label]));

export const PAYMENT_METHODS = ["Débito", "Efectivo", "Transferencia", "Tarjeta de Crédito"];

export const DEFAULT_CATEGORIES = [
  { name: "Mercado", desc: "Alimentos, bebidas y artículos de limpieza del hogar." },
  { name: "Necesidades", desc: "Farmacia, higiene personal o del hogar." },
  { name: "Electrónica", desc: "Computador, celular, reparaciones, reloj." },
  { name: "Suscripciones", desc: "Prime, Netflix, Google, etc." },
  { name: "Ropa", desc: "Ropa, calzado, cualquier vestimenta." },
  { name: "Belleza", desc: "Maquillaje, salón, cuidado personal." },
  { name: "Regalos", desc: "Regalos para amigos y familia." },
  { name: "Salud", desc: "Suplementos, gimnasio, consultas médicas." },
  { name: "Gastos eventuales", desc: "Imprevistos, veterinario, reparaciones." },
  { name: "Desarrollo", desc: "Cursos, libros, crecimiento personal." },
  { name: "Transporte", desc: "Gasolina y movilidad." },
  { name: "Restaurante", desc: "Restaurantes y domicilios." },
  { name: "Entretenimiento", desc: "Fiestas, cine, salidas." },
  { name: "Vivienda", desc: "Alquiler, servicios, administración." },
  { name: "Otro", desc: "Renombra si lo necesitas." },
];

export const DEFAULT_BUDGET = { provision: 0, fijos: 0, creditos: 0, variables: 0, pay_day: 1 };
