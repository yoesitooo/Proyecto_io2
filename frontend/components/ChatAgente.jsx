"use client";

import { useState } from "react";
import { Send, Bot, User, AlertCircle, Loader2 } from "lucide-react";

export default function ChatAgente({ resultados }) {
  const [historial, setHistorial] = useState([]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const preguntasSugeridas = [
    "¿Cuál es el cuello de botella del plan?",
    "¿Qué pasa si agrego un ventilador más?",
    "¿Qué tareas puedo retrasar sin afectar el makespan?"
  ];

  const enviarPregunta = async (textoPregunta) => {
    if (!textoPregunta.trim() || cargando) return;

    const nuevaPregunta = { rol: "user", texto: textoPregunta };
    setHistorial(prev => [...prev, nuevaPregunta]);
    setPregunta("");
    setCargando(true);
    setError(null);

    try {
      const res = await fetch("/api/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: textoPregunta, resultados })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al conectar con el agente.");
      }

      setHistorial(prev => [...prev, { rol: "agente", texto: data.respuesta }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full bg-[#111] border border-[#333] rounded-xl flex flex-col h-[500px] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333] p-4 flex items-center gap-3">
        <div className="bg-[#333] p-2 rounded-lg">
          <Bot className="w-5 h-5 text-gray-200" />
        </div>
        <div>
          <h3 className="font-medium text-gray-100">Analista IA de Operaciones</h3>
          <p className="text-xs text-gray-400">Modelo matemático + Claude 3.5 Sonnet</p>
        </div>
      </div>

      {/* Historial */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {historial.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
            <Bot className="w-12 h-12 text-[#444]" />
            <p className="text-sm text-gray-400 max-w-sm">
              Pregúntame sobre los resultados del modelo de asignación de recursos. Analizaré el makespan, rutas críticas y capacidades.
            </p>
          </div>
        ) : (
          historial.map((msg, i) => (
            <div key={i} className={`flex gap-3 \${msg.rol === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 \${msg.rol === "user" ? "bg-[#333]" : "bg-[#222]"}`}>
                {msg.rol === "user" ? <User className="w-4 h-4 text-gray-300" /> : <Bot className="w-4 h-4 text-gray-300" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm \${msg.rol === "user" ? "bg-[#222] text-gray-200 rounded-tr-none" : "bg-[#1a1a1a] border border-[#333] text-gray-300 rounded-tl-none whitespace-pre-wrap"}`}>
                {msg.texto}
              </div>
            </div>
          ))
        )}
        
        {cargando && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full h-8 w-8 bg-[#222] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-gray-300" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-[#1a1a1a] border border-[#333] text-gray-400 rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Analizando el modelo...
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm border border-red-400/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1a1a1a] border-t border-[#333]">
        <div className="flex flex-wrap gap-2 mb-3">
          {preguntasSugeridas.map((sug, i) => (
            <button
              key={i}
              onClick={() => enviarPregunta(sug)}
              disabled={cargando}
              className="text-xs bg-[#222] hover:bg-[#333] text-gray-300 px-3 py-1.5 rounded-full transition-colors border border-[#444] disabled:opacity-50"
            >
              {sug}
            </button>
          ))}
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); enviarPregunta(pregunta); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Pregunta sobre los resultados..."
            disabled={cargando || !resultados}
            className="flex-1 bg-[#111] border border-[#333] text-gray-200 px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#555] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={cargando || !pregunta.trim() || !resultados}
            className="bg-[#333] hover:bg-[#444] text-white px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
