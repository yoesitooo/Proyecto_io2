/**
 * Detecta el recurso cuello de botella (mayor % de uso pico vs disponible)
 */
export function detectarCuelloBotella(perfilRecursos, recursosDisp) {
  let mejor = null;
  for (const [recurso, perfil] of Object.entries(perfilRecursos)) {
    const usoPico = Math.max(...perfil);
    const disponible = recursosDisp[recurso] || 1;
    const porcentaje = (usoPico / disponible) * 100;
    const diaPico = perfil.indexOf(usoPico) + 1;
    if (!mejor || porcentaje > mejor.porcentaje) {
      mejor = { recurso, diaPico, usoPico, disponible, porcentaje };
    }
  }
  return mejor;
}

/**
 * Genera el resumen en texto que el agente usa como contexto
 */
export function generarResumenTexto(resultado, recursosDisp, hospitales) {
  const { calendario, makespan, rutaCritica } = resultado;
  const cb = detectarCuelloBotella(resultado.perfilRecursos, recursosDisp);
  const criticas = calendario.filter(t => t.critica);
  const hospCubiertos = [...new Set(calendario.map(t => t.hospital))];

  return `El plan cubre ${calendario.length} tareas en ${makespan} días (makespan). ` +
    `Hay ${criticas.length} tareas en ruta crítica: ${criticas.map(t => t.id).join(', ')}. ` +
    `Ruta crítica principal: ${rutaCritica.join(' → ')}. ` +
    `El cuello de botella es el recurso "${cb?.recurso}" con uso pico de ` +
    `${cb?.usoPico}/${cb?.disponible} unidades (${cb?.porcentaje.toFixed(0)}%) en el día ${cb?.diaPico}. ` +
    `Hospitales cubiertos: ${hospCubiertos.length} de ${hospitales.length}.`;
}
