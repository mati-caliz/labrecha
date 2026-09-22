# Cómo se calcula la brecha

Mostrar la discrepancia entre mediciones **es** la feature del producto. Hay dos formas de
armarla y una sola regla de oro sobre la magnitud.

## Curadas y automáticas

Las **curadas** (`web/src/lib/gaps.ts`) enfrentan indicadores *distintos* que tiene sentido
comparar: blue contra oficial, inflación esperada contra medida. Las define una persona.

Las **automáticas** (`GET /gaps`) salen solas de los datos: todo `indicator_code` que tenga dos o
más `source` **declarando la misma `meta.unit`**, comparadas en la última fecha en que las dos
midieron. Una unidad distinta, o una fuente sin unidad declarada, queda **fuera del ranking**
—comparar millones contra unidades inventa brechas de escala— y viaja en `excluded_sources` con
el motivo, para que la exclusión sea visible y no un silencio.

## La magnitud: pp cuando es porcentaje

**Todo lo que rankea usa la misma magnitud**: `_gap_magnitude` en la API,
`computeGap`/`automaticGapMagnitude` en la web. Es **pp** (puntos porcentuales) cuando la unidad
es `%`, y brecha relativa cuando son niveles. El número que se ordena es el mismo que se muestra.

**Ojo con volver al cociente.** Dos porcentajes cerca de cero —un déficit de 0,1 % contra uno de
0,4 %— dan 300 % de "brecha" y coparían el ranking mostrando 0,30 pp al lado. El cociente entre
porcentajes no mide lo que parece.

`GET /gaps/{code}/history` recorre la serie entera y devuelve la brecha más ancha, la más angosta
y la última.

## Quién alimenta el ranking: los IPC provinciales

`connectors/cpi_jurisdictions` trae las ocho jurisdicciones que miden su propio IPC: CABA,
Córdoba, Mendoza, Neuquén, San Luis, Santa Fe, Tucumán y Chaco.

Publican **índices con bases distintas**, así que no se comparan niveles: se deriva la variación
mensual e interanual, que es independiente de la base, y se fecha a **fin de mes** para que caiga
en la misma fecha que la serie nacional de `argentinadatos`. Sin eso, las dos series nunca
coincidirían en una fecha y no habría brecha que mostrar.

La discrepancia que sale de ahí es de **cobertura geográfica** además de metodológica, y el
producto tiene que poder decirlo: `meta.geography` y `meta.agency` viajan en cada punto.

## Series cortadas por mandato

`GET /terms/{code}` corta cualquier serie por mandato presidencial
(`api-py/labrecha_api/government_terms.py`). Las tasas se acumulan **componiendo**
(`MONTHLY_RATE_INDICATORS`); los niveles comparan extremos. La respuesta dice qué método usó y la
UI lo explicita, porque sumar tasas y componerlas dan números distintos y el lector tiene derecho
a saber cuál está viendo.
