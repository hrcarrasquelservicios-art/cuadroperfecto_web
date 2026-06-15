#!/usr/bin/env python3
"""
Genera una jornada en formato JSON para cuadroperfecto.com
Uso: python3 generar_jornada.py
"""
import json, os

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "jornadas.json")

def cargar_jornadas():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE) as f:
            return json.load(f)
    return []

def guardar_jornadas(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Guardado en {DATA_FILE}")

def crear_jornada():
    print("\n=== NUEVA JORNADA ===")
    j = {}
    j["id"] = input("ID (ej: lr-14-06-2026): ").strip()
    j["hipodromo"] = input("Hipódromo (ej: La Rinconada): ").strip()
    j["fecha"] = input("Fecha (ej: 14 de Junio 2026): ").strip()
    j["slug"] = input("Slug (ej: rinconada-14-06): ").strip()
    j["condiciones"] = input("Condiciones (optimas/medias/malas): ").strip()
    j["trabajos"] = input("Trabajos (completos/parciales/sin): ").strip()
    j["expectativa"] = input("Expectativa (ej: 50-60%): ").strip()
    j["efectividad_con_trabajos"] = input("Efectividad con trabajos (ej: 67%): ").strip()
    j["efectividad_sin_trabajos"] = input("Efectividad sin trabajos (ej: 9.1%): ").strip()

    # Líneas fijas
    j["lineas_fijas"] = []
    for i in range(2):
        print(f"\n--- Línea Fija C{i+1} ---")
        lf = {}
        lf["numero"] = f"C{i+1}"
        lf["hora"] = input("  Hora: ").strip()
        lf["distancia"] = input("  Distancia: ").strip()
        lf["categoria"] = input("  Categoría: ").strip()
        bt = input("  Bomb tag (dejar vacío si no): ").strip()
        lf["bomb_tag"] = bt if bt else None
        lf["top3"] = []
        for p in range(3):
            print(f"  Caballo {p+1}:")
            h = {}
            h["pos"] = p + 1
            h["dorsal"] = int(input("    Dorsal: "))
            h["nombre"] = input("    Nombre: ").strip()
            h["pts"] = float(input("    Puntos: "))
            ico = input("    Icono (🔥/💣 o vacío): ").strip()
            h["icono"] = ico if ico else ""
            lf["top3"].append(h)
        lf["clave"] = input("  Clave del análisis: ").strip()
        j["lineas_fijas"].append(lf)

    # Válidas 5Y6
    j["validas"] = []
    colores = ["v1", "v2", "v3", "v4", "v5", "v6"]
    n_validas = int(input("\nNúmero de válidas: "))
    for i in range(n_validas):
        print(f"\n--- Válida {i+1} ---")
        v = {}
        v["v"] = f"V{i+1}"
        v["carrera"] = input("  Carrera: ").strip()
        v["distancia"] = input("  Distancia: ").strip()
        v["hora"] = input("  Hora: ").strip()
        v["color"] = colores[i % 6]

        print("  Top pick:")
        v["top"] = {
            "nombre": input("    Nombre: ").strip(),
            "dorsal": int(input("    Dorsal: ")),
            "pts": float(input("    Puntos: ")),
            "bomba": input("    Es bomba? (s/n/mega): ").strip() or False
        }
        if v["top"]["bomba"] == "s": v["top"]["bomba"] = True
        elif v["top"]["bomba"] == "mega": v["top"]["bomba"] = "mega"

        print("  Alternativa:")
        v["alt"] = {
            "nombre": input("    Nombre: ").strip(),
            "dorsal": int(input("    Dorsal: ")),
            "pts": float(input("    Puntos: ")),
            "bomba": False
        }

        copa = input("  Tiene copa? (s/n): ").strip().lower()
        v["copa"] = copa == "s"
        feat = input("  Featured? (s/n): ").strip().lower()
        v["featured"] = feat == "s"
        j["validas"].append(v)

    # Jugada oficial
    j["jugada_oficial"] = input("\nJugada oficial (ej: 6/4 - 8/3 - ...): ").strip()
    j["jugada_combos"] = [c.strip() for c in j["jugada_oficial"].split("-")]
    j["jugada_info"] = input("Info jugada (ej: 64 combinaciones): ").strip()

    # Bombas
    j["bombas"] = []
    n_bombas = int(input("\nNúmero de bombas: "))
    for i in range(n_bombas):
        print(f"  Bomba {i+1}:")
        b = {
            "rank": i + 1,
            "nombre": input("    Nombre: ").strip(),
            "dorsal": int(input("    Dorsal: ")),
            "carrera": input("    Carrera: ").strip(),
            "hora": input("    Hora: ").strip(),
            "pts": float(input("    Puntos: ")),
            "nivel": input("    Nivel (normal/mega): ").strip()
        }
        j["bombas"].append(b)

    # Stats
    j["stats"] = {
        "carreras": int(input("\nTotal carreras: ")),
        "bombas": len(j["bombas"]),
        "efectividad_con_trabajos": j.get("efectividad_con_trabajos", ""),
        "efectividad_sin_trabajos": j.get("efectividad_sin_trabajos", "")
    }
    return j

if __name__ == "__main__":
    data = cargar_jornadas()
    j = crear_jornada()
    data.append(j)
    guardar_jornadas(data)
    print("\n🎯 Para ver los cambios, recarga la página de cuadroperfecto.com")
