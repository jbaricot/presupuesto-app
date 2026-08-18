/**
 * components/ImportModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Importación masiva de movimientos desde un extracto de texto (.txt) de
 * Davivienda. Todo el parseo ocurre en el navegador (nada se sube a
 * ningún servidor): se lee el archivo, se extraen filas con una regex
 * hecha a la medida del formato de ese banco, y se muestran editables
 * antes de guardar. `onSaveBulk` (que recibe TransactionsTab) es quien
 * realmente inserta cada fila en Supabase, uno por uno o en lote.
 *
 * Si el usuario cambia de banco, la función `daviviendaRegex` es el único
 * lugar que habría que adaptar — el resto del componente es agnóstico al
 * formato de origen.
 */
import React, { useState, useRef } from "react";
import { X, Check, Trash2, Zap, FileText } from "lucide-react";
import { C, TX_TYPES } from "../theme.js";
import { Card, inputStyle, Btn, Field } from "./ui.jsx";

// Limpiador seguro para montos en formato de texto de Davivienda
const cleanCopNumber = (str) => {
    if (!str) return 0;
    let s = str.toString().replace(/\$|\s/g, '');
    if (/\.\d{3},\d{2}/.test(s) || /,\d{1,2}$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (/,\d{3}\.\d{2}/.test(s)) {
        s = s.replace(/,/g, '');
    }
    const numeric = Number(s.replace(/[^0-9.-]+/g, ""));
    return isNaN(numeric) ? 0 : numeric;
};

export default function ImportModal({ isOpen, onClose, categories, onSaveBulk }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statementYear, setStatementYear] = useState(String(new Date().getFullYear()));
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const parsedRows = [];

            // Expresión regular blindada para extraer la estructura exacta de Davivienda:
            // Grupo 1: Día (ej. 01)
            // Grupo 2: Mes (ej. 07)
            // Grupo 3: Monto numérico con separadores (ej. 19,960.00)
            // Grupo 4: Signo final (+ o -)
            // Grupo 5: Número de documento (ej. 4452)
            // Grupo 6: Descripción o comercio (ej. Compra TIENDAS ARA)
            const daviviendaRegex = /^\s*(\d{2})\s+(\d{2})\s+\$\s*([\d,.]+)([\+\-])\s+(\d+)\s{2,}(.+?)(?:\s{2,}.*)?$/;

            lines.forEach((line) => {
                const match = line.match(daviviendaRegex);
                if (match) {
                    const [, day, month, rawDigits, sign, doc, rawDesc] = match;

                    // El extracto de Davivienda no trae el año en cada línea, así que se usa
                    // el que el usuario indicó arriba (por defecto, el año actual). Si el
                    // extracto cruza fin de año (ej. diciembre-enero) hay que corregir a mano
                    // las filas del lado equivocado del corte antes de importar.
                    const formattedDate = `${statementYear}-${month}-${day}`;

                    const isIncome = sign === "+";
                    const numericValue = cleanCopNumber(rawDigits);

                    if (numericValue > 0) {
                        parsedRows.push({
                            _id: parsedRows.length,
                            date: formattedDate,
                            name: rawDesc.trim(),
                            type: isIncome ? "ingreso" : "variable",
                            category: "",
                            payment_method: "Débito",
                            value: numericValue,
                            paid: true
                        });
                    }
                }
            });

            setData(parsedRows);
        };

        reader.readAsText(file, "ISO-8859-1");
        // Permite volver a seleccionar el MISMO archivo si el usuario cancela y reintenta
        // (si no se limpia, el navegador no dispara onChange la segunda vez).
        e.target.value = "";
    };

    const updateRow = (id, field, value) => {
        setData(data.map(row => row._id === id ? { ...row, [field]: value } : row));
    };

    const removeRow = (id) => {
        setData(data.filter(row => row._id !== id));
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            const validRows = data.filter(r => r.name && r.value > 0);
            await onSaveBulk(validRows);
            setData([]);
            onClose();
        } catch (error) {
            alert("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999,
            display: "flex", justifyContent: "center", alignItems: "center", padding: 20,
            backdropFilter: "blur(2px)"
        }}>
            <Card style={{ width: "100%", maxWidth: 1000, maxHeight: "90vh", display: "flex", flexDirection: "column", padding: 24, overflow: "hidden", background: C.white }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Importar Extracto Davivienda (.txt)</div>
                        <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>Lectura optimizada para extractos de cuenta de ahorros y bolsillos.</div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><X size={24} /></button>
                </div>

                {data.length === 0 ? (
                    <>
                        <Field label="Año del extracto">
                            <input
                                type="number" min="2000" max="2100" style={{ ...inputStyle, maxWidth: 140 }}
                                value={statementYear} onChange={(e) => setStatementYear(e.target.value)}
                            />
                        </Field>
                        <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 4, marginBottom: 14 }}>
                            El extracto solo trae día y mes por línea — si cruza fin de año, corrige a mano las fechas del lado equivocado después de importar.
                        </div>
                        <div style={{ border: `2px dashed ${C.line}`, borderRadius: 12, padding: 50, textAlign: "center", cursor: "pointer", background: C.paperAlt }} onClick={() => fileInputRef.current.click()}>
                            <FileText size={36} color={C.gold} style={{ margin: "0 auto", marginBottom: 16 }} />
                            <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>Haz clic para seleccionar tu archivo .txt de Davivienda</div>
                            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>Se detectarán automáticamente fechas, comercios y valores.</div>
                            <input type="file" accept=".txt, .csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
                                ✨ ¡{data.length} movimientos de Davivienda detectados con éxito!
                            </div>
                            <Btn variant="ghost" disabled style={{ color: C.sage, borderColor: C.sageSoft }}>
                                <Zap size={14} /> Categorizar con IA (Próximamente)
                            </Btn>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1, paddingRight: 8 }}>
                            {data.map((row) => (
                                <div key={row._id} style={{ display: "grid", gridTemplateColumns: "130px 2fr 1fr 1fr 120px auto", gap: 10, alignItems: "center", background: C.paperAlt, padding: "8px 12px", borderRadius: 8, marginBottom: 8 }}>

                                    <input type="date" style={{ ...inputStyle, fontSize: 12, padding: "6px" }} value={row.date} onChange={(e) => updateRow(row._id, "date", e.target.value)} />
                                    <input type="text" style={{ ...inputStyle, fontSize: 12, padding: "6px" }} value={row.name} onChange={(e) => updateRow(row._id, "name", e.target.value)} placeholder="Descripción" />

                                    <select style={{ ...inputStyle, fontSize: 12, padding: "6px" }} value={row.type} onChange={(e) => updateRow(row._id, "type", e.target.value)}>
                                        {TX_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                    </select>

                                    <select style={{ ...inputStyle, fontSize: 12, padding: "6px" }} value={row.category} onChange={(e) => updateRow(row._id, "category", e.target.value)}>
                                        <option value="">Categoría...</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>

                                    <input type="number" style={{ ...inputStyle, fontSize: 12, padding: "6px", fontFamily: "'IBM Plex Mono',monospace" }} value={row.value} onChange={(e) => updateRow(row._id, "value", e.target.value)} />
                                    <button onClick={() => removeRow(row._id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral, padding: 4 }}><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
                            <Btn variant="ghost" onClick={() => setData([])}>Cancelar archivo</Btn>
                            <Btn onClick={handleSaveAll} disabled={loading}>
                                {loading ? "Guardando..." : <><Check size={16} /> Importar {data.length} movimientos</>}
                            </Btn>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}