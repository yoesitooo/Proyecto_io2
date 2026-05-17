export const HOSPITALES_DEFAULT = [
  { id: 0, nombre: "CRUE (Centro de Distribución)", nivel: 0, prioridad: 0 },
  { id: 1, nombre: "Hospital Simón Bolívar",  nivel: 3, prioridad: 10 },
  { id: 2, nombre: "Hospital de Kennedy",     nivel: 3, prioridad: 10 },
  { id: 3, nombre: "Hospital de Suba",        nivel: 2, prioridad: 6  },
  { id: 4, nombre: "Hospital de Bosa",        nivel: 2, prioridad: 6  },
  { id: 5, nombre: "Hospital de Usme",        nivel: 2, prioridad: 6  },
  { id: 6, nombre: "Hospital de Fontibón",    nivel: 1, prioridad: 3  },
  { id: 7, nombre: "Hospital de Engativá",    nivel: 1, prioridad: 3  },
];

export const ARCOS_DEFAULT = [
  { origen: 0, destino: 1, transito_h: 1.2 },
  { origen: 0, destino: 2, transito_h: 1.5 },
  { origen: 1, destino: 3, transito_h: 0.8 },
  { origen: 1, destino: 5, transito_h: 1.0 },
  { origen: 2, destino: 4, transito_h: 0.9 },
  { origen: 2, destino: 5, transito_h: 1.1 },
  { origen: 3, destino: 6, transito_h: 0.6 },
  { origen: 4, destino: 7, transito_h: 0.7 },
  { origen: 5, destino: 6, transito_h: 0.5 },
  { origen: 5, destino: 7, transito_h: 0.5 },
];

export const RECURSOS_DEFAULT = {
  ventilador: 6,
  rayos_x: 4,
  monitor: 8,
};

export const TAREAS_DEFAULT = [
  { id: "j1",  hospital: 1, recurso: "ventilador", duracion: 4,
    demanda: { ventilador: 2, rayos_x: 0, monitor: 0 },
    ventana: [1, 5],  prioridad: 10, predecesoras: [] },
  { id: "j2",  hospital: 2, recurso: "ventilador", duracion: 3,
    demanda: { ventilador: 2, rayos_x: 0, monitor: 0 },
    ventana: [1, 6],  prioridad: 10, predecesoras: [] },
  { id: "j3",  hospital: 1, recurso: "monitor",    duracion: 5,
    demanda: { ventilador: 0, rayos_x: 0, monitor: 3 },
    ventana: [2, 8],  prioridad: 10, predecesoras: [] },
  { id: "j4",  hospital: 3, recurso: "rayos_x",    duracion: 3,
    demanda: { ventilador: 0, rayos_x: 1, monitor: 0 },
    ventana: [3, 9],  prioridad: 6,  predecesoras: [] },
  { id: "j5",  hospital: 4, recurso: "monitor",    duracion: 4,
    demanda: { ventilador: 0, rayos_x: 0, monitor: 2 },
    ventana: [1, 7],  prioridad: 6,  predecesoras: [] },
  { id: "j6",  hospital: 2, recurso: "monitor",    duracion: 3,
    demanda: { ventilador: 0, rayos_x: 0, monitor: 2 },
    ventana: [4, 10], prioridad: 10, predecesoras: [] },
  { id: "j7",  hospital: 5, recurso: "rayos_x",    duracion: 2,
    demanda: { ventilador: 0, rayos_x: 2, monitor: 0 },
    ventana: [5, 11], prioridad: 6,  predecesoras: [] },
  { id: "j8",  hospital: 6, recurso: "ventilador", duracion: 3,
    demanda: { ventilador: 1, rayos_x: 0, monitor: 0 },
    ventana: [6, 12], prioridad: 3,  predecesoras: ["j1"] },
  { id: "j9",  hospital: 7, recurso: "monitor",    duracion: 4,
    demanda: { ventilador: 0, rayos_x: 0, monitor: 2 },
    ventana: [7, 13], prioridad: 3,  predecesoras: ["j6"] },
  { id: "j10", hospital: 3, recurso: "monitor",    duracion: 3,
    demanda: { ventilador: 0, rayos_x: 0, monitor: 2 },
    ventana: [8, 14], prioridad: 6,  predecesoras: ["j3"] },
];

export const HORIZONTE_DEFAULT = 14;
