"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  TAREAS_DEFAULT, RECURSOS_DEFAULT, HORIZONTE_DEFAULT,
  ARCOS_DEFAULT, HOSPITALES_DEFAULT,
} from "@/lib/datos";
import { resolverSGT } from "@/lib/modelo";
import { detectarCuelloBotella } from "@/lib/utils";

// ── Recharts: UN SOLO dynamic import que agrupa todos los subcomponentes ──
const RecursosChart = dynamic(
  async () => {
    const R = await import("recharts");
    function Chart({ data, recursos, recursosDisp }) {
      const COLORES = { ventilador: "#111", rayos_x: "#666", monitor: "#aaa" };
      return (
        <R.ResponsiveContainer width="100%" height="100%">
          <R.BarChart data={data} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
            <R.CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <R.XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#888" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
            <R.YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <R.Tooltip contentStyle={{ fontSize: 12, borderColor: "#e5e5e5", borderRadius: 6 }} />
            <R.Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {Object.keys(recursos).map(r => (
              <R.Bar key={r} dataKey={r} stackId="a" fill={COLORES[r] || "#ccc"} name={r.replace("_", " ")} />
            ))}
            {Object.entries(recursosDisp).map(([r, cap]) => (
              <R.ReferenceLine key={`ref-${r}`} y={cap} stroke="#cc0000"
                strokeDasharray="4 3" strokeOpacity={0.5}
                label={{ value: `máx ${r.replace("_"," ")}`, fontSize: 9, fill: "#cc0000", opacity: 0.7 }} />
            ))}
          </R.BarChart>
        </R.ResponsiveContainer>
      );
    }
    return { default: Chart };
  },
  { ssr: false, loading: () => <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>Cargando gráfico…</div> }
);

// ── Estilos base ────────────────────────────────────────────────────────────
const S = {
  card:   { background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8 },
  label:  { fontSize: 11, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" },
  input:  { width: 70, padding: "6px 8px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 14, fontFamily: "inherit", color: "#111", background: "#fafafa", outline: "none" },
  btn:    { padding: "8px 22px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  h2:     { margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#111", textTransform: "uppercase", letterSpacing: "0.05em" },
  secHdr: { padding: "14px 20px", borderBottom: "1px solid #f0f0f0" },
};

export default function Dashboard() {
  const [config, setConfig] = useState({ recursos: { ...RECURSOS_DEFAULT }, horizonte: HORIZONTE_DEFAULT });
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando]   = useState(false);
  const [historial, setHistorial] = useState([]);
  const [pregunta, setPregunta]   = useState("");
  const [cargandoIA, setCargandoIA] = useState(false);
  const [errorIA, setErrorIA]     = useState(null);
  const chatRef = useRef(null);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [historial]);

  // ── Ejecutar modelo ───────────────────────────────────────────────────────
  function ejecutar() {
    setCargando(true);
    setHistorial([]); setErrorIA(null);
    setTimeout(() => {
      try {
        const res = resolverSGT(TAREAS_DEFAULT, config.recursos, config.horizonte, ARCOS_DEFAULT);
        res.calendario = res.calendario.map(t => ({
          ...t,
          hospitalNombre: HOSPITALES_DEFAULT.find(h => h.id === t.hospital)?.nombre ?? `H${t.hospital}`,
        }));
        setResultado(res);
      } catch (e) { console.error(e); }
      finally { setCargando(false); }
    }, 30);
  }

  // ── Agente IA ─────────────────────────────────────────────────────────────
  async function preguntar(txt) {
    const q = txt || pregunta;
    if (!q.trim() || cargandoIA || !resultado) return;
    setPregunta(""); setCargandoIA(true); setErrorIA(null);
    setHistorial(h => [...h, { rol: "user", texto: q }]);
    try {
      const res = await fetch("/api/agente", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q, resultado, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al contactar el agente.");
      setHistorial(h => [...h, { rol: "agente", texto: data.respuesta }]);
    } catch (e) { setErrorIA(e.message); }
    finally { setCargandoIA(false); }
  }

  // ── Datos derivados ───────────────────────────────────────────────────────
  const cb = resultado ? detectarCuelloBotella(resultado.perfilRecursos, config.recursos) : null;
  const criticas = resultado ? resultado.calendario.filter(t => t.critica) : [];
  const graficaData = resultado
    ? Array.from({ length: config.horizonte }, (_, i) => {
        const d = { dia: `D${i + 1}` };
        for (const r of Object.keys(config.recursos)) d[r] = resultado.perfilRecursos[r]?.[i] ?? 0;
        return d;
      })
    : [];

  const statusText = cargando ? "Calculando…"
    : resultado ? (resultado.factible ? `Solución encontrada — Makespan: ${resultado.makespan} días` : "⚠ Sin solución factible")
    : "Sin calcular";
  const statusColor = cargando ? "#555" : resultado?.factible ? "#166534" : resultado ? "#991b1b" : "#555";
  const statusBg    = cargando ? "#f5f5f5" : resultado?.factible ? "#f0fdf4" : resultado ? "#fef2f2" : "#f5f5f5";
  const statusBd    = cargando ? "#e5e5e5" : resultado?.factible ? "#bbf7d0" : resultado ? "#fecaca" : "#e5e5e5";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif", color: "#111" }}>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Distribución de Recursos Hospitalarios</h1>
          <p style={{ margin: 0, fontSize: 11, color: "#888", marginTop: 2 }}>RCPSP · Heurística SGT-MLFT · Red Bogotá</p>
        </div>
        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: statusBg, color: statusColor, border: `1px solid ${statusBd}`, fontWeight: 500 }}>
          {statusText}
        </span>
      </header>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 20px" }}>

        {/* ── SECCIÓN 1: Configuración ── */}
        <section style={{ ...S.card, padding: 22, marginBottom: 24 }}>
          <p style={S.label}>Parámetros del modelo</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", marginTop: 14 }}>
            {Object.entries(config.recursos).map(([key, val]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={S.label}>{key.replace("_", " ")}</span>
                <input type="number" min={1} max={20} value={val} style={S.input}
                  onChange={e => setConfig(c => ({ ...c, recursos: { ...c.recursos, [key]: Math.max(1, Number(e.target.value)) } }))} />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={S.label}>Horizonte (días)</span>
              <input type="number" min={7} max={30} value={config.horizonte} style={S.input}
                onChange={e => setConfig(c => ({ ...c, horizonte: Math.max(7, Number(e.target.value)) }))} />
            </label>
            <button onClick={ejecutar} disabled={cargando} style={{ ...S.btn, opacity: cargando ? 0.6 : 1 }}>
              {cargando ? "Calculando…" : "Ejecutar modelo"}
            </button>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 11, color: "#999", lineHeight: 1.5 }}>
            Heurística <strong>SGT-MLFT</strong> (Serial Generation Scheme — Minimum Late Finish Time) para el RCPSP.
            El modelo corre en el navegador, sin servidor.
          </p>
        </section>

        {resultado && (<>

          {/* ── SECCIÓN 2: Métricas ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Makespan",           val: `${resultado.makespan} días` },
              { label: "Tareas programadas", val: `${resultado.calendario.length} / ${TAREAS_DEFAULT.length}` },
              { label: "Tareas críticas",    val: `${criticas.length}` },
              { label: "Cuello de botella",  val: cb ? `${cb.recurso.replace("_"," ")} · ${cb.porcentaje.toFixed(0)}%` : "—" },
            ].map(m => (
              <div key={m.label} style={{ ...S.card, padding: "14px 18px" }}>
                <p style={{ ...S.label, margin: 0 }}>{m.label}</p>
                <p style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 700 }}>{m.val}</p>
              </div>
            ))}
          </div>

          {/* ── SECCIÓN 3: Diagrama de Gantt ── */}
          <section style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
            <div style={S.secHdr}><h2 style={{ ...S.h2, margin: 0 }}>Diagrama de Actividades (Gantt)</h2></div>
            <div style={{ overflowX: "auto", padding: "16px 20px" }}>
              {/* Cabecera de días */}
              <div style={{ display: "flex", marginLeft: 220, marginBottom: 4 }}>
                {Array.from({ length: config.horizonte }, (_, i) => (
                  <div key={i} style={{ minWidth: 30, textAlign: "center", fontSize: 10, color: "#aaa", fontWeight: 500 }}>
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Filas por tarea */}
              {resultado.calendario.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", marginBottom: 3 }}>
                  {/* Etiqueta */}
                  <div style={{ minWidth: 220, paddingRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 12, minWidth: 28 }}>{t.id}</span>
                    <span style={{ fontSize: 10, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{t.hospitalNombre}</span>
                    {t.critica && <span style={{ fontSize: 9, background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", flexShrink: 0 }}>C</span>}
                  </div>
                  {/* Celdas de días */}
                  <div style={{ display: "flex" }}>
                    {Array.from({ length: config.horizonte }, (_, i) => {
                      const day = i + 1;
                      const activo = day >= t.inicio && day <= t.fin;
                      return (
                        <div key={i} title={activo ? `${t.id} · ${t.recurso} · día ${day}` : ""}
                          style={{
                            minWidth: 30, height: 22,
                            background: activo ? (t.critica ? "#111" : "#555") : "transparent",
                            borderRight: "1px solid #f0f0f0",
                            borderRadius: day === t.inicio ? "3px 0 0 3px" : day === t.fin ? "0 3px 3px 0" : 0,
                          }} />
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Leyenda */}
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingLeft: 220, fontSize: 11, color: "#666" }}>
                <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#111", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Tarea crítica</span>
                <span><span style={{ display: "inline-block", width: 12, height: 12, background: "#555", borderRadius: 2, marginRight: 4, verticalAlign: "middle" }} />Tarea normal</span>
              </div>
            </div>
          </section>

          {/* ── SECCIÓN 4: Tabla de calendario ── */}
          <section style={{ ...S.card, marginBottom: 20, overflow: "hidden" }}>
            <div style={S.secHdr}><h2 style={{ ...S.h2, margin: 0 }}>Calendario de asignaciones</h2></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e5e5" }}>
                    {["Tarea", "Hospital", "Recurso", "Inicio", "Fin", "Holgura", "Estado"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 600, color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.calendario.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "9px 14px", fontWeight: 700 }}>{row.id}</td>
                      <td style={{ padding: "9px 14px", color: "#555", maxWidth: 220 }}>{row.hospitalNombre}</td>
                      <td style={{ padding: "9px 14px", textTransform: "capitalize" }}>{row.recurso.replace("_", " ")}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center" }}>{row.inicio}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center", fontWeight: 600 }}>{row.fin}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center" }}>{row.holgura}</td>
                      <td style={{ padding: "9px 14px" }}>
                        {row.critica
                          ? <strong style={{ color: "#b91c1c", fontSize: 11 }}>Crítica</strong>
                          : <span style={{ color: "#666", fontSize: 11 }}>Holgura: {row.holgura} días</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── SECCIÓN 5: Gráfico de perfil de recursos ── */}
          <section style={{ ...S.card, marginBottom: 24, overflow: "hidden" }}>
            <div style={S.secHdr}><h2 style={{ ...S.h2, margin: 0 }}>Perfil de uso de recursos por día</h2></div>
            <div style={{ padding: "8px 20px 16px", height: 300 }}>
              <RecursosChart data={graficaData} recursos={config.recursos} recursosDisp={config.recursos} />
            </div>
          </section>

          {/* ── SECCIÓN 6: Agente IA ── */}
          <section style={{ ...S.card, overflow: "hidden" }}>
            <div style={S.secHdr}>
              <h2 style={{ ...S.h2, margin: 0 }}>Consultar al Agente IA</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Analiza los resultados del modelo en lenguaje natural.</p>
            </div>
            {/* Chips */}
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #f5f5f5" }}>
              {["¿Cuál es el cuello de botella del plan?", "¿Qué tareas puedo retrasar sin afectar el makespan?", "¿Cómo mejora el plan si agrego un recurso más?"].map(s => (
                <button key={s} onClick={() => preguntar(s)} disabled={cargandoIA}
                  style={{ fontSize: 11, padding: "5px 12px", border: "1px solid #e5e5e5", borderRadius: 20, background: "#fafafa", color: "#444", cursor: "pointer", fontFamily: "inherit" }}>
                  {s}
                </button>
              ))}
            </div>
            {/* Historial */}
            <div style={{ maxHeight: 340, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              {historial.length === 0 && <p style={{ color: "#ccc", fontSize: 13, textAlign: "center", margin: "20px 0" }}>Usa las sugerencias o escribe una pregunta.</p>}
              {historial.map((msg, i) => (
                <div key={i}>
                  {msg.rol === "user"
                    ? <div style={{ background: "#f5f5f5", borderRadius: 6, padding: "9px 14px", fontSize: 13 }}>
                        <strong style={{ fontSize: 10, color: "#bbb", display: "block", marginBottom: 3 }}>TÚ</strong>
                        {msg.texto}
                      </div>
                    : <div style={{ borderLeft: "3px solid #e5e5e5", paddingLeft: 14, fontSize: 13, lineHeight: 1.7, fontFamily: "monospace" }}>
                        <strong style={{ fontSize: 10, color: "#bbb", display: "block", marginBottom: 3, fontFamily: "inherit" }}>AGENTE IA</strong>
                        {msg.texto}
                      </div>}
                </div>
              ))}
              {cargandoIA && <p style={{ color: "#bbb", fontSize: 13, fontStyle: "italic" }}>Analizando…</p>}
              {errorIA && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "9px 14px", fontSize: 12, color: "#991b1b" }}>⚠ {errorIA}</div>}
              <div ref={chatRef} />
            </div>
            {/* Input */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
              <input type="text" value={pregunta} onChange={e => setPregunta(e.target.value)}
                onKeyDown={e => e.key === "Enter" && preguntar()}
                placeholder="Escribe una pregunta sobre los resultados…" disabled={cargandoIA}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "#111", background: "#fafafa", outline: "none" }} />
              <button onClick={() => preguntar()} disabled={cargandoIA || !pregunta.trim()}
                style={{ ...S.btn, fontSize: 13, opacity: (cargandoIA || !pregunta.trim()) ? 0.4 : 1, cursor: (cargandoIA || !pregunta.trim()) ? "not-allowed" : "pointer" }}>
                Preguntar
              </button>
            </div>
          </section>
        </>)}
      </main>
    </div>
  );
}
