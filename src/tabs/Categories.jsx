/**
 * tabs/Categories.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * CRUD simple de categorías. Su `name` es lo que se usa para filtrar/
 * agrupar gastos en Transacciones y Panorama, y también lo que compara el
 * vínculo de metas (una categoría llamada igual que una meta no auto-liga
 * nada — el vínculo en esta versión es manual, ver tabs/Transactions.jsx).
 * Gestión de categorías asociadas estrictamente a un tipo de gasto.
 */
import React, { useState } from "react";
import { Plus, X, Pencil, Trash2, Tags } from "lucide-react";
import { C, TX_TYPES, TX_TYPE_LABEL } from "../theme.js";
import { Card, SectionTitle, Field, inputStyle, Btn, Empty } from "../components/ui.jsx";
import { addCategory, updateCategory, deleteCategory } from "../lib/data.js";

export default function CategoriesTab({ userId, categories, setCategories }) {
  const [form, setForm] = useState({ name: "", type: "gastos_esenciales" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Excluimos ingresos si no usas categorías para ellos
  const availableTypes = TX_TYPES.filter(t => t.id !== "ingreso");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.type) return;
    setSaving(true);
    try {
      const payload = { user_id: userId, name: form.name.trim(), type: form.type };
      if (editingId) {
        const updated = await updateCategory(editingId, payload);
        setCategories(categories.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await addCategory(userId, payload);
        setCategories([...categories, created]);
      }
      setForm({ name: "", type: "gastos_esenciales" });
      setEditingId(null);
    } catch (err) {
      alert("Error guardando categoría: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (c) => { 
    setForm({ name: c.name, type: c.type || "gastos_esenciales" }); 
    setEditingId(c.id); 
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar esta categoría? Esto no eliminará las transacciones previas, pero quedarán sin categoría.")) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      alert("Error eliminando: " + err.message);
    }
  };

  // Agrupar categorías por tipo para renderizarlas ordenadas
  const groupedCategories = availableTypes.reduce((acc, typeObj) => {
    acc[typeObj.id] = categories.filter(c => c.type === typeObj.id);
    return acc;
  }, {});

  return (
    <div>
      <SectionTitle eyebrow="Configuración" title="Categorías por Rubro" />
      <div className="mlc-grid-form-s">
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR CATEGORÍA" : "NUEVA CATEGORÍA"}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Alimentación" required disabled={saving} />
            </Field>
            
            <Field label="Pertenece al rubro">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} disabled={saving}>
                {availableTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingId ? "Guardar" : "Agregar")}</Btn>
              {editingId && <Btn type="button" variant="ghost" onClick={() => { setForm({ name: "", type: "gastos_esenciales" }); setEditingId(null); }} disabled={saving}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {availableTypes.map(typeObj => {
            const cats = groupedCategories[typeObj.id] || [];
            if (cats.length === 0) return null;
            
            return (
              <Card key={typeObj.id} style={{ overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, borderBottom: `1px solid ${C.line}`, background: C.paperAlt }}>
                  {typeObj.label.toUpperCase()}
                </div>
                {cats.sort((a, b) => a.name.localeCompare(b.name)).map((c, i) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: i === 0 ? "none" : `1px solid ${C.line}`, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: C.ink }}>
                      <Tags size={14} color={C.inkFaint} /> {c.name}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => edit(c)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
                      <button onClick={() => remove(c.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}