# Experiencia Premium — Zona Caliente Pro

Estado: publicado en producción  
Fecha: 28 de septiembre de 2026  
Commit de implementación: `6323248`

## Objetivo

Convertir `cuadroperfecto.com` en una experiencia hípica premium, móvil y verificable. La interfaz debe transmitir emoción y familiaridad a los jugadores del 5Y6 sin aparentar que Cuadro Perfecto pertenece al Instituto Nacional de Hipódromos (INH).

Principio editorial:

> Análisis antes. Evidencia después.

La página siempre debe separar el pronóstico publicado, el cuadro recomendado, el boleto personal sellado, el resultado hípico y la relación entre costo, premio y rentabilidad.

## Identidad visual

La paleta toma referencias del entorno promocional hípico venezolano e INH, pero mantiene una identidad propia.

| Token | Color | Uso |
| --- | --- | --- |
| `--inh-purple` | `#4a145f` | Superficies principales y navegación |
| `--inh-plum` | `#24102f` | Fondos profundos |
| `--inh-magenta` | `#b51968` | Acentos, líneas y énfasis |
| `--inh-yellow` | `#ffd329` | Acción principal y 5Y6 |
| `--inh-lilac` | `#7b3b91` | Profundidad secundaria |

No se debe copiar el logotipo del INH ni usar lenguaje que sugiera afiliación institucional.

## Acceso al 5Y6 oficial

Todas las páginas incluyen una barra visible con el botón **Jugar 5Y6 en el INH ↗**.

Destino único autorizado: `https://apuestas.inh.gob.ve/`

Reglas:

- abrir en una pestaña nueva;
- usar `rel="noopener noreferrer"`;
- identificarlo como portal oficial externo;
- recordar que se deben verificar retiros, monto y condiciones;
- declarar que Cuadro Perfecto es independiente y no está afiliado al INH;
- no reproducir formularios de apuestas ni capturar información del boleto.

## Movimiento

La implementación usa JavaScript nativo y CSS. No requiere React, Three.js ni GSAP en esta fase.

Efectos actuales:

- entrada progresiva mediante `IntersectionObserver`;
- profundidad reactiva en la infografía para escritorio;
- iluminación del hero según la posición del puntero;
- pulso controlado en el acceso al 5Y6;
- reflejo animado sobre la superficie principal;
- transiciones suaves en tarjetas y botones.

`prefers-reduced-motion: reduce` elimina animaciones y transformaciones. La información permanece completa sin JavaScript y el movimiento nunca es necesario para utilizar la página.

## Rendimiento

La infografía original PNG pesa aproximadamente 2,1 MB. La versión WebP publicada pesa aproximadamente 172 KB:

`assets/publications/balance-26-27-septiembre-2026.webp`

El PNG original se conserva como archivo maestro. La portada declara dimensiones explícitas para reducir saltos visuales y usa `fetchpriority="high"` para el recurso principal.

## Archivos principales

- `index.html`: estructura estática, barra del INH y recursos versionados.
- `css/style.css`: identidad premium, adaptación móvil y movimiento visual.
- `js/motion.js`: mejora progresiva y movimiento accesible.
- `js/main.js`: conserva la portada estática después de cargar los datos.
- `scripts/build-pages.cjs`: fuente canónica de la portada generada.
- `package.json`: incluye `js/motion.js` en el control de sintaxis.

## Generación y despliegue

La publicación de jornadas nuevas debe seguir [WEEKLY_PUBLISHING_RUNBOOK.md](WEEKLY_PUBLISHING_RUNBOOK.md).

Antes de publicar:

```bash
npm test
npm run lint
npm run build
git diff --check
```

El sitio se publica desde la rama `main` mediante GitHub Pages. Después de cada despliegue se debe comprobar:

1. que el HTML nuevo aparece en `https://cuadroperfecto.com/`;
2. que el CSS versionado responde correctamente;
3. que `js/motion.js` responde como JavaScript;
4. que la imagen WebP responde como `image/webp`;
5. que el botón conduce exclusivamente al dominio oficial del INH;
6. que JavaScript no sustituye la portada por una jornada anterior.

## Caché

Los recursos modificados deben llevar una versión en la URL:

```html
<link rel="stylesheet" href="/css/style.css?v=inh-premium">
<script src="/js/motion.js?v=inh-premium" defer></script>
```

## Próxima fase

La siguiente evolución puede incorporar una escena Three.js ligera y opcional: pista abstracta en perspectiva, líneas de velocidad, partículas sutiles, carga diferida solo en equipos compatibles e imagen estática como respaldo.

No se recomienda migrar a React únicamente para añadir 3D. React Three Fiber tendría sentido cuando el producto requiera cuentas, constructor de boletos, comentarios o personalización persistente.

## Criterio de éxito

La experiencia debe ser emocionante sin parecer un casino, familiar para el jugador del 5Y6, rápida en teléfonos, transparente, accesible, verificable e independiente de marcas y organismos externos.
