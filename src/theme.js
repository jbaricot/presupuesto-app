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
