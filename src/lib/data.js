/**
 * lib/data.js
 * ─────────────────────────────────────────────────────────────────────────
 * Capa de acceso a datos: todas las consultas a Supabase viven aquí y en
 * ningún otro lado. Los componentes de tabs/ nunca llaman a `supabase`
 * directamente — siempre pasan por una función de este archivo.
 *
 * Convención de cada función:
 *   fetchX(userId)        → trae todos los registros de X del usuario
 *   addX(userId, payload)  → crea un registro y lo devuelve ya insertado
 *   updateX(id, payload)   → actualiza y devuelve el registro actualizado
 *   deleteX(id)             → borra, no devuelve nada
 *
 * Todas lanzan (throw) el error de Supabase tal cual si algo falla, para
 * que el componente que llama decida cómo mostrarlo (alert, toast, etc.).
 */
import { supabase } from "../supabaseClient.js";

/* ============ CATEGORÍAS ============ */
export async function fetchCategories(userId) {
  const { data, error } = await supabase.from("categories").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return data;
}

export async function seedDefaultCategories(userId, defaults) {
  const rows = defaults.map((c) => ({ user_id: userId, name: c.name, description: c.desc }));
  const { data, error } = await supabase.from("categories").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function addCategory(userId, { name, desc }) {
  const { data, error } = await supabase.from("categories").insert({ user_id: userId, name, description: desc }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id, { name, desc }) {
  const { data, error } = await supabase.from("categories").update({ name, description: desc }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ============ TRANSACCIONES ============ */
export async function fetchTransactions(userId) {
  const { data, error } = await supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addTransaction(userId, row) {
  const { data, error } = await supabase.from("transactions").insert({ user_id: userId, ...row }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, row) {
  const { data, error } = await supabase.from("transactions").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/* ============ METAS Y SUB-METAS ============
 * Una meta con parent_goal_id === null es una "meta principal" (macro-meta).
 * Una meta con parent_goal_id apuntando a otra es una "sub-meta" — el
 * progreso de la principal se calcula sumando el de sus sub-metas
 * (ver goalsWithProgress en tabs/Goals.jsx). */
export async function fetchGoals(userId) {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return data;
}

export async function addGoal(userId, { name, total, dueDate, parentGoalId }) {
  const { data, error } = await supabase.from("goals").insert({ 
    user_id: userId, 
    name, 
    target_total: total, 
    due_date: dueDate || null,
    parent_goal_id: parentGoalId || null 
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

export async function updateGoal(id, { name, total, dueDate, parentGoalId }) {
  const { data, error } = await supabase.from("goals").update({
    name,
    target_total: total,
    due_date: dueDate || null,
    parent_goal_id: parentGoalId || null
  }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/* ============ APORTES / RETIROS DE METAS ============
 * Un "retiro" es un registro más en esta misma tabla, con value negativo
 * (ver submitWithdrawal en tabs/Goals.jsx) — no hay una tabla separada.
 * transactionId es opcional: se llena solo si el usuario marcó la casilla
 * "registrar también como transacción de provisión" al aportar. */
export async function fetchContributions(userId) {
  const { data, error } = await supabase.from("goal_contributions").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function addContribution(userId, { goalId, period, value, transactionId }) {
  const { data, error } = await supabase.from("goal_contributions").insert({ 
    user_id: userId, 
    goal_id: goalId, 
    period, 
    value, 
    transaction_id: transactionId || null 
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateContribution(id, row) {
  const { data, error } = await supabase.from("goal_contributions").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteContribution(id) {
  const { error } = await supabase.from("goal_contributions").delete().eq("id", id);
  if (error) throw error;
}

/* ============ INVERSIONES ============
 * `platform` agrupa registros por dónde está invertido el dinero (Nubank,
 * Skandia, etc.). `reserva`/`renta_fija`/`renta_variable` son columnas
 * heredadas de la v1 que el Dashboard sigue usando para "meses de reserva";
 * `aporte`/`retiros`/`rendimientos`/`costos` son el desglose más fino que
 * usa la pestaña Inversión. Se mantienen ambos por compatibilidad. */
export async function fetchInvestments(userId) {
  const { data, error } = await supabase.from("investments").select("*").eq("user_id", userId).order("period");
  if (error) throw error;
  return data;
}

export async function addInvestment(userId, row) {
  const { data, error } = await supabase.from("investments").insert({ user_id: userId, ...row }).select().single();
  if (error) throw error;
  return data;
}

export async function updateInvestment(id, row) {
  const { data, error } = await supabase.from("investments").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvestment(id) {
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw error;
}

/* ============ PRESUPUESTO ============ */
export async function fetchBudget(userId) {
  const { data, error } = await supabase.from("budget").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertBudget(userId, row) {
  const { data, error } = await supabase.from("budget").upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() }).select().single();
  if (error) throw error;
  return data;
}