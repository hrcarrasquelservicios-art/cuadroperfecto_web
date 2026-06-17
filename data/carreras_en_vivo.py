#!/usr/bin/env python3
"""
Generador de estado EN VIVO para la pagina web
Indica que carrera se esta corriendo y nuestros favoritos
Genera un JSON que la web puede leer via AJAX

Uso:
  python3 carreras_en_vivo.py [valencia|rinconada] [--watch]
"""

import json, os, sys, time
from datetime import datetime, date, timedelta

WEB_DATA_DIR = os.path.join(os.path.dirname(__file__))
OUTPUT_FILE = os.path.join(WEB_DATA_DIR, "live_status.json")

# Horarios de carreras
VALENCIA_20JUN = {
    "fecha": "2026-06-20",
    "hipodromo": "Valencia",
    "carreras": [
        ("C1", "13:05", "Línea Fija NO VÁLIDA", "MAGICAL SONG #4 (13.5 pts)"),
        ("C2", "13:30", "Línea Fija NO VÁLIDA", "UNSTOPPABLE #5 (13.5 pts)"),
        ("C3", "13:55", "Línea Fija NO VÁLIDA", "THE ISAAC #5 (13.0 pts)"),
        ("C4", "14:50", "V1 - 5y6", "CHATEAU LAFITE #4 (12.5 pts)"),
        ("C5", "15:15", "V2 - 5y6 💣", "LA SUPREMA #8 (14.0 pts)"),
        ("C6", "15:40", "V3 - 5y6", "PRECIOSA DOLORES #7 (13.5 pts)"),
        ("C7", "16:05", "V4 - 5y6 💣", "VERMELHO #7 (14.5 pts)"),
        ("C8", "16:30", "V5 - 5y6 💣 CLÁSICO", "TEMPLARIO #6 (14.0 pts)"),
        ("C9", "16:55", "V6 - 5y6", "ENDORA #5 (12.5 pts)"),
    ]
}

VALENCIA = {
    "fecha": "2026-06-13",
    "hipodromo": "Valencia",
    "carreras": [
        ("C1", "13:30", "Lineas Fijas", "TAPITAL #6 (13.5 pts)"),
        ("C2", "13:55", "Lineas Fijas", "STRENGTH MONSTER #4 (15 pts)"),
        ("C3", "14:50", "V1 - 5y6", "CASSIUSCLAY #6 (13.5 pts)"),
        ("C4", "15:15", "V2 - 5y6", "BELLA ANTONELLA #8 (15 pts)"),
        ("C5", "15:40", "V3 - 5y6", "GRAN CANELO #3 (17.5 pts)"),
        ("C6", "16:05", "V4 - 5y6", "LEGIONARIA #5 (15 pts)"),
        ("C7", "16:30", "V5 - 5y6", "STELLA CADENTE #3 (20 pts)"),
        ("C8", "16:55", "V6 - 5y6", "MI GUERRERO #2 (17 pts)"),
    ]
}

RINCONADA_21JUN = {
    "fecha": "2026-06-21",
    "hipodromo": "La Rinconada",
    "carreras": [
        ("C281", "13:00", "Línea Fija", "TUSCAN GOLD #7 (13.2 pts)"),
        ("C282", "13:25", "Línea Fija", "GRAN MANUEL #4 (13.8 pts)"),
        ("C283", "13:50", "Línea Fija", "COMANDANTE CAMILO #6 (13.9 pts)"),
        ("C284", "14:15", "Línea Fija", "DIOSA DEL SON #2 (13.2 pts)"),
        ("C285", "14:40", "Línea Fija 💣", "PRINCESA FINA #7 (14.6 pts)"),
        ("C286", "15:05", "Línea Fija", "ONLY IN AMERICA #7 (12.9 pts)"),
        ("C287", "15:30", "V1 - 5y6", "VALERIA TIME #9 (12.8 pts)"),
        ("C288", "15:55", "V2 - 5y6 ⚠️", "SEÑORA ISABEL #5 (10.2 pts)"),
        ("C289", "16:20", "V3 - 5y6", "CANCILLER #3 (13.1 pts)"),
        ("C290", "16:45", "V4 - 5y6", "EL TRUENO #2 (13.4 pts)"),
        ("C291", "17:10", "V5 - 5y6", "HONEY TIME #9 (12.7 pts)"),
        ("C292", "17:35", "V6 - 5y6", "CHOSEN FACTOR #10 (13.2 pts)"),
    ]
}

RINCONADA = {
    "fecha": "2026-06-14",
    "hipodromo": "La Rinconada",
    "carreras": [
        ("C1", "13:00", "Lineas Fijas", "MISS MORGAN #8 (13.5 pts)"),
        ("C2", "13:25", "", ""),
        ("C3", "13:50", "", ""),
        ("C4", "14:15", "", ""),
        ("C5", "14:40", "", ""),
        ("C6", "15:05", "", ""),
        ("C7", "15:30", "Lineas Fijas", "EKATI KING #4 (16.5 pts)"),
        ("C8", "15:55", "V1 - 5y6", "ASTUTO #1 (16.2 pts)"),
        ("C9", "16:20", "V2 - 5y6", "VIEJO PARRA #6 (13.8 pts)"),
        ("C10", "16:45", "V3 - 5y6", "HAYES BAY #5 (16.8 pts)"),
        ("C11", "17:10", "V4 - 5y6", "GRAN FERONIA #7 (14.5 pts)"),
        ("C12", "17:35", "V5 - 5y6", "CARORA'S DREAM #4 (14.8 pts)"),
        ("C13", "18:00", "V6 - 5y6", "BUNKER #3 (16.5 pts)"),
    ]
}

VENEZUELA_TZ_OFFSET = -4  # UTC-4

def ahora_venezuela():
    return datetime.utcnow() + timedelta(hours=VENEZUELA_TZ_OFFSET)

def determinar_carrera_actual(jornada):
    """Determina que carrera se esta corriendo ahora"""
    ahora = ahora_venezuela()
    dia_hoy = ahora.strftime("%Y-%m-%d")

    if jornada["fecha"] != dia_hoy:
        # No es el dia de esta jornada
        return {
            "activa": False,
            "hipodromo": jornada["hipodromo"],
            "mensaje": f"Proxima jornada: {jornada['fecha']}",
            "carrera_actual": None,
            "siguiente": jornada["carreras"][0][0] if jornada["carreras"] else None,
        }

    hora_actual = ahora.strftime("%H:%M")

    for i, (codigo, hora, tipo, favorito) in enumerate(jornada["carreras"]):
        if hora <= hora_actual:
            if i + 1 < len(jornada["carreras"]) and jornada["carreras"][i+1][1] <= hora_actual:
                continue
            return {
                "activa": True,
                "hipodromo": jornada["hipodromo"],
                "carrera_actual": codigo,
                "hora": hora,
                "tipo": tipo,
                "favorito": favorito,
                "siguiente": jornada["carreras"][i+1][0] if i + 1 < len(jornada["carreras"]) else None,
                "siguiente_hora": jornada["carreras"][i+1][1] if i + 1 < len(jornada["carreras"]) else None,
                "progreso": f"Carrera {i+1} de {len(jornada['carreras'])}",
            }

    # Ninguna ha empezado aun
    proxima = jornada["carreras"][0]
    return {
        "activa": False,
        "hipodromo": jornada["hipodromo"],
        "mensaje": f"Proxima carrera: {proxima[0]} a las {proxima[1]}",
        "carrera_actual": None,
        "siguiente": proxima[0],
        "siguiente_hora": proxima[1],
    }

def generar_live_status():
    """Genera el JSON de estado en vivo"""
    hoy = ahora_venezuela().strftime("%Y-%m-%d")

    jornadas = []
    if hoy == "2026-06-21":
        jornadas.append(RINCONADA_21JUN)
    elif hoy == "2026-06-20":
        jornadas.append(VALENCIA_20JUN)
    elif hoy == "2026-06-13":
        jornadas.append(VALENCIA)
    elif hoy == "2026-06-14":
        jornadas.append(RINCONADA)
    else:
        # Mostrar las proximas
        jornadas.append(RINCONADA_21JUN)

    status = {
        "timestamp": ahora_venezuela().isoformat(),
        "dia": hoy,
        "jornadas": [determinar_carrera_actual(j) for j in jornadas],
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(status, f, indent=2, ensure_ascii=False)

    return status

def generar_mensaje_telegram(status):
    """Genera mensaje para Telegram con estado actual"""
    partes = []
    for j in status["jornadas"]:
        if j["activa"]:
            partes.append(
                f"🔴 *EN VIVO* - {j['hipodromo']}\n"
                f"🏇 *{j['carrera_actual']}* - {j['hora']}\n"
                f"   {j['tipo']}\n"
                f"   🔥 Favorito: {j['favorito']}\n"
                f"   ⏱ {j['progreso']}\n"
                f"   ⏳ Siguiente: {j['siguiente']} ({j['siguiente_hora']})"
            )
        else:
            partes.append(
                f"⏳ {j['hipodromo']}: {j['mensaje']}"
            )

    msg = "\n\n".join(partes)
    msg += "\n\n📱 @LaRectaCaliente\n🌐 cuadroperfecto.com\n#EnVivo"
    return msg

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "once"

    if cmd == "once":
        status = generar_live_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))

    elif cmd == "watch":
        while True:
            status = generar_live_status()
            msg = generar_mensaje_telegram(status)
            print(f"🕐 {datetime.now().strftime('%H:%M:%S')} - Status actualizado")
            time.sleep(60)

    elif cmd == "tg":
        status = generar_live_status()
        msg = generar_mensaje_telegram(status)
        import requests
        TG_TOKEN = os.getenv("BOT_NEXUS_FLOW_TOKEN", "8938208177:AAHUgWV0B1Lua-W29zUhxmhYovxGidl3PDE")
        requests.post(f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage",
            json={"chat_id": "@LaRectaCaliente", "text": msg, "parse_mode": "Markdown"})
        print("✅ Mensaje enviado")
