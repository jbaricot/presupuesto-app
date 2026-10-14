/**
 * lib/access.js
 * ─────────────────────────────────────────────────────────────────────────
 * Helpers del acceso de prueba (bono). El estado real vive en la tabla
 * `user_access` de Supabase y se hace cumplir con RLS (ver
 * supabase/migration_v5_acceso_y_rls.sql); aquí solo se interpreta para
 * mostrarlo en pantalla.
 *
 * El enlace del bono es  https://TU-APP/?bono=CODIGO . El código se guarda
 * en localStorage al abrir el enlace, porque el usuario todavía tiene que
 * crear la cuenta (y a veces confirmar el correo) antes de poder activarlo.
 */
const KEY = "mlc_bono";

export function captureBonoFromUrl() {
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("bono");
    if (code) {
      localStorage.setItem(KEY, code.trim());
      url.searchParams.delete("bono");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch { /* sin localStorage: el usuario podrá escribir el código a mano */ }
}

export function getStoredBono() {
  try { return localStorage.getItem(KEY) || ""; } catch { return ""; }
}

export function clearStoredBono() {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
}

/** Interpreta la fila de user_access → { state, daysLeft, canWrite } */
export function describeAccess(row) {
  if (!row || row.status === "pending") return { state: "pending", daysLeft: null, canWrite: false };
  if (row.status === "active") return { state: "active", daysLeft: null, canWrite: true };
  const ms = new Date(row.trial_ends_at).getTime() - Date.now();
  if (ms > 0) return { state: "trial", daysLeft: Math.ceil(ms / 86400000), canWrite: true };
  return { state: "expired", daysLeft: 0, canWrite: false };
}
