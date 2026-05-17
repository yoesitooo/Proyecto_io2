import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { pregunta, resultado, config } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key no configurada. Agrega ANTHROPIC_API_KEY en las variables de entorno de Vercel." },
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

    const contextoSistema = `
Eres un experto en Investigación de Operaciones y gestión hospitalaria.
Interpretas resultados de un modelo RCPSP (Resource-Constrained Project Scheduling Problem)
aplicado a la distribución de equipos médicos en hospitales de Bogotá.
La heurística usada es SGT-MLFT (Serial Generation Scheme, Minimum Late Finish Time).

RESULTADOS ACTUALES DEL MODELO:
- Makespan (duración total): ${resultado.makespan} días
- Horizonte de planificación: ${config.horizonte} días
- Recursos disponibles: ventiladores=${config.recursos.ventilador}, rayos_x=${config.recursos.rayos_x}, monitores=${config.recursos.monitor}
- Tareas críticas (holgura 0): ${tareasCriticas || "ninguna"}
- Ruta crítica principal: ${(resultado.rutaCritica || []).join(" → ") || "no identificada"}

CALENDARIO COMPLETO:
${resultado.calendario.map(t =>
  `${t.id}: ${t.hospitalNombre} | ${t.recurso} | días ${t.inicio}–${t.fin} | holgura: ${t.holgura} | ${t.critica ? "CRÍTICA" : "no crítica"}`
).join("\n")}

PERFIL DE RECURSOS (unidades en uso, días 1..${config.horizonte}):
Ventiladores: [${(resultado.perfilRecursos.ventilador || []).join(", ")}]
Rayos X:      [${(resultado.perfilRecursos.rayos_x || []).join(", ")}]
Monitores:    [${(resultado.perfilRecursos.monitor || []).join(", ")}]

Responde en español. Sé directo y usa datos concretos del contexto.
Máximo 3 párrafos. No inventes datos que no estén aquí.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        system: contextoSistema,
        messages: [{ role: "user", content: pregunta }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return NextResponse.json({ error: `Error de la API: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const respuesta = data.content[0].text;
    return NextResponse.json({ respuesta });

  } catch (error) {
    console.error("Error en /api/agente:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
