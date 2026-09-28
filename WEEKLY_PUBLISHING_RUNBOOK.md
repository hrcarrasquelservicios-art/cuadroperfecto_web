# Protocolo semanal de jornadas

Este procedimiento evita que una jornada nueva sobrescriba la portada premium, mezcle pronósticos y resultados o se publique sin evidencia previa.

## Riesgos que controla

- fecha, hipódromo o número de reunión incorrectos;
- reutilización accidental de selecciones de otra jornada;
- cálculo incorrecto de combinaciones;
- publicación de resultados dentro del pronóstico previo;
- pérdida del snapshot que acredita qué se recomendó antes de correr;
- sustitución de la portada por JavaScript;
- cambios visibles localmente que nunca llegan a producción;
- caché que mantiene archivos anteriores;
- botón externo apuntando a un dominio distinto del INH.

## 1. Crear la jornada

Cada reunión nueva debe tener un registro independiente en `data/meetings.json` con:

- `id` único e inmutable;
- `slug` único;
- `track`: `Valencia` o `La Rinconada`;
- `meeting_number` confirmado;
- `date` en formato `YYYY-MM-DD`;
- estado explícito;
- carreras y códigos del programa correcto;
- tres niveles de cuadro cuando existan: presentado, recomendado y completo;
- valor de la unidad solamente cuando esté confirmado.

Nunca se debe modificar una jornada histórica para convertirla en la nueva.

## 2. Separar las fuentes

Los PDF, programas y revistas de cada hipódromo deben permanecer en carpetas diferentes. No se deben copiar nombres, números o resultados entre Valencia y La Rinconada sin cotejo explícito.

Antes de publicar se debe confirmar:

1. fecha;
2. hipódromo;
3. número de reunión;
4. cantidad y orden de carreras;
5. inicio de las seis válidas;
6. retiros y cambios disponibles;
7. fuente de cada dato sensible.

## 3. Congelar el pronóstico

La jornada debe tener un `analysis_snapshot_id` correspondiente en `data/analysis-snapshots.json`.

El snapshot debe:

- contener exactamente las selecciones publicadas;
- incluir `frozen_at` anterior a las carreras;
- conservar su hash de integridad;
- no incorporar resultados posteriores.

Sin snapshot válido, el sistema puede mostrar información, pero no debe acreditar aciertos.

## 4. Validar los cuadros

Para cada cuadro:

- debe haber seis patas completas;
- cada selección debe existir en la carrera correspondiente;
- no puede haber duplicados dentro de una pata;
- las combinaciones deben calcularse como el producto de las seis coberturas;
- el costo se muestra solo si el valor de la unidad es conocido;
- el boleto personal se presenta separado de los cuadros editoriales.

## 5. Probar antes del despliegue

Ejecutar siempre:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Después del build se debe confirmar que `index.html` todavía contiene:

- el balance premium;
- la sección “Análisis antes. Evidencia después”;
- la barra “Jugar 5Y6 en el INH”;
- `js/motion.js`;
- la infografía WebP.

## 6. Revisión humana

Antes del push, una persona debe aprobar:

- nombres y números de ejemplares;
- cuadros y combinaciones;
- mensaje principal;
- costo estimado;
- enlace oficial del INH;
- fecha y orden de publicación.

## 7. Publicar

El flujo autorizado es:

```bash
git add <archivos revisados>
git commit -m "feat: publicar jornada <hipódromo> <fecha>"
git push origin main
```

El agente local de `scripts/jornada-agent.cjs` no despliega ni publica por sí mismo. Solo registra eventos revisados y prepara borradores.

## 8. Verificar producción

No se considera terminada una publicación únicamente porque el push haya funcionado. Debe verificarse en `https://cuadroperfecto.com/`:

- HTML de la nueva jornada;
- enlaces internos;
- CSS y JavaScript versionados;
- imágenes con el tipo MIME correcto;
- navegación con y sin JavaScript;
- adaptación móvil;
- botón del INH abierto como enlace externo;
- ausencia de datos de la jornada anterior en el nuevo registro.

Si el HTML ya está publicado pero la página no lo muestra, revisar primero `js/main.js`: una renderización posterior puede estar sustituyendo el contenido estático.

## 9. Durante la jornada

Los eventos pre-carrera y resultados solo se incorporan con fuente oficial revisada. Las correcciones deben referenciar el evento previo; nunca se debe reescribir silenciosamente un resultado.

## 10. Después de la jornada

Preparar un post-mortem separado con:

- favoritos acertados;
- resultado de cada cuadro editorial;
- resultado del boleto personal, si existe evidencia;
- costo;
- premio;
- diferencia económica;
- lecciones para la jornada siguiente.

Un acierto no se debe presentar automáticamente como rentabilidad.
