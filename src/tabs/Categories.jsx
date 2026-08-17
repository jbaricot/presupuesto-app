import React, { useState } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { C } from "../theme.js";
import { Card, SectionTitle, Field, inputStyle, Btn } from "../components/ui.jsx";
import { addCategory, updateCategory, deleteCategory } from "../lib/data.js";

export default function CategoriesTab({ userId, categories, setCategories }) {
  const [form, setForm] = useState({ name: "", desc: "" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateCategory(editingId, form);
        setCategories(categories.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await addCategory(userId, form);
        setCategories([...categories, created]);
      }
      setForm({ name: "", desc: "" });
      setEditingId(null);
    } catch (error) {
      alert("Error al guardar la categoría: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (c) => { setForm({ name: c.name, desc: c.description }); setEditingId(c.id); };

  const remove = async (id) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  return (
    <div>
      <SectionTitle eyebrow="Clasificación" title="Categorías" />
      <div className="mlc-grid-form-s">
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: 0.3, marginBottom: 12 }}>
            {editingId ? "EDITAR CATEGORÍA" : "NUEVA CATEGORÍA"}
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field label="Nombre">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={saving} />
            </Field>
            <Field label="Significado">
              <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "'Inter',sans-serif" }} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} disabled={saving} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn type="submit" disabled={saving}><Plus size={14} /> {saving ? "Guardando..." : (editingId ? "Guardar" : "Agregar")}</Btn>
              {editingId && <Btn variant="ghost" disabled={saving} onClick={() => { setForm({ name: "", desc: "" }); setEditingId(null); }}><X size={14} /> Cancelar</Btn>}
            </div>
          </form>
        </Card>
        <Card style={{ overflow: "hidden" }}>
          {categories.map((c, idx) => (
            <div key={c.id} className="mlc-row-cat" style={{ padding: "12px 16px", borderTop: idx === 0 ? "none" : `1px solid ${C.line}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{c.description}</div>
              </div>
              <button onClick={() => edit(c)} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", color: C.inkFaint }}><Pencil size={14} /></button>
              <button onClick={() => remove(c.id)} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", color: C.coral }}><Trash2 size={14} /></button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}