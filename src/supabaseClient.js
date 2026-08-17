/**
 * supabaseClient.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cliente único de Supabase, reexportado a toda la app. Usa la clave
 * `anon` (pública, segura de exponer en el frontend) — el acceso real a
 * los datos de cada usuario está controlado por Row Level Security en la
 * base de datos (ver supabase/schema.sql), no por esta clave.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y completa tus llaves de Supabase."
  );
}

export const supabase = createClient(url, key);
