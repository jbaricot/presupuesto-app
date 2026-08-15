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

/* ============ METAS ============ */
export async function fetchGoals(userId) {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId).order("created_at");
  if (error) throw error;
  return data;
}
export async function addGoal(userId, { name, total, dueDate }) {
  const { data, error } = await supabase.from("goals").insert({ user_id: userId, name, target_total: total, due_date: dueDate || null }).select().single();
  if (error) throw error;
  return data;
}
export async function deleteGoal(id) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchContributions(userId) {
  const { data, error } = await supabase.from("goal_contributions").select("*").eq("user_id", userId);
  if (error) throw error;
  return data;
}
export async function addContribution(userId, { goalId, period, value }) {
  const { data, error } = await supabase.from("goal_contributions").insert({ user_id: userId, goal_id: goalId, period, value }).select().single();
  if (error) throw error;
  return data;
}

/* ============ INVERSIONES ============ */
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
