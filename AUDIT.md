# Auditoría y entrega local — Zona Caliente Pro

## Base conservada
- Repositorio: https://github.com/hrcarrasquelservicios-art/cuadroperfecto_web
- Rama local aislada: redesign/jornada-cronologica. Sin push ni despliegue.
- HTML/CSS/JavaScript estáticos; npm, ESLint y pruebas Node existentes. Sin framework nuevo, sin servicios de pago añadidos.
- 2 jornadas actuales + 14 jornadas históricas. El archivo publicado en https://cuadroperfecto.com/data/jornadas.json coincide con el repositorio.
- Pronósticos, snapshots SHA-256, cuatro videos, infografías y documentos originales preservados.

## Causas encontradas
- `Intl.DateTimeFormat` recibía `month: 'long,'`: provoca RangeError. Se reprodujo el error con Node y se corrigió a `long`.
- `/valencia` y `/rinconada` no tenían rutas funcionales. El fallback `?ruta=` preservaba una ruta que el render no reconocía.
- La selección diaria usaba fecha UTC, no Caracas.
- La carga dependía de que también respondiera el archivo histórico; no tenía timeout ni reintento. El manejo de navegación podía omitir errores.
- Las páginas estáticas específicas seguían siendo pantallas de carga: ahora se generan 23 páginas accesibles directamente, con contenido HTML previo al JavaScript.

## Implementación
- Portada por calendario real: Valencia primero cuando corresponda, La Rinconada después; sin jornada de Valencia, se selecciona La Rinconada.
- Fichas, selecciones y cuadros; cálculo real de combinaciones. Valencia 32 / 108 / 648; La Rinconada 48 / 288 / 1728.
- Campos de jinete, entrenador, forma, Speed Rating y trabajos cuando existen; ausencia de datos explícita.
- Paleta propia dorado/amarillo, carbón y fondos claros. Sin logo, textos ni estructura del INH.
- Banner con las cuatro promociones existentes, selector de video real oficial de archivo, reproducción voluntaria y sin sonido automático.
- Reproductor YouTube de privacidad mejorada, fuente y salida al canal. Bloque separado para señal de cada jornada; no se afirma que una señal esté en vivo sin vigencia confirmada.
- CTA externo INH con target=_blank y noopener/noreferrer, independencia editorial y aviso +18/juego responsable.
- Historial por carrera: resultado confirmado, favorito previo y coincidencia cuando existe evidencia temporal. Diferencia entre cuadro acertado y boleto realmente sellado/premio cobrado.
- Importados 14 ganadores oficiales de La Rinconada del 13/09/2026, enlazados individualmente a @INHOficial. Los snapshots heredados no tienen fecha de congelación: no se atribuye un porcentaje de acierto pre-carrera no demostrable.
- Actualización de eventos cada 30 segundos sin reiniciar el video. Error de actualización conserva la última información cargada.
- Estadísticas de jinetes y entrenadores del archivo, por hipódromo/categoría/período; índice histórico de caballos. Enlaces a los cortes oficiales recientes, sin mezclar sus fechas con las tablas antiguas.

## Fuentes verificadas
- Archivo público: https://cuadroperfecto.com/data/jornadas.json
- INH y programación próxima: https://t.me/s/INHOficial
- Resultados definitivos R36: https://t.me/INHOficial/24357
- Video real C14 R36: https://t.me/INHOficial/24359 y https://youtu.be/T8xrWacjvsQ
- Estadísticas: https://t.me/INHOficial/24390
- Jinetes: https://t.me/INHOficial/24395
- Entrenadores: https://t.me/INHOficial/24397

## Módulo local de eventos
`npm run agent:ingest -- evento.json` valida fuente oficial revisada, jornada, carrera, integridad del snapshot, ganador y orden temporal. Registra eventos sin sobrescribir pronósticos. Repeticiones no duplican resultados; correcciones referencian el resultado anterior. Genera borradores para Telegram y Facebook en work/outbox. No publica, no despliega y no contiene credenciales.

Un evento contiene type (pre_race/result/broadcast), meeting_id, race_id, source_url, reviewed_by, reviewed_at y occurred_at. Los resultados requieren status=official y winner_numbers; race_started_at puede ser null si no se conoce, en cuyo caso no acredita acierto pre-carrera. Un aviso previo requiere confirmed_up_next=true. Una transmisión requiere url y puede tener status=scheduled/live/ended y valid_until.

No hay servicio continuo ni envío a redes activado. Esto requiere integrar una fuente de eventos fiable, permisos de publicación y aprobar despliegue. Windsor mostró Meta Ads y Threads; no publicación orgánica de la Fan Page ni Telegram. La existencia de enlaces públicos no concede permisos de escritura.

## Validación
- npm run lint: aprobado.
- npm test: aprobado, incluye regresiones de calendario, Caracas, combinaciones, snapshots, duplicados y correcciones.
- npm run build: aprobado; 23 rutas generadas y comprobaciones de sintaxis.
- Typecheck: no aplicable al proyecto actual; no hay TypeScript ni comando typecheck. `npm run typecheck --if-present` no ejecuta una comprobación de tipos.
- Navegador: portada Valencia, ruta heredada ?ruta=/valencia, La Rinconada con 14 carreras, cuadros 48/288/1728, historial, filtros estadísticos y menú móvil revisados. A 390 px, sin desbordamiento horizontal de la página; tablas y navegación tienen scroll local.
- YouTube: reproductor y controles cargaron para el clip oficial, sin errores JavaScript observados. No se validó una emisión en vivo futura.
- Un navegador automático independiente fue bloqueado al iniciarse; se usó el navegador integrado para las comprobaciones visuales.

## Pendientes reales
- Valencia tiene solo tres fichas publicadas y seis válidas pendientes de ficha; los cuadros sí existen. No se inventaron nóminas, horarios ni favoritos.
- Las tablas estadísticas estructuradas llegan a junio de 2026. Las publicaciones recientes están enlazadas, pero no hay una base completa actualizada de campañas de caballos, jinetes y entrenadores.
- No se encontró todavía la URL específica de las transmisiones del 19–20/09.
- Configurar acceso de escritura de Telegram y Fan Page, persistencia de eventos y ejecución continua; nada de esto se presenta como activo.
- Dos MP4 de 15 segundos son propuestas gráficas con material promocional existente. No son carreras reales ni montajes definitivos de imágenes de YouTube. El video real se integra mediante su reproductor oficial.

Se simuló HTTP 503 para el archivo principal en un servidor local de prueba: apareció el botón de reintento y la jornada se recuperó al pulsarlo.
