# Zona Caliente Pro — arquitectura local

El sitio es estático y no despliega ni modifica producción desde este repositorio. `data/meetings.json` es el registro canónico de reuniones. Cada objeto contiene `meeting`, `race`, `horse` (dentro de `race.horses`), selecciones dentro de `ticket`, retiros e inteligencia, `result` y `analysis_snapshot` (`published_snapshot_at`).

Antes de publicar una reunión, se completa el gate y se fija `published_snapshot_at`; una publicación posterior debe crear un nuevo registro o snapshot, nunca sustituir el pre-carrera. `data/jornadas.json` y los assets existentes son legado preservado y no se eliminan.

Los artes sociales viven en `assets/publications/` y se registran en su `manifest.json`; cada archivo recibe nombre inmutable y puede exponerse desde la URL HTTPS estática del sitio. La UI no depende de esos artes.
