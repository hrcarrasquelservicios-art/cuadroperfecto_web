#!/usr/bin/env python3
import json
import os
import sys
import argparse
import re
from datetime import datetime

# Configuración de rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JORNADAS_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "jornadas.json"))
ACTORS_PATH = os.path.normpath(os.path.join(BASE_DIR, "actors_db.json"))
LOG_PATH = os.path.normpath(os.path.join(BASE_DIR, "learning_log.json"))

def load_json(path, default):
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error cargando {path}: {e}")
    return default

def save_json(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"✅ Guardado con éxito en {path}")
    except Exception as e:
        print(f"❌ Error guardando {path}: {e}")

def normalize_name(name):
    if not name:
        return ""
    # Conversión básica a minúsculas, remover acentos y espacios extra
    n = name.lower().strip()
    replacements = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'ñ': 'n', 'ü': 'u'
    }
    for k, v in replacements.items():
        n = n.replace(k, v)
    return n

def process_single_race(hipodromo, carrera, ganador_nombre, ganador_jinete, ganador_preparador, dividendo, jornadas, actors, logs):
    # Buscar la jornada más reciente del hipódromo especificado
    jornada_actual = None
    for j in reversed(jornadas):
        if j.get("hipodromo", "").lower() == hipodromo.lower():
            jornada_actual = j
            break
            
    if not jornada_actual:
        print(f"⚠️ No se encontró ninguna jornada registrada para el hipódromo {hipodromo}")
        return False
        
    carrera_data = None
    es_valida = False
    
    # Buscar en líneas fijas
    if "lineas_fijas" in jornada_actual:
        for lf in jornada_actual["lineas_fijas"]:
            if lf.get("numero", "").strip().lower() == carrera.strip().lower():
                carrera_data = lf
                break
                
    # Si no, buscar en válidas
    if not carrera_data and "validas" in jornada_actual:
        for v in jornada_actual["validas"]:
            if v.get("carrera", "").strip().lower() == carrera.strip().lower():
                carrera_data = v
                es_valida = True
                break
                
    if not carrera_data:
        print(f"⚠️ No se encontró la carrera {carrera} en la jornada {jornada_actual.get('fecha')}")
        carrera_data = {}

    # Analizar la predicción vs resultado
    top_pick = ""
    top_pts = 0.0
    alt_pick = ""
    alt_pts = 0.0
    is_bomba = False
    acierto = False
    desviacion = 0.0
    
    # Extraer picks según tipo de carrera
    if not es_valida and "top3" in carrera_data:
        top3 = carrera_data["top3"]
        if len(top3) > 0:
            top_pick = top3[0].get("nombre", "")
            top_pts = top3[0].get("pts", 0.0)
        if len(top3) > 1:
            alt_pick = top3[1].get("nombre", "")
            alt_pts = top3[1].get("pts", 0.0)
        is_bomba = any(h.get("icono") == "💣" for h in top3[:1])
    elif es_valida and "top" in carrera_data:
        top_pick = carrera_data["top"].get("nombre", "")
        top_pts = carrera_data["top"].get("pts", 0.0)
        is_bomba = carrera_data["top"].get("bomba", False)
        if "alt" in carrera_data:
            alt_pick = carrera_data["alt"].get("nombre", "")
            alt_pts = carrera_data["alt"].get("pts", 0.0)
            
    # Determinar acierto y desviación
    g_norm = normalize_name(ganador_nombre)
    top_norm = normalize_name(top_pick)
    alt_norm = normalize_name(alt_pick)
    
    if g_norm and top_norm and top_norm in g_norm:
        acierto = True
        desviacion = 0.0
        status_str = "HIT_TOP"
    elif g_norm and alt_norm and alt_norm in g_norm:
        acierto = True
        desviacion = round(max(0.0, top_pts - alt_pts), 2)
        status_str = "HIT_ALT"
    else:
        acierto = False
        desviacion = round(top_pts, 2)
        status_str = "MISS"
        
    detalles = (
        f"Acierto Primera Marca ({status_str})" if status_str == "HIT_TOP"
        else f"Acierto Marca Alternativa ({status_str}). Desviación: {desviacion} pts" if status_str == "HIT_ALT"
        else f"Fallo de pronóstico ({status_str}). Ganador: {ganador_nombre} no estaba en picks principales."
    )
    
    # Evitar duplicar el mismo log de carrera
    jornada_fecha = jornada_actual.get("fecha", datetime.now().strftime("%d-%m-%Y"))
    for l in logs:
        if l.get("date") == jornada_fecha and l.get("hipodromo") == hipodromo and l.get("carrera") == carrera:
            print(f"ℹ️ Ya existe un registro para {hipodromo} - {carrera} ({jornada_fecha}). Omitiendo log.")
            return False

    # Registrar en logs
    nuevo_log = {
        "date": jornada_fecha,
        "hipodromo": hipodromo,
        "carrera": carrera,
        "ganador": ganador_nombre.upper(),
        "jinete": ganador_jinete,
        "preparador": ganador_preparador,
        "top_pick": top_pick,
        "top_pts": top_pts,
        "alt_pick": alt_pick,
        "alt_pts": alt_pts,
        "acierto": acierto,
        "desviacion": desviacion,
        "bomba": is_bomba,
        "detalles": detalles
    }
    logs.append(nuevo_log)
    
    # Actualizar estadísticas en actors_db.json
    for category, actor_name in [("jockeys", ganador_jinete), ("trainers", ganador_preparador)]:
        if not actor_name or actor_name == "Desconocido":
            continue
        if actor_name not in actors[category]:
            actors[category][actor_name] = {"wins": 0, "losses": 0, "roi": 1.0, "trend": []}
        
        actor = actors[category][actor_name]
        actor["wins"] += 1
        total_races = actor["wins"] + actor["losses"]
        actor["roi"] = round((actor["wins"] * dividendo) / total_races, 2)
        
        win_rate = round(actor["wins"] / total_races, 2)
        actor["trend"].append(win_rate)
        if len(actor["trend"]) > 5:
            actor["trend"].pop(0)

    # Registrar derrotas de nuestros picks que no ganaron
    picks_horses = []
    if not es_valida and "top3" in carrera_data:
        picks_horses = carrera_data["top3"]
    elif es_valida:
        if "top" in carrera_data:
            picks_horses.append(carrera_data["top"])
        if "alt" in carrera_data:
            picks_horses.append(carrera_data["alt"])
            
    for pick in picks_horses:
        p_name = pick.get("nombre", "")
        if normalize_name(p_name) != g_norm:
            p_jinete = pick.get("jinete")
            p_preparador = pick.get("preparador")
            
            for category, actor_name in [("jockeys", p_jinete), ("trainers", p_preparador)]:
                if not actor_name or actor_name == "Desconocido":
                    continue
                if actor_name not in actors[category]:
                    actors[category][actor_name] = {"wins": 0, "losses": 0, "roi": 1.0, "trend": []}
                
                actor = actors[category][actor_name]
                actor["losses"] += 1
                total_races = actor["wins"] + actor["losses"]
                actor["roi"] = round((actor["wins"] * dividendo) / total_races, 2)
                
                win_rate = round(actor["wins"] / total_races, 2)
                actor["trend"].append(win_rate)
                if len(actor["trend"]) > 5:
                    actor["trend"].pop(0)

    print(f"🏁 Procesada carrera: {hipodromo} - {carrera}. Ganador: {ganador_nombre}. Acierto: {acierto}, Desv: {desviacion}")
    return True

def run_bulk(hipodromo, dividendo, jornadas, actors, logs):
    print(f"🔄 Iniciando procesamiento en lote para {hipodromo}...")
    
    # Buscar jornada más reciente
    jornada_actual = None
    for j in reversed(jornadas):
        if j.get("hipodromo", "").lower() == hipodromo.lower():
            jornada_actual = j
            break
            
    if not jornada_actual:
        print(f"❌ No se encontró ninguna jornada para {hipodromo}")
        return
        
    ganadores = jornada_actual.get("ganadores", [])
    if not ganadores:
        print(f"⚠️ La jornada no contiene ganadores registrados en el campo 'ganadores'.")
        return
        
    any_change = False
    for g in ganadores:
        carrera_raw = g.get("carrera", "")
        # Limpiar carrera (ej. C287 V1 -> C287)
        carrera = carrera_raw.split()[0].strip()
        
        ganador_raw = g.get("ganador", "")
        # Extraer dorsal y nombre: #7 TUSCAN GOLD ✅ [LÍNEA FIJA]
        m = re.match(r"#(\d+)\s+([^✅💣\[]+)", ganador_raw)
        if not m:
            print(f"  Omitiendo ganador con formato no válido: {ganador_raw}")
            continue
            
        dorsal = int(m.group(1))
        ganador_nombre = m.group(2).strip()
        
        # Buscar jinete y preparador del ganador en los picks de jornadas.json
        ganador_jinete = "Desconocido"
        ganador_preparador = "Desconocido"
        
        # Buscar en lineas_fijas
        for lf in jornada_actual.get("lineas_fijas", []):
            if lf.get("numero") == carrera:
                for t in lf.get("top3", []):
                    if t.get("dorsal") == dorsal:
                        ganador_jinete = t.get("jinete", "Desconocido")
                        ganador_preparador = t.get("preparador", "Desconocido")
                        break
        # Buscar en validas
        if ganador_jinete == "Desconocido":
            for v in jornada_actual.get("validas", []):
                if v.get("carrera") == carrera:
                    if v.get("top", {}).get("dorsal") == dorsal:
                        ganador_jinete = v["top"].get("jinete", "Desconocido")
                        ganador_preparador = v["top"].get("preparador", "Desconocido")
                    elif v.get("alt", {}).get("dorsal") == dorsal:
                        ganador_jinete = v["alt"].get("jinete", "Desconocido")
                        ganador_preparador = v["alt"].get("preparador", "Desconocido")
                        
        res = process_single_race(
            hipodromo=hipodromo,
            carrera=carrera,
            ganador_nombre=ganador_nombre,
            ganador_jinete=ganador_jinete,
            ganador_preparador=ganador_preparador,
            dividendo=dividendo,
            jornadas=jornadas,
            actors=actors,
            logs=logs
        )
        if res:
            any_change = True
            
    if any_change:
        save_json(LOG_PATH, logs)
        save_json(ACTORS_PATH, actors)
        print(f"✅ Procesamiento en lote completado para {hipodromo}.")
    else:
        print(f"ℹ️ No se requirieron actualizaciones nuevas.")

def main():
    parser = argparse.ArgumentParser(description="Feedback Loop post-carrera ZonaCaliente Pro")
    parser.add_argument("--hipodromo", required=True, help="La Rinconada / Valencia")
    parser.add_argument("--carrera", help="Código de carrera, ej: C7")
    parser.add_argument("--ganador", help="Nombre del ejemplar ganador")
    parser.add_argument("--jinete", help="Nombre del jinete del ganador")
    parser.add_argument("--preparador", help="Nombre del preparador del ganador")
    parser.add_argument("--dividendo", type=float, default=2.5, help="Dividendo pagado (por defecto 2.5)")
    parser.add_argument("--bulk", action="store_true", help="Procesa en lote todas las carreras con ganadores en la jornada más reciente")
    
    args = parser.parse_args()
    
    # 1. Cargar bases de datos
    jornadas = load_json(JORNADAS_PATH, [])
    actors = load_json(ACTORS_PATH, {"jockeys": {}, "trainers": {}})
    logs = load_json(LOG_PATH, [])
    
    if args.bulk:
        run_bulk(args.hipodromo, args.dividendo, jornadas, actors, logs)
    else:
        if not args.carrera or not args.ganador or not args.jinete or not args.preparador:
            print("❌ Error: Si no se especifica --bulk, los argumentos --carrera, --ganador, --jinete y --preparador son requeridos.")
            sys.exit(1)
            
        res = process_single_race(
            hipodromo=args.hipodromo,
            carrera=args.carrera,
            ganador_nombre=args.ganador,
            ganador_jinete=args.jinete,
            ganador_preparador=args.preparador,
            dividendo=args.dividendo,
            jornadas=jornadas,
            actors=actors,
            logs=logs
        )
        if res:
            save_json(LOG_PATH, logs)
            save_json(ACTORS_PATH, actors)

if __name__ == "__main__":
    main()
