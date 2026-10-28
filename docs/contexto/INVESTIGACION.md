# Investigación y contexto de producto

Resumen de la etapa de Design Thinking (Presentación del 14/09/2026, análisis de la encuesta y documento de MVP). Sirve para entender **por qué** existe cada feature. Las decisiones de producto viven en `VISION.md` y `REGLAS_DE_NEGOCIO.md`.

## Problema validado

> "¿Te imaginás invertir miles de dólares en un jugador que solo viste en un video de tres minutos?"

Los clubes chicos y medianos deciden fichajes por contactos, videos o lo que un scout alcanzó a ver en uno o dos partidos. Cuando se equivocan, pagan caro, en la cancha y en el bolsillo.

## Encuesta (166 respuestas)

### Perfil de la muestra

| Dato | Valor |
|---|---|
| Roles | DT 30,7%, scout 25,3%, manager 24,1%, dirigente 15,7% |
| Categorías medias y bajas (2ª, 3ª, regional, formativo) | 88,6% |
| Clubes que hacen hasta 7 fichajes por temporada | 74,7% |

### Cómo deciden hoy

| Dato | Valor |
|---|---|
| Deciden con métodos informales | 91,0% |
| Usan software de datos | 9,0% |
| No usan herramienta, pero les gustaría | 54,8% |
| La probaron y la dejaron | 19,9% |
| La usan seguido | 15,7% |
| No les interesa | 9,6% |

### Por qué no usan herramientas (P8)

| Motivo | % |
|---|---|
| Costo | 34,3% |
| No está adaptada a la liga local | 25,9% |
| Interfaz compleja | 22,3% |

### Mayor obstáculo al evaluar un candidato (P6)

| Obstáculo | % |
|---|---|
| Riesgo de fichaje fallido | 29,5% |
| Falta de métricas | 28,9% |
| Falta de tiempo | 21,7% |
| No saber si entra en el presupuesto | 19,9% |

### Satisfacción, utilidad y precio

| Dato | Valor |
|---|---|
| Satisfacción con los fichajes del último año | 2,98 / 5 |
| Utilidad percibida de la plataforma | 3,97 / 5 (74,1% marca 4 o 5) |
| Pagaría algo | 94% |
| No pagaría más de USD 100 por mes | 68,7% |
| Rango más elegido | USD 50-100 por mes (35,5%) |

### Funcionalidades cruciales (P11, selección múltiple)

| Funcionalidad | % |
|---|---|
| Filtro táctico | 71,7% |
| Comparador | 63,3% |
| Filtro por presupuesto | 60,8% |
| PDF | 58,4% |
| Jugadores similares | 58,4% |

**Conclusión del equipo:** se continúa con ajustes. El mensaje es "decidir más rápido y con datos, dentro del presupuesto real del club", sin prometer mejores fichajes. Conviene un precio escalonado, con una entrada por debajo de USD 100 por mes.

**Limitación:** hasta ahora hubo una sola entrevista en profundidad y ninguna observación directa.

## Personas

### Javier Ledesma — Director técnico (47 años, 3ª división, Buenos Aires)

- **Nivel tecnológico:** medio. Usa WhatsApp y YouTube.
- **Cita:** "Puedo ver que un jugador corre y pelea, pero no tengo cómo comparar eso con números reales frente a otros dos candidatos."
- **Necesita:** comparar candidatos con datos y filtrar por perfil táctico.
- **Insight:** no necesita más videos, necesita comparar con datos y filtrar rápido sin un analista.
- **Features que lo atienden:** BUS-001, BUS-003, CMP-001 y JUG-001.

### Ricardo Molina — Director deportivo / Manager (39 años, 2ª división, Rosario)

- **Nivel tecnológico:** medio-alto. Usa Excel y planillas propias.
- **Cita:** "El DT me pide un jugador ideal, pero mi trabajo es encontrar al mejor jugador que realmente podamos pagar."
- **Necesita:** cruzar rendimiento con presupuesto y filtrar por presupuesto.
- **Insight:** quiere saber antes de ofertar si el jugador entra en el presupuesto.
- **Features que lo atienden:** BUS-004, SEG-001 y la diferencia de valor de CMP-001.

### Alberto Ferreyra — Dirigente y scout (55 años, liga regional o formativo)

- **Nivel tecnológico:** bajo-medio. Anota en libreta y Excel.
- **Cita:** "Recorro canchas los fines de semana anotando en una libreta lo que veo, porque en el club no hay nadie más que lo haga."
- **Necesita:** confirmar con datos lo que vio, encontrar jugadores similares más baratos y armar reportes simples.
- **Insight:** la herramienta tiene que hacer el análisis por él.
- **Features que lo atienden:** JUG-001, y en R2 jugadores similares y PDF.

### Insight del Customer Journey

El mayor esfuerzo del club no está en decidir a quién fichar, sino en lograr que el DT, el manager y el dirigente junten y compartan a tiempo la misma información de rendimiento, mercado y presupuesto.

## Competencia (océano rojo)

| Competidor | Precio | Público |
|---|---|---|
| Wyscout | Desde USD 250-325 por año (acceso individual); paquete completo sin precio público | Clubes con presupuesto medio-alto y analistas |
| InStat | Paquete de club comparable a un sueldo anual | Élite |
| Opta / Stats Perform | Solo "enterprise" | Primer nivel |

StatsLine apunta al segmento que queda afuera: clubes chicos y medianos sin analista (océano azul).

## Roadmap del documento de MVP

| Fase | Período |
|---|---|
| 1. Análisis | Completado |
| 2. Planificación | Fin de septiembre / inicio de octubre |
| 3. Ejecución | Octubre |
| 4. Optimización (testeo con club piloto) | Noviembre |
| 5. Escalado | Post-MVP |
| 6. Evaluación | Primeras dos semanas de diciembre |

## Costos

| Concepto | Costo |
|---|---|
| Equipo | USD 0 (trabajo curricular) |
| API-Football Pro | USD 19 por mes, unos USD 57 en total |
| GitHub | Gratis |
| Hosting: app en Render y PostgreSQL en Aiven (ADR-0009 y ADR-0010) | USD 0 (planes gratis) |
| Dominio | A definir |
| Marketing | Unos USD 20 por mes desde Optimización |
