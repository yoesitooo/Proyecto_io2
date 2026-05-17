import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pregunta, resultado, config } = await request.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key no configurada. Añade GROQ_API_KEY en las variables de entorno de Vercel." },
        { status: 500 }
      );
    }

    if (!pregunta || !resultado) {
      return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
    }

    const tareasCriticas = resultado.calendario
      .filter(t => t.critica)
      .map(t => t.id)
      .join(", ");

    // ESTO ES LO QUE EVITA QUE LA IA ALUCINE:
    // Le inyectamos los resultados matemáticos exactos en el "System Prompt" invisible
    const contextoSistema = `
Eres un experto en Investigación de Operaciones y gestión hospitalaria.
Interpretas resultados de un modelo RCPSP (Resource-Constrained Project Scheduling Problem)
aplicado a la distribución de equipos médicos en hospitales de Bogotá.
La heurística usada es SGT-MLFT (Serial Generation Scheme, Minimum Late Finish Time).

RESULTADOS EXACTOS DEL MODELO (usa estrictamente estos datos, no inventes nada):
- Makespan (duración total): ${resultado.makespan} días
- Horizonte de planificación: ${config.horizonte} días
- Recursos disponibles: ventiladores=${config.recursos.ventilador}, rayos_x=${config.recursos.rayos_x}, monitores=${config.recursos.monitor}
- Tareas críticas (holgura 0): ${tareasCriticas || "ninguna"}
- Ruta crítica principal: ${(resultado.rutaCritica || []).join(" → ") || "no identificada"}

CALENDARIO COMPLETO (Tarea: Hospital | Recurso | inicio-fin | holgura | estado):
${resultado.calendario.map(t =>
  `${t.id}: ${t.hospitalNombre} | ${t.recurso} | días ${t.inicio}–${t.fin} | holgura: ${t.holgura} | ${t.critica ? "CRÍTICA" : "no crítica"}`
).join("\n")}

PERFIL DE RECURSOS (unidades en uso, días 1..${config.horizonte}):
Ventiladores: [${(resultado.perfilRecursos.ventilador || []).join(", ")}]
Rayos X:      [${(resultado.perfilRecursos.rayos_x || []).join(", ")}]
Monitores:    [${(resultado.perfilRecursos.monitor || []).join(", ")}]

Reglas de respuesta:
1. Responde en español.
2. Sé directo y usa SÓLO los datos concretos provistos en este contexto.
3. Máximo 3 párrafos.
4. Si el usuario hace una pregunta matemática, básate estrictamente en las métricas listadas arriba.
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Modelo gratuito, rápido y súper inteligente
        temperature: 0.1, // Temperatura súper baja para que NO alucine y sea analítico
        messages: [
          { role: "system", content: contextoSistema },
          { role: "user", content: pregunta }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      return NextResponse.json({ error: `Error de la API: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const respuesta = data.choices[0].message.content;
    return NextResponse.json({ respuesta });

  } catch (error) {
    console.error("Error en /api/agente:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
