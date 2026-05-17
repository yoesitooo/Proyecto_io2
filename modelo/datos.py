# Nodos: 0=CRUE, 1=S.Bolivar, 2=Kennedy, 3=Suba,
#        4=Bosa, 5=Usme, 6=Fontibon, 7=Engativa

HOSPITALES = {
    0: {"nombre": "CRUE (Centro de Distribución)", "nivel": 0, "prioridad": 0},
    1: {"nombre": "Hospital Simón Bolívar",         "nivel": 3, "prioridad": 10},
    2: {"nombre": "Hospital de Kennedy",            "nivel": 3, "prioridad": 10},
    3: {"nombre": "Hospital de Suba",               "nivel": 2, "prioridad": 6},
    4: {"nombre": "Hospital de Bosa",               "nivel": 2, "prioridad": 6},
    5: {"nombre": "Hospital de Usme",               "nivel": 2, "prioridad": 6},
    6: {"nombre": "Hospital de Fontibón",           "nivel": 1, "prioridad": 3},
    7: {"nombre": "Hospital de Engativá",           "nivel": 1, "prioridad": 3},
}

# Tiempos de tránsito en horas (arcos del grafo)
TRANSITO = {
    (0, 1): 1.2, (0, 2): 1.5,
    (1, 3): 0.8, (1, 5): 1.0,
    (2, 4): 0.9, (2, 5): 1.1,
    (3, 6): 0.6, (4, 7): 0.7,
    (5, 6): 0.5, (5, 7): 0.5,
}

# Disponibilidad total de recursos
RECURSOS = {
    "ventilador": 6,
    "rayos_x":    4,
    "monitor":    8,
}

# Tareas: id, hospital_destino, recurso, duracion, demanda, ventana, prioridad
# demanda = {"ventilador": n, "rayos_x": n, "monitor": n}
TAREAS = [
    {"id": "j1",  "hospital": 1, "recurso": "ventilador", "duracion": 4,
     "demanda": {"ventilador": 2, "rayos_x": 0, "monitor": 0},
     "ventana": (1, 5),  "prioridad": 10, "predecesoras": []},

    {"id": "j2",  "hospital": 2, "recurso": "ventilador", "duracion": 3,
     "demanda": {"ventilador": 2, "rayos_x": 0, "monitor": 0},
     "ventana": (1, 6),  "prioridad": 10, "predecesoras": []},

    {"id": "j3",  "hospital": 1, "recurso": "monitor",    "duracion": 5,
     "demanda": {"ventilador": 0, "rayos_x": 0, "monitor": 3},
     "ventana": (2, 8),  "prioridad": 10, "predecesoras": []},

    {"id": "j4",  "hospital": 3, "recurso": "rayos_x",   "duracion": 3,
     "demanda": {"ventilador": 0, "rayos_x": 1, "monitor": 0},
     "ventana": (3, 9),  "prioridad": 6,  "predecesoras": []},

    {"id": "j5",  "hospital": 4, "recurso": "monitor",    "duracion": 4,
     "demanda": {"ventilador": 0, "rayos_x": 0, "monitor": 2},
     "ventana": (1, 7),  "prioridad": 6,  "predecesoras": []},

    {"id": "j6",  "hospital": 2, "recurso": "monitor",    "duracion": 3,
     "demanda": {"ventilador": 0, "rayos_x": 0, "monitor": 2},
     "ventana": (4, 10), "prioridad": 10, "predecesoras": []},

    {"id": "j7",  "hospital": 5, "recurso": "rayos_x",   "duracion": 2,
     "demanda": {"ventilador": 0, "rayos_x": 2, "monitor": 0},
     "ventana": (5, 11), "prioridad": 6,  "predecesoras": []},

    {"id": "j8",  "hospital": 6, "recurso": "ventilador", "duracion": 3,
     "demanda": {"ventilador": 1, "rayos_x": 0, "monitor": 0},
     "ventana": (6, 12), "prioridad": 3,  "predecesoras": ["j1"]},

    {"id": "j9",  "hospital": 7, "recurso": "monitor",    "duracion": 4,
     "demanda": {"ventilador": 0, "rayos_x": 0, "monitor": 2},
     "ventana": (7, 13), "prioridad": 3,  "predecesoras": ["j6"]},

    {"id": "j10", "hospital": 3, "recurso": "monitor",    "duracion": 3,
     "demanda": {"ventilador": 0, "rayos_x": 0, "monitor": 2},
     "ventana": (8, 14), "prioridad": 6,  "predecesoras": ["j3"]},
]

HORIZONTE = 14  # días
