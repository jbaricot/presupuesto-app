/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Componente raíz. Responsabilidades:
 *   1. Autenticación: escucha la sesión de Supabase y muestra <Login/> si
 *      no hay usuario.
 *   2. Carga inicial: al haber sesión, trae categorías/transacciones/metas/
 *      aportes/inversiones/presupuesto UNA vez y los guarda en estado local
 *      (cada pestaña recibe su porción por props, nadie vuelve a pedirle
 *      datos a Supabase salvo para escribir).
 *   3. Ciclo de pago: calcula `payDay` (desde el presupuesto) e
 *      `incomeAnchors` (fechas reales de ingresos) una sola vez aquí y los
 *      pasa a quien los necesite — ver lib/payCycle.js para el porqué.
 *   4. Navegación entre pestañas.
 *
 * Todas las mutaciones (agregar/editar/borrar) ocurren dentro de cada
 * pestaña, que llama a lib/data.js y luego actualiza el estado que vive
 *   5. Gestión de cuenta (Cerrar sesión, Cambiar clave).
 */
import React, { useState, useEffect, useMemo } from "react";
import { LayoutDashboard, Receipt, Target, TrendingUp, Tags, SlidersHorizontal, Wallet, LogOut, Key, Loader2, X, Check } from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { C, FONTS, DEFAULT_CATEGORIES, DEFAULT_BUDGET } from "./theme.js";
import { currentPeriod, getIncomeAnchors } from "./lib/payCycle.js";
import Login from "./components/Login.jsx";
import Dashboard from "./tabs/Dashboard.jsx";
import TransactionsTab from "./tabs/Transactions.jsx";
import GoalsTab from "./tabs/Goals.jsx";
import InvestmentsTab from "./tabs/Investments.jsx";
import CategoriesTab from "./tabs/Categories.jsx";
import BudgetTab from "./tabs/Budget.jsx";
import { Card, inputStyle, Btn, Field } from "./components/ui.jsx";
import {
  fetchCategories, seedDefaultCategories, fetchTransactions, fetchGoals,
  fetchContributions, fetchInvestments, fetchBudget,
} from "./lib/data.js";

const NAV = [
  { id: "dashboard", label: "Panorama", icon: LayoutDashboard },
  { id: "transacciones", label: "Transacciones", icon: Receipt },
  { id: "metas", label: "Metas", icon: Target },
  { id: "inversiones", label: "Inversión", icon: TrendingUp },
  { id: "categorias", label: "Categorías", icon: Tags },
  { id: "presupuesto", label: "Presupuesto", icon: SlidersHorizontal },
];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [period, setPeriod] = useState(currentPeriod(1));
  const [periodInitialized, setPeriodInitialized] = useState(false);

  // Estados globales de datos
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);

  // Estados para el Modal de Cambio de Clave
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoadingData(true);
      let cats = await fetchCategories(userId);
      if (cats.length === 0) cats = await seedDefaultCategories(userId, DEFAULT_CATEGORIES);
      const [txs, gls, contribs, invs, bdg] = await Promise.all([
        fetchTransactions(userId), fetchGoals(userId), fetchContributions(userId),
        fetchInvestments(userId), fetchBudget(userId),
      ]);
      setCategories(cats);
      setTransactions(txs);
      setGoals(gls);
      setContributions(contribs);
      setInvestments(invs);
      const finalBudget = bdg || DEFAULT_BUDGET;
      setBudget(finalBudget);
      if (!periodInitialized) {
        setPeriod(currentPeriod(finalBudget.pay_day || 1));
        setPeriodInitialized(true);
      }
      setLoadingData(false);
    })();
  }, [userId]);

  const payDay = budget.pay_day || 1;
  const incomeAnchors = useMemo(() => getIncomeAnchors(transactions), [transactions]);

  const signOut = () => supabase.auth.signOut();

  // Función para procesar el cambio de contraseña
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);

    if (error) {
      alert("Error al actualizar la clave: " + error.message);
    } else {
      alert("¡Tu contraseña ha sido actualizada con éxito!");
      setIsPasswordModalOpen(false);
      setNewPassword("");
    }
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif", color: C.inkSoft }}>
        <style>{FONTS}</style>
        <Loader2 size={20} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
        Verificando sesión…
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) return <Login />;

  if (loadingData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.paperAlt, fontFamily: "'Inter',sans-serif", color: C.inkSoft }}>
        <style>{FONTS}</style>
        <Loader2 size={20} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />
        Cargando tus finanzas…
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paperAlt, fontFamily: "'Inter',sans-serif" }}>
      <style>{FONTS}</style>
      <div className="mlc-shell" style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 20px 60px" }}>

        {/* Modal Cambio de Clave */}
        {isPasswordModalOpen && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999,
            display: "flex", justifyContent: "center", alignItems: "center", padding: 20,
            backdropFilter: "blur(2px)"
          }}>
            <Card style={{ width: "100%", maxWidth: 360, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                  <Key size={18} color={C.gold} /> Cambiar Contraseña
                </div>
                <button onClick={() => setIsPasswordModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Nueva Contraseña">
                  <input
                    type="password"
                    required
                    minLength={6}
                    style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={updatingPassword}
                  />
                </Field>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <Btn variant="ghost" onClick={() => setIsPasswordModalOpen(false)} disabled={updatingPassword}>Cancelar</Btn>
                  <Btn type="submit" disabled={updatingPassword}>
                    {updatingPassword ? "Actualizando..." : <><Check size={14} /> Guardar</>}
                  </Btn>
                </div>
              </form>
            </Card>
          </div>
        )}

        <div style={{ background: C.paper, borderRadius: 12, border: `1px solid ${C.line}`, overflow: "hidden" }}>
          {/* Header */}
          <div className="mlc-card-pad" style={{ padding: "22px 26px 0 26px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wallet size={18} color={C.white} />
                </div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 21, fontWeight: 600, color: C.ink }}>Mi Libro de Cuentas</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setIsPasswordModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: C.inkSoft, cursor: "pointer" }}>
                  <Key size={13} /> Cambiar clave
                </button>
                <button onClick={signOut} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: C.inkSoft, cursor: "pointer" }}>
                  <LogOut size={13} /> {session.user.email}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
              {NAV.map((n) => {
                const active = tab === n.id;
                const Icon = n.icon;
                return (
                  <button key={n.id} onClick={() => setTab(n.id)} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
                    background: active ? C.card : "transparent", border: "none",
                    borderTop: active ? `1px solid ${C.line}` : "1px solid transparent",
                    borderLeft: active ? `1px solid ${C.line}` : "1px solid transparent",
                    borderRight: active ? `1px solid ${C.line}` : "1px solid transparent",
                    borderRadius: "8px 8px 0 0", marginBottom: -1, cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13,
                    color: active ? C.ink : C.inkFaint, whiteSpace: "nowrap",
                  }}>
                    <Icon size={15} /> {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mlc-card-pad" style={{ padding: 26 }}>
            {tab === "dashboard" && (
              <Dashboard transactions={transactions} goals={goals} contributions={contributions} investments={investments} budget={budget} period={period} setPeriod={setPeriod} payDay={payDay} incomeAnchors={incomeAnchors} />
            )}
            {tab === "transacciones" && (
              <TransactionsTab
                userId={userId}
                transactions={transactions}
                setTransactions={setTransactions}
                categories={categories}
                period={period}
                setPeriod={setPeriod}
                payDay={payDay}
                incomeAnchors={incomeAnchors}
                goals={goals}
                contributions={contributions}
                setContributions={setContributions}
                investments={investments}
                setInvestments={setInvestments}
              />
            )}
            {tab === "metas" && (
              <GoalsTab
                userId={userId}
                goals={goals}
                setGoals={setGoals}
                contributions={contributions}
                setContributions={setContributions}
                period={period}
                setPeriod={setPeriod}
                payDay={payDay}
                incomeAnchors={incomeAnchors}
                transactions={transactions}
                setTransactions={setTransactions}
              />
            )}
            {tab === "inversiones" && (
              <InvestmentsTab
                userId={userId}
                investments={investments}
                setInvestments={setInvestments}
                payDay={payDay}
                incomeAnchors={incomeAnchors}
                period={period}
                setPeriod={setPeriod}
                transactions={transactions}
                setTransactions={setTransactions}
              />
            )}
            {tab === "categorias" && (
              <CategoriesTab userId={userId} categories={categories} setCategories={setCategories} />
            )}
            {tab === "presupuesto" && (
              <BudgetTab
                userId={userId}
                categories={categories}
                transactions={transactions}
                investments={investments}
                period={period}
                setPeriod={setPeriod}
                payDay={payDay}
                incomeAnchors={incomeAnchors}
                budget={budget}
                setBudget={setBudget}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}