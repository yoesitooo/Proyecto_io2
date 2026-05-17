"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  TAREAS_DEFAULT, RECURSOS_DEFAULT, HORIZONTE_DEFAULT,
  ARCOS_DEFAULT, HOSPITALES_DEFAULT,
} from "@/lib/datos";
import { resolverSGT } from "@/lib/modelo";
import { detectarCuelloBotella } from "@/lib/utils";

// Recharts solo en cliente (no SSR)
const BarChart     = dynamic(() => import("recharts").then(m => ({ default: m.BarChart })),     { ssr: false });
const Bar          = dynamic(() => import("recharts").then(m => ({ default: m.Bar })),          { ssr: false });
const XAxis        = dynamic(() => import("recharts").then(m => ({ default: m.XAxis })),        { ssr: false });
const YAxis        = dynamic(() => import("recharts").then(m => ({ default: m.YAxis })),        { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Tooltip      = dynamic(() => import("recharts").then(m => ({ default: m.Tooltip })),      { ssr: false });
const Legend       = dynamic(() => import("recharts").then(m => ({ default: m.Legend })),       { ssr: false });
const ReferenceLine = dynamic(() => import("recharts").then(m => ({ default: m.ReferenceLine })), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })), { ssr: false });

// ─── Paleta ────────────────────────────────────────────────────────────────
const COLOR = {
  ventilador: "#111111",
  rayos_x:    "#555555",
  monitor:    "#999999",
};

// ─── Componente principal ───────────────────────────────────────────────────
export default function Dashboard() {
  const [config, setConfig] = useState({
    recursos: { ...RECURSOS_DEFAULT },
    horizonte: HORIZONTE_DEFAULT,
  });
  const [resultado, setResultado]   = useState(null);
  const [cargando, setCargando]     = useState(false);
  const [historial, setHistorial]   = useState([]);
  const [pregunta, setPregunta]     = useState("");
  const [cargandoIA, setCargandoIA] = useState(false);
  const [errorIA, setErrorIA]       = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [historial]);

  // ── Ejecutar modelo ───────────────────────────────────────────────────────
  function ejecutar() {
    setCargando(true);
    setHistorial([]);
    setErrorIA(null);
    setTimeout(() => {
      try {
        const res = resolverSGT(TAREAS_DEFAULT, config.recursos, config.horizonte, ARCOS_DEFAULT);
        // Enriquecer con nombres de hospitales
        res.calendario = res.calendario.map(item => ({
          ...item,
          hospitalNombre: HOSPITALES_DEFAULT.find(h => h.id === item.hospital)?.nombre ?? `Hospital ${item.hospital}`,
        }));
        setResultado(res);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    }, 50); // cede el hilo para que React actualice el botón
  }

  // ── Preguntar al agente ───────────────────────────────────────────────────
  async function preguntar(texto) {
    const q = texto || pregunta;
    if (!q.trim() || cargandoIA || !resultado) return;
    setPregunta("");
    setCargandoIA(true);
    setErrorIA(null);
    setHistorial(h => [...h, { rol: "user", texto: q }]);
    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q, resultado, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al contactar el agente.");
      setHistorial(h => [...h, { rol: "agente", texto: data.respuesta }]);
    } catch (e) {
      setErrorIA(e.message);
    } finally {
      setCargandoIA(false);
    }
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  const cb = resultado ? detectarCuelloBotella(resultado.perfilRecursos, config.recursos) : null;

  const statusText = cargando
    ? "Calculando..."
    : resultado
    ? resultado.factible
      ? `Solución encontrada — Makespan: ${resultado.makespan} días`
      : "⚠ No se encontró solución factible"
    : "Sin calcular";

  const graficaData = resultado
    ? Array.from({ length: config.horizonte }, (_, i) => {
        const day = { dia: `D${i + 1}` };
        for (const r of Object.keys(config.recursos)) {
          day[r] = resultado.perfilRecursos[r]?.[i] ?? 0;
        }
        return day;
      })
    : [];

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', sans-serif", color: "#111" }}>

      {/* ── SECCIÓN 1: Header ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e5e5", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px" }}>
            Distribución de Recursos Hospitalarios
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#666", marginTop: 2 }}>
            Modelo RCPSP · Heurística SGT-MLFT · Red hospitalaria Bogotá
          </p>
        </div>
        <span style={{
          fontSize: 12, padding: "4px 12px", borderRadius: 20,
          background: resultado && resultado.factible ? "#f0fdf4" : resultado ? "#fef2f2" : "#f5f5f5",
          color:      resultado && resultado.factible ? "#166534" : resultado ? "#991b1b" : "#555",
          border:     `1px solid ${resultado && resultado.factible ? "#bbf7d0" : resultado ? "#fecaca" : "#e5e5e5"}`,
          fontWeight: 500,
        }}>
          {statusText}
        </span>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── SECCIÓN 2: Configuración ── */}
        <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: 24, marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 14, fontWeight: 600, color: "#111", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Parámetros del modelo
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            {/* Recursos */}
            {Object.entries(config.recursos).map(([key, val]) => (
              <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "#666", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {key.replace("_", " ")}
                </span>
                <input
                  type="number" min={1} max={20} value={val}
                  onChange={e => setConfig(c => ({ ...c, recursos: { ...c.recursos, [key]: Number(e.target.value) } }))}
                  style={{ width: 72, padding: "6px 8px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 14, fontFamily: "inherit", color: "#111", background: "#fafafa", outline: "none" }}
                />
              </label>
            ))}
            {/* Horizonte */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#666", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Horizonte (días)
              </span>
              <input
                type="number" min={7} max={30} value={config.horizonte}
                onChange={e => setConfig(c => ({ ...c, horizonte: Number(e.target.value) }))}
                style={{ width: 72, padding: "6px 8px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 14, fontFamily: "inherit", color: "#111", background: "#fafafa", outline: "none" }}
              />
            </label>
            {/* Botón */}
            <button
              onClick={ejecutar} disabled={cargando}
              style={{
                padding: "8px 24px", background: cargando ? "#333" : "#111", color: "#fff",
                border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: cargando ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "background 0.15s",
              }}
              onMouseEnter={e => { if (!cargando) e.target.style.background = "#333"; }}
              onMouseLeave={e => { if (!cargando) e.target.style.background = "#111"; }}
            >
              {cargando ? "Calculando…" : "Ejecutar modelo"}
            </button>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 11, color: "#888", lineHeight: 1.5 }}>
            El modelo aplica la heurística <strong>SGT-MLFT</strong> (Serial Generation Scheme con regla Minimum Late Finish Time)
            para el problema RCPSP. Corre completamente en el navegador, sin servidor.
          </p>
        </section>

        {/* ── SECCIÓN 3: Resultados ── */}
        {resultado && (
          <section style={{ marginBottom: 28 }}>

            {/* 3a. Métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Makespan",           value: `${resultado.makespan} días` },
                { label: "Tareas programadas", value: `${resultado.calendario.length} / ${TAREAS_DEFAULT.length}` },
                { label: "Ruta crítica",        value: `${resultado.calendario.filter(t => t.critica).length} tareas` },
                { label: "Cuello de botella",   value: cb ? `${cb.recurso.replace("_"," ")} (${cb.porcentaje.toFixed(0)}%)` : "—" },
              ].map(m => (
                <div key={m.label} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "14px 18px" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{m.label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#111" }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* 3b. Tabla de calendario */}
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0" }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>Calendario de asignaciones</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e5e5" }}>
                      {["Tarea", "Hospital", "Recurso", "Inicio", "Fin", "Holgura", "Estado"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.calendario.map((row, i) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 16px", fontWeight: 700 }}>{row.id}</td>
                        <td style={{ padding: "10px 16px", color: "#555", maxWidth: 200 }}>{row.hospitalNombre}</td>
                        <td style={{ padding: "10px 16px", textTransform: "capitalize" }}>{row.recurso.replace("_", " ")}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>{row.inicio}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600 }}>{row.fin}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>{row.holgura}</td>
                        <td style={{ padding: "10px 16px" }}>
                          {row.critica
                            ? <span style={{ fontWeight: 700, fontSize: 11, color: "#b91c1c" }}>Crítica</span>
                            : <span style={{ color: "#666", fontSize: 11 }}>Holgura: {row.holgura} días</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3c. Gráfico de perfil de recursos */}
            <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "20px 20px 8px" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "#111" }}>Perfil de uso de recursos por día</h2>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graficaData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#888" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderColor: "#e5e5e5", borderRadius: 6 }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    {Object.entries(config.recursos).map(([r, cap]) => (
                      <Bar key={r} dataKey={r} stackId="a" fill={COLOR[r] || "#aaa"} name={r.replace("_", " ")} />
                    ))}
                    {Object.entries(config.recursos).map(([r, cap]) => (
                      <ReferenceLine key={`ref-${r}`} y={cap} stroke="#cc0000" strokeDasharray="4 3" strokeOpacity={0.45} label={{ value: `${r.replace("_"," ")} máx`, fontSize: 10, fill: "#cc0000", opacity: 0.7 }} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* ── SECCIÓN 4: Agente IA ── */}
        {resultado && (
          <section style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111" }}>Consultar al Agente IA</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
                El agente analiza los resultados del modelo y responde en lenguaje natural.
              </p>
            </div>

            {/* Chips de sugerencias */}
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #f5f5f5" }}>
              {[
                "¿Cuál es el cuello de botella del plan actual?",
                "¿Qué tareas puedo retrasar sin afectar el makespan?",
                "¿Cómo mejoraría el plan si agrego un recurso más?",
              ].map(s => (
                <button key={s} onClick={() => preguntar(s)} disabled={cargandoIA}
                  style={{ fontSize: 12, padding: "5px 12px", border: "1px solid #e5e5e5", borderRadius: 20, background: "#fafafa", color: "#444", cursor: "pointer", fontFamily: "inherit", transition: "background 0.1s" }}
                  onMouseEnter={e => e.target.style.background = "#f0f0f0"}
                  onMouseLeave={e => e.target.style.background = "#fafafa"}
                >{s}</button>
              ))}
            </div>

            {/* Historial */}
            <div style={{ maxHeight: 360, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {historial.length === 0 && (
                <p style={{ color: "#bbb", fontSize: 13, textAlign: "center", margin: "24px 0" }}>
                  Escribe una pregunta o usa las sugerencias de arriba.
                </p>
              )}
              {historial.map((msg, i) => (
                <div key={i}>
                  {msg.rol === "user" ? (
                    <div style={{ background: "#f5f5f5", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#333" }}>
                      <strong style={{ fontSize: 11, color: "#999", display: "block", marginBottom: 4 }}>TÚ</strong>
                      {msg.texto}
                    </div>
                  ) : (
                    <div style={{ borderLeft: "3px solid #e5e5e5", paddingLeft: 14, fontSize: 13, color: "#333", lineHeight: 1.65, fontFamily: "monospace, monospace" }}>
                      <strong style={{ fontSize: 11, color: "#999", display: "block", marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>AGENTE IA</strong>
                      {msg.texto}
                    </div>
                  )}
                </div>
              ))}
              {cargandoIA && (
                <div style={{ color: "#aaa", fontSize: 13, fontStyle: "italic" }}>Analizando el modelo…</div>
              )}
              {errorIA && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#991b1b" }}>
                  ⚠ {errorIA}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
              <input
                type="text" value={pregunta}
                onChange={e => setPregunta(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") preguntar(); }}
                placeholder="Escribe tu pregunta sobre los resultados…"
                disabled={cargandoIA}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 6, fontSize: 13, fontFamily: "inherit", color: "#111", background: "#fafafa", outline: "none" }}
              />
              <button
                onClick={() => preguntar()} disabled={cargandoIA || !pregunta.trim()}
                style={{ padding: "8px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (cargandoIA || !pregunta.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (cargandoIA || !pregunta.trim()) ? 0.5 : 1 }}
              >
                Preguntar
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
