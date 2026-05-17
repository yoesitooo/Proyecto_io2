import math
import networkx as nx
from datos import TAREAS, RECURSOS, TRANSITO, HORIZONTE, HOSPITALES

# Construir grafo para tiempos de tránsito
G = nx.Graph()
for (u, v), t in TRANSITO.items():
    G.add_edge(u, v, weight=t)
# Asegurar que todos los nodos estén
for n in HOSPITALES.keys():
    if n not in G.nodes:
        G.add_node(n)

def obtener_transito_dias(hospital_origen, hospital_destino):
    """Convierte horas de tránsito a días enteros (techo)."""
    if hospital_origen == hospital_destino:
        return 0
    try:
        horas = nx.shortest_path_length(G, source=hospital_origen, target=hospital_destino, weight='weight')
        return math.ceil(horas / 8)  # jornada laboral de 8h
    except nx.NetworkXNoPath:
        return 0

def heuristica_sgt_mlft(tareas, recursos_disponibles, horizonte):
    """
    Serial Generation Scheme con regla Minimum Late Finish Time (usando prioridad).
    """
    # 1. Construir mapa de predecesoras y sucesoras
    sucesoras = {t["id"]: [] for t in tareas}
    predecesoras = {t["id"]: t["predecesoras"] for t in tareas}
    tarea_dict = {t["id"]: t for t in tareas}
    
    for t in tareas:
        for p in t["predecesoras"]:
            sucesoras[p].append(t["id"])
            
    # Estado de tareas
    estado = {t["id"]: "pendiente" for t in tareas} # pendiente, activa, completada
    inicio_asignado = {}
    fin_asignado = {}
    
    # Perfiles de uso de recursos por día (1 a horizonte)
    uso_recursos = {r: [0]*(horizonte+2) for r in recursos_disponibles}
    
    # 2. Bucle principal por tiempo t
    makespan = 0
    for t in range(1, horizonte + 1):
        # Liberar completadas
        for j, est in estado.items():
            if est == "activa" and fin_asignado[j] == t:
                estado[j] = "completada"
                
        # Tareas elegibles: pendientes cuyas predecesoras están completadas
        elegibles = []
        for j, est in estado.items():
            if est == "pendiente":
                # Check predecesoras
                preds_ok = all(estado[p] == "completada" for p in predecesoras[j])
                # Check ventana de tiempo (t >= ventana_inicio)
                t_inicio_ventana = tarea_dict[j]["ventana"][0]
                
                if preds_ok:
                    # Check tiempos de tránsito desde predecesoras
                    tiempo_minimo_arranque = t_inicio_ventana
                    
                    # Si no tiene predecesoras, viene de CRUE (0)
                    if not predecesoras[j]:
                        dias_transito = obtener_transito_dias(0, tarea_dict[j]["hospital"])
                        tiempo_minimo_arranque = max(tiempo_minimo_arranque, 1 + dias_transito)
                    else:
                        for p in predecesoras[j]:
                            dias_transito = obtener_transito_dias(tarea_dict[p]["hospital"], tarea_dict[j]["hospital"])
                            tiempo_minimo_arranque = max(tiempo_minimo_arranque, fin_asignado[p] + dias_transito)
                    
                    if t >= tiempo_minimo_arranque:
                        elegibles.append(j)
                    
        # Ordenar elegibles por prioridad (mayor primero)
        elegibles.sort(key=lambda x: tarea_dict[x]["prioridad"], reverse=True)
        
        for j in elegibles:
            # Verificar factibilidad de recursos durante la duración de la tarea
            dur = tarea_dict[j]["duracion"]
            demanda = tarea_dict[j]["demanda"]
            
            factible = True
            if t + dur - 1 <= horizonte:
                for r, cant in demanda.items():
                    # Comprobar capacidad en [t, t+dur-1]
                    for d in range(t, t + dur):
                        if uso_recursos[r][d] + cant > recursos_disponibles[r]:
                            factible = False
                            break
                    if not factible: break
            else:
                factible = False
                
            if factible:
                # Asignar inicio
                inicio_asignado[j] = t
                fin_asignado[j] = t + dur
                estado[j] = "activa"
                makespan = max(makespan, fin_asignado[j] - 1)
                
                # Actualizar recursos en uso
                for r, cant in demanda.items():
                    for d in range(t, t + dur):
                        uso_recursos[r][d] += cant

    return inicio_asignado, makespan

def resolver_milp(tareas, recursos_disponibles, horizonte):
    try:
        import pulp
    except ImportError:
        return None, 0, "Not Installed"
        
    prob = pulp.LpProblem("RCPSP_Hospitales", pulp.LpMinimize)
    
    # Variables
    # x[j][t] = 1 si tarea j inicia en el periodo t
    x = {}
    for t_obj in tareas:
        j = t_obj["id"]
        v_inicio, v_fin = t_obj["ventana"]
        # Limitar dominio de t a la ventana permitida
        x[j] = {t: pulp.LpVariable(f"x_{j}_{t}", cat=pulp.LpBinary) 
                for t in range(1, horizonte + 1)}
                
    Cmax = pulp.LpVariable("Cmax", lowBound=0, cat=pulp.LpContinuous)
    
    # Función Objetivo
    prob += Cmax
    
    tarea_dict = {t["id"]: t for t in tareas}
    
    # Restricciones
    # 1. Unicidad de inicio
    for j in x:
        prob += pulp.lpSum(x[j][t] for t in x[j]) == 1, f"Unicidad_{j}"
        
    # 2. Ventanas de tiempo (no puede iniciar fuera de su ventana)
    for j, t_obj in tarea_dict.items():
        v_inicio, v_fin = t_obj["ventana"]
        for t in x[j]:
            if t < v_inicio or t + t_obj["duracion"] - 1 > v_fin:
                prob += x[j][t] == 0, f"Ventana_{j}_{t}"
                
    # 3. Precedencia y Tránsito
    for j, t_obj in tarea_dict.items():
        for p in t_obj["predecesoras"]:
            dias_transito = obtener_transito_dias(tarea_dict[p]["hospital"], t_obj["hospital"])
            
            # inicio_j >= fin_p + transito
            inicio_j = pulp.lpSum(t * x[j][t] for t in x[j])
            inicio_p = pulp.lpSum(t * x[p][t] for t in x[p])
            fin_p = inicio_p + tarea_dict[p]["duracion"]
            
            prob += inicio_j >= fin_p + dias_transito, f"Prec_{p}_{j}"
            
        # Si no tiene predecesoras, considerar tránsito desde CRUE
        if not t_obj["predecesoras"]:
            dias_transito = obtener_transito_dias(0, t_obj["hospital"])
            inicio_j = pulp.lpSum(t * x[j][t] for t in x[j])
            prob += inicio_j >= 1 + dias_transito, f"TransitoCRUE_{j}"
            
    # 4. Capacidad de recursos por período
    for t in range(1, horizonte + 1):
        for r, cap in recursos_disponibles.items():
            uso = []
            for j, t_obj in tarea_dict.items():
                demanda = t_obj["demanda"].get(r, 0)
                if demanda > 0:
                    dur = t_obj["duracion"]
                    # Tarea j usa recurso r en periodo t si inició en tau donde tau <= t y tau + dur - 1 >= t
                    for tau in x[j]:
                        if tau <= t <= tau + dur - 1:
                            uso.append(demanda * x[j][tau])
            if uso:
                prob += pulp.lpSum(uso) <= cap, f"Cap_{r}_{t}"
                
    # 5. Cmax
    for j, t_obj in tarea_dict.items():
        inicio_j = pulp.lpSum(t * x[j][t] for t in x[j])
        prob += Cmax >= inicio_j + t_obj["duracion"] - 1, f"Cmax_{j}"
        
    # Resolver
    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    
    status = pulp.LpStatus[prob.status]
    if status == "Optimal":
        inicios = {}
        for j in x:
            for t in x[j]:
                if pulp.value(x[j][t]) > 0.5:
                    inicios[j] = t
                    break
        return inicios, int(pulp.value(Cmax)), status
    else:
        return {}, 0, status
