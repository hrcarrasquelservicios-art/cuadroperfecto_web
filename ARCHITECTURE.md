# Zona Caliente Pro — arquitectura local

El sitio es estático y no despliega ni modifica producción desde este repositorio. `data/meetings.json` y `data/legacy-meetings.json` son los registros canónicos. Cada objeto contiene `meeting`, `race`, `horse` (dentro de `race.horses`), selecciones dentro de `ticket`, retiros, inteligencia, `result` estructurado y referencia a un `analysis_snapshot` independiente en `data/analysis-snapshots.json`.

Antes de publicar una reunión, se completa el gate y se fija un `analysis_snapshot` completo con SHA-256. Una publicación posterior debe crear un nuevo registro o snapshot, nunca sustituir el pre-carrera. `scripts/migrate-legacy.cjs` crea snapshots independientes para las jornadas publicadas. `data/jornadas.json` y los assets existentes son legado preservado y no se eliminan.

Los artes sociales viven en `assets/publications/` y se registran en su `manifest.json`; cada archivo recibe nombre inmutable y puede exponerse desde la URL HTTPS estática del sitio. GitHub Pages controla la política real de caché; el repositorio no promete un encabezado de caché. La UI no depende de esos artes.
