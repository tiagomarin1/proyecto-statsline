# VISION.md — StatsLine

## Problema

Los directores técnicos, los directores deportivos o managers y los dirigentes de clubes de fútbol chicos y medianos fichan jugadores sin poder comparar objetivamente el rendimiento de los candidatos. Cuando necesitan reforzar una posición, cuentan solo con la recomendación de un contacto o con lo que un ojeador vio en uno o dos partidos. Eso genera un riesgo alto de fichajes fallidos, con impacto económico directo sobre el club.

Según la encuesta del equipo (166 respuestas), el **91%** decide fichajes con métodos informales: observación directa, recomendaciones de contactos, videos de terceros o pruebas en el club. Solo el **9%** usa software de datos. Las herramientas profesionales (Wyscout, InStat, Opta) están pensadas para clubes de élite, son caras y requieren un analista dedicado.

## Usuarios objetivo

Clubes de 2ª y 3ª división, ligas regionales y fútbol formativo, sin departamento de análisis de datos. Dentro del club, los usuarios son estos tres roles:

| Rol | Persona | Necesidad principal |
|---|---|---|
| Director técnico | Javier Ledesma, 47 años, DT de 3ª división | Comparar candidatos con datos objetivos y filtrar por perfil táctico |
| Director deportivo / Manager | Ricardo Molina, 39 años, 2ª división | Saber antes de ofertar si un jugador entra en el presupuesto |
| Dirigente / Scout | Alberto Ferreyra, 55 años, liga regional | Confirmar con datos lo que vio en la cancha, sin depender de un analista |

El detalle de cada persona está en `contexto/INVESTIGACION.md`.

## Propuesta de valor (Matriz ERIC)

| Eliminar | Reducir | Incrementar | Crear |
|---|---|---|---|
| Cobertura de ligas top | Cantidad de estadísticas y parámetros por jugador | Facilidad de uso para usuarios sin experiencia | Comparador cara a cara filtrando por presupuesto real |
| Métricas de tracking físico avanzado | Complejidad de la interfaz | Accesibilidad del precio | Cobertura profunda de categorías regionales y amateurs (visión; en el MVP está limitada a lo que trae la API) |
| | | Objetividad de la decisión de fichaje | Recomendación de candidatos según presupuesto |
| | | Cobertura de la franja alta de las ligas inferiores | |

## Alcance del MVP v1 (Demo Day 9/11, 2do parcial)

El recorrido de la demo es: **registro e ingreso → búsqueda con filtros → ficha → comparador → lista de seguimiento**. Las features están en `CATALOGO_DE_FEATURES.md`.

Para el Demo Day tienen que estar listos:

- el MVP corriendo con **datos reales de API-Football**, no con los datos de demostración del prototipo;
- el recorrido completo de la demo;
- la evidencia de validación: pruebas de usabilidad. El objetivo es que al menos 8 de 10 usuarios completen el flujo perfil → filtro → comparación en menos de 5 minutos, con una facilidad de uso de 4/5 o más.

- **Ligas:** Liga Profesional, Primera Nacional, Primera B Metropolitana, Primera C, Primera D y Torneo Federal A.
- **Datos:** el alcance es el de API-Football. La única excepción es el valor de mercado, que sale de transfermarkt-datasets en EUR (ADR-0004).

## Objetivos medibles

Se miden en la fase de Evaluación, en las primeras dos semanas de diciembre.

| Objetivo | Métrica | Valor esperado |
|---|---|---|
| Que los clubes piloto sigan usando la plataforma | % de clubes piloto activos después del testeo | A definir por el equipo |
| Que el usuario quede conforme | Satisfacción en la encuesta post-uso (1 a 5) | A definir por el equipo |
| Que la decisión sea más rápida | Tiempo estimado ahorrado en la decisión de un fichaje | A definir por el equipo |

## No-objetivos (fuera del alcance del producto)

- **No** gestiona contratos, pagos ni negociaciones. Solo apoya la decisión.
- **No** cobra suscripciones en el MVP. Los planes de la home (Club USD 29, Club Plus USD 79, A medida) son una propuesta de precio a validar, no una feature.
- **No** usa métricas que API-Football no trae (distancia recorrida, centros, tracking físico).
- **No** permite que el club cargue estadísticas propias.
- **No** cubre sueldos: el presupuesto se compara solo contra el valor de mercado.
- **No** hace scraping de Transfermarkt ni de ningún otro sitio.
- **No** incluye en el MVP v1:
  - Score (R2);
  - jugadores similares (R2);
  - exportar PDF y reportes (R2);
  - recuperar contraseña (R2);
  - montos en pesos (R2);
  - datos del club (R3).

## Restricciones

- **Plazo:** cuatrimestre. Demo Day el 9/11/2026 y MVP v2 el 16/11/2026.
- **Equipo:** 6 integrantes, trabajo curricular sin costo de RR.HH.
- **API-Football plan Pro:** 7.500 pedidos por día, USD 19 por mes.
- **Datos del ascenso:** en Primera C, Primera D y Federal A la API trae solo minutos, posición y edad.
- **Posiciones:** la API devuelve solo 4 posiciones (arquero, defensor, mediocampista, delantero). El prototipo usa 10 y hay que ajustarlo.
- **Valor de mercado:** el dataset está congelado al 6/7/2026 y falta verificar su cobertura en el ascenso.

## Equipo

| Integrante | Rol |
|---|---|
| Almeida | Product Owner |
| Villalba | Analista funcional |
| Camargo | UX |
| Garrido | Frontend |
| Cilento | Backend |
| Marin | Backend y datos |

Backlog y sprints: Trello, tablero "ScoutIAndo - Seminario de Integración Profesional" (https://trello.com/b/r9whF8Jq). Cada historia del tablero tiene su ID en `CATALOGO_DE_FEATURES.md`.

## Nombre

El producto se llama **StatsLine** (decidido el 27/10/2026). Antes se llamaba ScoutIAndo: el prototipo v1 y el tablero de Trello conservan el nombre viejo.
