import os
import json
from datetime import datetime
from datos import TAREAS, RECURSOS, TRANSITO, HORIZONTE, HOSPITALES
from modelo_rcpsp import heuristica_sgt_mlft, resolver_milp

def main():
    print("Corriendo modelo heurístico SGT-MLFT...")
    inicios_heu, makespan_heu = heuristica_sgt_mlft(TAREAS, RECURSOS, HORIZONTE)
    
    print("Corriendo modelo MILP (PuLP)...")
    inicios_milp, makespan_milp, status_milp = resolver_milp(TAREAS, RECURSOS, HORIZONTE)
    
    # Usar el resultado del MILP si fue óptimo, sino usar la heurística
    inicios = inicios_milp if status_milp == "Optimal" else inicios_heu
    makespan_final = makespan_milp if status_milp == "Optimal" else makespan_heu
    
    # Si ningún modelo pudo resolver (ej. no feasible o error heurística), salir
    if not inicios:
        print("No se pudo encontrar una solución factible.")
        return
        
    tarea_dict = {t["id"]: t for t in TAREAS}
    
    # Calcular calendario y perfil de recursos
    calendario = []
    perfil_recursos = {r: [0]*(HORIZONTE) for r in RECURSOS}
    
    for j, inicio in inicios.items():
        t_obj = tarea_dict[j]
        dur = t_obj["duracion"]
        fin = inicio + dur - 1
        
        # Perfil de uso
        for r, cant in t_obj["demanda"].items():
            if cant > 0:
                for d in range(inicio, fin + 1):
                    if d <= HORIZONTE:
                        perfil_recursos[r][d-1] += cant
                        
        calendario.append({
            "id": j,
            "hospital": t_obj["hospital"],
            "hospital_nombre": HOSPITALES[t_obj["hospital"]]["nombre"],
            "recurso": t_obj["recurso"],
            "duracion": dur,
            "inicio": inicio,
            "fin": fin,
            "holgura": 0,  # Se calcula después
            "critica": False, # Se calcula después
            "prioridad": t_obj["prioridad"],
            "ventana": t_obj["ventana"]
        })
        
    # Calcular ruta crítica y holguras
    # Para la ruta crítica en un RCPSP ya programado, la holgura (slack) 
    # se puede estimar comparando el fin con la ventana de fin o dependencias.
    # Una forma simple para este reporte: LF - EF
    # LF: min(LF sucesoras - transito) o ventana[1]
    
    LF = {}
    sucesoras_dict = {t["id"]: [] for t in TAREAS}
    for t in TAREAS:
        for p in t["predecesoras"]:
            sucesoras_dict[p].append(t["id"])
            
    ruta_critica = []
    
    # Backward pass
    # Ordenar calendario por fin descendente
    cal_dict = {c["id"]: c for c in calendario}
    
    def obtener_transito(h1, h2):
        import networkx as nx
        from modelo_rcpsp import obtener_transito_dias
        return obtener_transito_dias(h1, h2)

    for c in sorted(calendario, key=lambda x: x["fin"], reverse=True):
        j = c["id"]
        t_obj = tarea_dict[j]
        
        lf_min = t_obj["ventana"][1]
        for s in sucesoras_dict[j]:
            if s in inicios:
                transito = obtener_transito(t_obj["hospital"], tarea_dict[s]["hospital"])
                lf_min = min(lf_min, inicios[s] - 1 - transito)
                
        LF[j] = lf_min
        holgura = LF[j] - c["fin"]
        
        # Ajuste por seguridad: holgura no puede ser negativa si es factible, pero si lo es la ponemos a 0
        c["holgura"] = max(0, holgura)
        if c["holgura"] == 0:
            c["critica"] = True
            ruta_critica.append(j)
            
    ruta_critica.reverse()
    
    resumen_texto = f"El plan óptimo distribuye {len(TAREAS)} tareas en {makespan_final} días."
    
    # Crear estructura JSON
    resultado = {
        "meta": {
            "horizonte": HORIZONTE,
            "makespan_heuristica": makespan_heu,
            "makespan_milp": makespan_milp,
            "status_milp": status_milp,
            "generado_en": datetime.now().isoformat()
        },
        "hospitales": HOSPITALES,
        "arcos": [{"origen": o, "destino": d, "transito_h": t} for (o, d), t in TRANSITO.items()],
        "recursos_disponibles": RECURSOS,
        "calendario": calendario,
        "perfil_recursos": perfil_recursos,
        "ruta_critica": ruta_critica,
        "resumen_texto": resumen_texto
    }
    
    # Asegurar que existe el directorio
    out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "public")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "resultados.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
        
    print(f"Resultados exportados a {out_path}")

if __name__ == "__main__":
    main()
