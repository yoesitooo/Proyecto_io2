import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "La API key de Anthropic no está configurada en el servidor." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { pregunta, resultados } = body;

    if (!pregunta || !resultados) {
      return NextResponse.json(
        { error: "Faltan parámetros (pregunta o resultados)." },
        { status: 400 }
      );
    }

    const systemPrompt = `
Eres un experto en Investigación de Operaciones y gestión hospitalaria.
Se te proporciona el resultado de un modelo matemático (RCPSP) que distribuye recursos médicos
en una red de hospitales minimizando el makespan (tiempo total).
El usuario te hará preguntas sobre estos resultados.

RESULTADOS DEL MODELO:
${JSON.stringify(resultados, null, 2)}

INSTRUCCIONES:
- Responde siempre en español.
- Sé conciso, máximo 3 párrafos.
- Usa datos concretos del JSON provisto (makespan, recursos, hospitales, holguras).
- Tu respuesta debe evidenciar que proviene de una IA analizando resultados de un modelo matemático.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          { role: "user", content: pregunta }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Error from Anthropic:", err);
      return NextResponse.json(
        { error: "Error al comunicarse con la API de Anthropic." },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Asumimos que la respuesta viene en data.content[0].text
    const respuesta = data.content[0].text;

    return NextResponse.json({ respuesta });

  } catch (error) {
    console.error("Error en API route:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
