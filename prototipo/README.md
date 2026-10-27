> **Nota (27/10/2026):** este prototipo es **anterior** a las decisiones del 27/10. Es una referencia visual de pantallas, estados y responsive, **no una spec**. Si contradice algo de `docs/`, manda `docs/`. Diferencias conocidas:
> - usa USD (ahora es EUR);
> - tiene Score (sale del v1);
> - incluye distancia y centros (ya no están);
> - tiene 10 posiciones (ahora son 4);
> - incluye Primera E y no incluye la Liga Profesional;
> - no tiene filtro de minutos;
> - el presupuesto arranca activo (ahora arranca apagado).
>
> Ver "Pendientes" en `docs/REGLAS_DE_NEGOCIO.md`.

# ScoutIAndo · Prototipo navegable v1

Prototipo navegable y responsive del MVP de **ScoutIAndo**, la plataforma que permite a
clubes de fútbol chicos y medianos comparar jugadores por rendimiento y presupuesto sin
necesidad de un analista de datos.

Equipo 04 · Seminario de Gestión de Tecnología · UADE

---

## Cómo verlo

Abrí `index.html` en cualquier navegador. No hace falta instalar nada ni levantar un
servidor: son archivos estáticos.

**Cuenta de prueba:**

| Correo | Contraseña |
|---|---|
| `javier@deportivonorte.com` | `scoutiando` |

Con cualquier otra combinación se ve el estado de error, que es intencional.

---

## Qué incluye

Las 5 pantallas del wireframe mid-fi, más las 2 que tenían historia de usuario en el
backlog pero no tenían pantalla dibujada:

| Pantalla | Patrón | Qué hace |
|---|---|---|
| Home | Lectura Z | Hero, dato de la encuesta, cómo funciona, planes |
| Login | Tarjeta centrada | Valida, y con datos incorrectos da un error genérico que no revela cuál dato falló |
| Registro | Tarjeta centrada | Rol, club, mínimo 8 caracteres, correo ya registrado, términos |
| Búsqueda | Lectura F | Filtros reales sobre 46 jugadores, orden, paginado, guardar perfil |
| Comparador | Barras enfrentadas | 2 o 3 jugadores, mejor y peor por métrica, métricas ganadas, diferencia de valor |
| Ficha del jugador | — | Métricas contra el promedio de la posición y coincidencia con el perfil buscado |
| Lista de seguimiento | — | Guardar, quitar y comparar desde la lista |

### Estados que están implementados

Son los que ya estaban escritos como criterios de aceptación en las historias de usuario:

- **"Dato no disponible"** cuando la liga del jugador no publica esa métrica.
- **"Datos básicos"** en Primera C, Primera D y Torneo Federal A.
- Un jugador al que le falta la métrica por la que se filtra **queda excluido**, y un aviso
  dice cuántos quedaron afuera y por qué.
- **Sin resultados**, con una sugerencia de qué filtro conviene relajar y cuántos
  candidatos aparecerían si se relaja.
- **Liga sin datos** (probá eligiendo Primera E).

### Responsive

| Ancho | Comportamiento |
|---|---|
| 1024px o más | Panel de filtros fijo a la izquierda, tabla de candidatos a la derecha |
| 768 a 1023px | Los filtros pasan a un cajón lateral que se abre con el botón **Filtros** |
| Menos de 768px | Menú hamburguesa, y la tabla de candidatos se convierte en tarjetas |

---

## Estructura

```
index.html    Estructura de la página y carga de los otros archivos
styles.css    Tokens de color de la marca, layout y los tres breakpoints
data.js       Los 46 jugadores de demostración, las ligas y las métricas
app.js        Ruteo entre pantallas, filtrado, Score, comparador y validaciones
```

### Cómo se conecta la API más adelante

`data.js` expone `window.SCOUTIANDO_DATA` con esta forma:

```js
{
  LIGAS:      [{ id, nombre, cobertura }],
  POSICIONES: ["Arquero", "Lateral derecho", ...],
  METRICAS:   [{ key, label, unidad, peso, decimales }],
  JUGADORES:  [{ id, nom, club, liga, pos, edad, valor,
                 pases, duelos, recup, centros, dist, part, min }]
}
```

Un valor `null` en una métrica significa "no disponible para ese jugador". Cuando se
integre API-Football, el trabajo es reemplazar este archivo por la respuesta real
mapeada a esa misma estructura: `app.js` no necesita cambiar.

---

## El Score

Definición **provisoria**, pendiente de confirmar con el Product Owner
(ver la tarjeta *Definir el Score del jugador* en el Trello del equipo).

Promedio ponderado de las cinco métricas, normalizado contra los jugadores de la **misma
posición**, en escala de 0 a 100:

| Métrica | Peso |
|---|---|
| % de pases completados | 30% |
| Duelos ganados | 25% |
| Recuperaciones por partido | 20% |
| Distancia recorrida por partido | 15% |
| Centros por partido | 10% |

Si a un jugador le faltan métricas, el peso se reparte entre las disponibles y el score
aparece marcado con un asterisco como **parcial**.

---

## Lo que todavía no entra

Dentro del prototipo están visibles pero marcados como de un release posterior, para que
quede explícito qué es alcance del MVP y qué no:

- **Exportar PDF** del comparador → R2
- **Reportes** → R2
- **Recuperar contraseña** → R2
- **Datos del club** → R3

---

## Aviso

Los jugadores, clubes y métricas son **ficticios**, generados para este prototipo. No
representan a personas ni a instituciones reales. Las estadísticas reales van a venir de
[API-Football](https://www.api-football.com/) cuando se integre.

No hay backend: la sesión, los favoritos y el perfil de búsqueda se guardan únicamente en
el navegador de quien abre la página.
