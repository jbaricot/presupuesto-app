/**
 * theme.js
 * ─────────────────────────────────────────────────────────────────────────
 * Todo lo visual/constante que se reutiliza en más de un archivo vive acá:
 * paleta de colores (C), tipografías (FONTS, con las clases responsive de
 * @media también incluidas), colores de gráficas, tipos de transacción,
 * métodos de pago y categorías/presupuesto por defecto para usuarios nuevos.
 * No hay lógica aquí — solo datos. La lógica de negocio va en lib/.
 */

// Paleta FinTech / SaaS Moderno (Alto contraste y colores vibrantes)
export const C = {
  paperAlt: "#F3F4F6", // Fondo exterior gris moderno
  paper: "#FFFFFF",    // Fondo de la app/cards principal (blanco puro)
  card: "#F9FAFB",     // Fondo para inputs o elementos secundarios
  ink: "#111827",      // Texto principal (casi negro, máxima lectura)
  inkSoft: "#4B5563",  // Texto secundario
  inkFaint: "#9CA3AF", // Texto terciario / placeholders
  gold: "#F59E0B",     // Ámbar para progreso/alertas medias
  goldSoft: "#FEF3C7", // Fondo ámbar translúcido
  coral: "#EF4444",    // Rojo vivo para gastos y peligro
  coralSoft: "#FEE2E2",// Fondo rojo translúcido
  sage: "#10B981",     // Verde esmeralda para ingresos y flujo positivo
  sageSoft: "#D1FAE5", // Fondo esmeralda translúcido
  line: "#E5E7EB",     // Bordes sutiles y limpios
  white: "#FFFFFF",
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
body { margin:0; background:${C.paperAlt}; color: ${C.ink}; }

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

// Paleta de colores moderna para las gráficas
export const CHART_COLORS = [
  "#6366F1", // Índigo
  "#10B981", // Esmeralda
  "#3B82F6", // Azul
  "#F59E0B", // Ámbar
  "#EF4444", // Rojo
  "#8B5CF6", // Púrpura
  "#EC4899", // Rosa
  "#14B8A6", // Verde agua
  "#F97316", // Naranja
  "#06B6D4"  // Cian
];

export const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const TX_TYPES = [
  { id: "ingreso", label: "Ingreso" },
  { id: "gastos_esenciales", label: "Gastos Esenciales" },
  { id: "gastos_no_esenciales", label: "Gastos No Esenciales" },
  { id: "credito", label: "Crédito" },
  { id: "provision", label: "Provisión" },
  { id: "imprevistos", label: "Imprevistos" }, // <-- NUEVO
];

export const TX_TYPE_LABEL = {
  ingreso: "Ingreso",
  gastos_esenciales: "Gastos Esenciales",
  gastos_no_esenciales: "Gastos No Esenciales",
  credito: "Crédito",
  provision: "Provisión",
  imprevistos: "Imprevistos", // <-- NUEVO
};

export const PAYMENT_METHODS = ["Débito", "Efectivo", "Transferencia", "Tarjeta de Crédito"];

export const DEFAULT_CATEGORIES = [
  { name: "Mercado", desc: "Alimentos, bebidas y artículos de limpieza del hogar.", type: "gastos_esenciales" },
  { name: "Necesidades", desc: "Farmacia, higiene personal o del hogar.", type: "gastos_esenciales" },
  { name: "Electrónica", desc: "Computador, celular, reparaciones, reloj.", type: "gastos_no_esenciales" },
  { name: "Suscripciones", desc: "Prime, Netflix, Google, etc.", type: "gastos_no_esenciales" },
  { name: "Ropa", desc: "Ropa, calzado, cualquier vestimenta.", type: "gastos_no_esenciales" },
  { name: "Belleza", desc: "Maquillaje, salón, cuidado personal.", type: "gastos_no_esenciales" },
  { name: "Regalos", desc: "Regalos para amigos y familia.", type: "gastos_no_esenciales" },
  { name: "Salud", desc: "Suplementos, gimnasio, consultas médicas.", type: "gastos_esenciales" },
  { name: "Gastos eventuales", desc: "Imprevistos, veterinario, reparaciones.", type: "gastos_no_esenciales" },
  { name: "Desarrollo", desc: "Cursos, libros, crecimiento personal.", type: "gastos_esenciales" },
  { name: "Transporte", desc: "Gasolina y movilidad.", type: "gastos_esenciales" },
  { name: "Restaurante", desc: "Restaurantes y domicilios.", type: "gastos_no_esenciales" },
  { name: "Entretenimiento", desc: "Fiestas, cine, salidas.", type: "gastos_no_esenciales" },
  { name: "Vivienda", desc: "Alquiler, servicios, administración.", type: "gastos_esenciales" },
  { name: "Otro", desc: "Renombra si lo necesitas.", type: "gastos_no_esenciales" },
];

export const DEFAULT_BUDGET = { provision: 0, gastos_esenciales: 0, creditos: 0, gastos_no_esenciales: 0, pay_day: 1 };