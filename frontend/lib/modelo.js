/**
 * Heurística SGT-MLFT para RCPSP.
 * Corre completamente en el navegador — sin backend Python.
 */

/** Dijkstra para distancia mínima en horas entre hospitales */
function shortestPaths(arcos) {
  const nodes = new Set();
  const adj = {};
  for (const a of arcos) {
    nodes.add(a.origen); nodes.add(a.destino);
    if (!adj[a.origen]) adj[a.origen] = [];
    if (!adj[a.destino]) adj[a.destino] = [];
    adj[a.origen].push({ to: a.destino, w: a.transito_h });
    adj[a.destino].push({ to: a.origen, w: a.transito_h });
  }
  const sp = {};
  for (const src of nodes) {
    const dist = {};
    for (const n of nodes) dist[n] = Infinity;
    dist[src] = 0;
    const visited = new Set();
    const queue = [[0, src]];
    while (queue.length > 0) {
      queue.sort((a, b) => a[0] - b[0]);
      const [d, u] = queue.shift();
      if (visited.has(u)) continue;
      visited.add(u);
      for (const { to, w } of (adj[u] || [])) {
        if (d + w < dist[to]) {
          dist[to] = d + w;
          queue.push([d + w, to]);
        }
      }
    }
    sp[src] = dist;
  }
  return sp;
}

/**
 * @param {Array}  tareas         - tareas con id, hospital, duracion, demanda, ventana, predecesoras
 * @param {Object} recursosDisp   - { ventilador: N, rayos_x: N, monitor: N }
 * @param {number} horizonte      - días totales
 * @param {Array}  arcos          - arcos de la red con transito_h
 * @returns {{ calendario, makespan, perfilRecursos, rutaCritica, factible }}
 */
export function resolverSGT(tareas, recursosDisp, horizonte, arcos) {
  // 1. Tiempos de tránsito: ceil(horas / 8) días
  const sp = shortestPaths(arcos);
  function getTransito(h1, h2) {
    if (h1 === h2) return 0;
    const h = sp[h1]?.[h2];
    return (!h || h === Infinity) ? 0 : Math.ceil(h / 8);
  }

  const tareaMap = Object.fromEntries(tareas.map(t => [t.id, t]));
  const recursos = Object.keys(recursosDisp);

  // 2. Uso de recursos por día (1-indexed), horizonte+2 de buffer
  const uso = {};
  for (const r of recursos) uso[r] = new Array(horizonte + 2).fill(0);

  const programadas = {}; // id -> { inicio, fin }
  const pendientes = new Set(tareas.map(t => t.id));

  function esFeasible(demanda, inicio, duracion) {
    for (const r of recursos) {
      const cant = demanda[r] || 0;
      if (cant === 0) continue;
      for (let d = inicio; d < inicio + duracion; d++) {
        if (d > horizonte) return false;
        if ((uso[r][d] || 0) + cant > recursosDisp[r]) return false;
      }
    }
    return true;
  }

  function reservar(demanda, inicio, duracion) {
    for (const r of recursos) {
      const cant = demanda[r] || 0;
      if (cant === 0) continue;
      for (let d = inicio; d < inicio + duracion; d++) {
        uso[r][d] = (uso[r][d] || 0) + cant;
      }
    }
  }

  function getES(tarea) {
    let es = tarea.ventana[0];
    for (const predId of tarea.predecesoras) {
      const prog = programadas[predId];
      if (!prog) continue;
      const pred = tareaMap[predId];
      const transito = getTransito(pred.hospital, tarea.hospital);
      es = Math.max(es, prog.fin + 1 + transito);
    }
    return es;
  }

  // 3. SGT: iteramos hasta que no haya progreso o todo esté programado
  let progreso = true;
  while (pendientes.size > 0 && progreso) {
    progreso = false;

    // Elegibles: predecesoras ya programadas
    const elegibles = [...pendientes]
      .map(id => tareaMap[id])
      .filter(t => t.predecesoras.every(p => programadas[p]))
      .sort((a, b) => a.ventana[1] - b.ventana[1]); // MLFT: LF ascendente

    for (const tarea of elegibles) {
      const es = getES(tarea);
      const maxStart = Math.max(es, horizonte - tarea.duracion + 1);

      for (let s = es; s <= maxStart; s++) {
        if (esFeasible(tarea.demanda, s, tarea.duracion)) {
          reservar(tarea.demanda, s, tarea.duracion);
          programadas[tarea.id] = { inicio: s, fin: s + tarea.duracion - 1 };
          pendientes.delete(tarea.id);
          progreso = true;
          break;
        }
      }
    }
  }

  const factible = pendientes.size === 0;

  // 4. Construir calendario con holguras
  const calendario = tareas.map(t => {
    const prog = programadas[t.id];
    if (!prog) return null;
    const maxStart = t.ventana[1] - t.duracion + 1;
    const holgura = Math.max(0, maxStart - prog.inicio);
    return {
      id: t.id,
      hospital: t.hospital,
      hospitalNombre: "",
      recurso: t.recurso,
      duracion: t.duracion,
      inicio: prog.inicio,
      fin: prog.fin,
      holgura,
      critica: holgura === 0,
      prioridad: t.prioridad,
      ventana: t.ventana,
    };
  }).filter(Boolean);

  const makespan = calendario.length > 0 ? Math.max(...calendario.map(t => t.fin)) : 0;

  // 5. Perfil de recursos (días 1..horizonte)
  const perfilRecursos = {};
  for (const r of recursos) {
    perfilRecursos[r] = Array.from({ length: horizonte }, (_, i) => uso[r][i + 1] || 0);
  }

  // 6. Ruta crítica: cadena de tareas críticas conectadas por precedencia
  const criticasSet = new Set(calendario.filter(t => t.critica).map(t => t.id));
  const sucesoras = Object.fromEntries(tareas.map(t => [t.id, []]));
  for (const t of tareas) {
    for (const p of t.predecesoras) {
      if (sucesoras[p]) sucesoras[p].push(t.id);
    }
  }

  let rutaCritica = [];
  let bestChain = [];
  for (const inicio of criticasSet) {
    const pred = tareaMap[inicio];
    const hasCritPred = pred.predecesoras.some(p => criticasSet.has(p));
    if (hasCritPred) continue;
    // trazar hacia adelante
    const chain = [];
    let cur = inicio;
    while (cur) {
      chain.push(cur);
      cur = (sucesoras[cur] || []).find(s => criticasSet.has(s));
    }
    if (chain.length > bestChain.length) bestChain = chain;
  }
  rutaCritica = bestChain;

  return { calendario, makespan, perfilRecursos, rutaCritica, factible };
}
