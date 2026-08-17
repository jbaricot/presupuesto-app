/**
 * components/ContributionHistory.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Lista desplegable de aportes/retiros de una meta o sub-meta, con edición
 * y borrado en línea. Extraído de tabs/Goals.jsx porque el mismo bloque de
 * JSX se repetía casi idéntico para metas principales y sub-metas — vivir
 * en un solo lugar evita que un arreglo futuro se haga en una copia y se
 * olvide en la otra.
 *
 * Este componente es "tonto": no sabe nada de Supabase ni decide cuándo
 * sincronizar con transacciones. Todo el estado de edición y las acciones
 * (guardar, borrar) las controla el padre (Goals.jsx) y se le pasan por
 * props, siguiendo el mismo patrón que el resto de la app.
 */
import React from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Check, X } from "lucide-react";
import { C } from "../theme.js";
import { fmtCOP } from "../lib/helpers.js";
import { cyclePeriodLabelSmart } from "../lib/payCycle.js";
import { inputStyle } from "./ui.jsx";

export default function ContributionHistory({
  contribs,
  isExpanded,
  onToggleExpand,
  payDay,
  incomeAnchors,
  editingContribId,
  editContribValue,
  setEditContribValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onRemove,
  saving,
  compact = false, // true para el listado dentro de una sub-meta (más chico y sin fondo propio)
}) {
  const rowBg = compact ? C.white : C.paperAlt;
  const rowPadding = compact ? "6px 10px" : "8px 12px";
  const labelSize = compact ? 10.5 : 11;
  const valueSize = compact ? 12 : 13;
  const iconSize = compact ? 12 : 13;

  return (
    <div style={{ marginTop: compact ? 10 : 14, borderTop: compact ? "none" : `1px solid ${C.line}`, paddingTop: compact ? 8 : 10 }}>
      <button
        onClick={onToggleExpand}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: compact ? 11.5 : 12, color: C.inkSoft, fontWeight: 600, padding: 0 }}
      >
        {isExpanded ? <ChevronUp size={compact ? 13 : 14} /> : <ChevronDown size={compact ? 13 : 14} />}
        {isExpanded ? "Ocultar historial" : "Ver historial de aportes y retiros"}
      </button>

      {isExpanded && (
        <div style={{ marginTop: compact ? 8 : 12, display: "flex", flexDirection: "column", gap: compact ? 6 : 8 }}>
          {contribs.length === 0 ? (
            <div style={{ fontSize: compact ? 11 : 12, color: C.inkFaint }}>
              {compact ? "No hay movimientos en esta sub-meta." : "No hay movimientos registrados."}
            </div>
          ) : (
            contribs
              .slice()
              .sort((a, b) => b.period.localeCompare(a.period))
              .map((c) => {
                const isNegative = Number(c.value) < 0;
                const isEditing = editingContribId === c.id;
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: rowBg, padding: rowPadding, borderRadius: 6 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                        <input
                          type="number"
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: valueSize, flex: 1 }}
                          value={editContribValue}
                          onChange={(e) => setEditContribValue(e.target.value)}
                          disabled={saving}
                        />
                        <button onClick={() => onSaveEdit(c.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.sage }}><Check size={valueSize + 2} /></button>
                        <button onClick={onCancelEdit} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><X size={valueSize + 2} /></button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ fontSize: labelSize, color: C.inkFaint }}>
                            {cyclePeriodLabelSmart(c.period, payDay, incomeAnchors)} {isNegative ? "• (Retiro)" : "• (Aporte)"}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: valueSize, fontWeight: 600, color: isNegative ? C.coral : C.ink }}>
                            {isNegative ? `- ${fmtCOP(Math.abs(c.value))}` : `+ ${fmtCOP(c.value)}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: compact ? 8 : 10 }}>
                          <button onClick={() => onStartEdit(c)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint }}><Pencil size={iconSize} /></button>
                          <button onClick={() => onRemove(c.id)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", color: C.coral }}><Trash2 size={iconSize} /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
