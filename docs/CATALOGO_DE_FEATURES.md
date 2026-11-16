# CATALOGO_DE_FEATURES.md

Índice maestro de features. El ID no cambia aunque cambie la prioridad.

- **Estados:** `borrador` → `spec-aprobada` → `en desarrollo` → `en testing` → `hecho`.
- **Prioridad:** P0 bloquea la demo; P1 es MVP pero no bloquea; R2 y R3 son releases siguientes.
- **"Vence"** es la fecha de la tarjeta de Trello, en hora de Argentina.

Todas las specs del MVP v1 están en `spec-aprobada (pendiente de validar por el PO)`: las escribió la IA a partir de las historias de Trello, el prototipo y las reglas cerradas el 27/10. El PO (Almeida) las tiene que revisar antes de pasarlas a `en desarrollo`.

## Orden sugerido de implementación

```
INF-001 → DAT-001 → DAT-002 → AUT-001 → AUT-002 → BUS-001..004 → BUS-006 → JUG-001 → CMP-001 → BUS-005 → SEG-001
```

## MVP v1 — Demo Day 9/11

### Módulo: Infraestructura

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| INF-001 | Repo, stack, entorno y deploy | hecho | P0 | 27/10 | Cilento + Marin | specs/infraestructura/INF-001.md |
| INF-002 | Test E2E del recorrido de la demo (Playwright) | en testing (falta decidir si entra al CI) | P1 | — (nueva) | Cilento | specs/infraestructura/INF-002.md |

### Módulo: Datos

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| DAT-001 | Sincronizar jugadores desde API-Football | en testing | P0 | 29/10 | Cilento + Marin | specs/datos/DAT-001.md |
| DAT-002 | Importar valores de mercado de transfermarkt-datasets | en testing | P0 | — (nueva) | Cilento + Marin | specs/datos/DAT-002.md |
| DAT-003 | Sincronizar jugadores del ascenso desde Sportmonks | en desarrollo (parcial: falta el comando de sincronización; depende de ADR-0011, propuesta) | P1 | — (nueva) | — | specs/datos/DAT-003.md |
| DAT-004 | Sincronizar la trayectoria de los jugadores desde API-Football | en desarrollo (implementado; falta validar RN-032 a RN-034 con el PO) | P1 | — (nueva) | — | specs/datos/DAT-004.md |

### Módulo: Autenticación

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| AUT-001 | Registrarse en la plataforma | en testing | P0 | 6/11 | — | specs/autenticacion/AUT-001.md |
| AUT-002 | Iniciar y cerrar sesión | en testing | P0 | 6/11 | Cilento + Garrido | specs/autenticacion/AUT-002.md |

### Módulo: Búsqueda

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| BUS-001 | Filtrar por posición y edad | en testing | P0 | 2/11 | — | specs/busqueda/BUS-001.md |
| BUS-002 | Filtrar por liga o competición | en testing | P0 | 2/11 | Garrido + Cilento | specs/busqueda/BUS-002.md |
| BUS-003 | Filtrar por métricas tácticas | en testing | P0 | 3/11 | Cilento + Garrido | specs/busqueda/BUS-003.md |
| BUS-004 | Filtrar por presupuesto | en testing | P0 | 3/11 | Marin + Garrido | specs/busqueda/BUS-004.md |
| BUS-005 | Crear, guardar y cargar el perfil de búsqueda | en testing | P1 | — | — | specs/busqueda/BUS-005.md |
| BUS-006 | Resultados: orden, paginado, sin resultados y selección | en testing | P0 | — (nueva) | — | specs/busqueda/BUS-006.md |
| BUS-010 | Buscar jugadores por nombre | en testing (falta validar RN-035, propuesta, con el PO) | P1 | — (nueva) | — | specs/busqueda/BUS-010.md |

### Módulo: Jugador

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| JUG-001 | Ver ficha individual de un jugador | en testing | P0 | 4/11 | Garrido + Marin | specs/jugador/JUG-001.md |
| JUG-003 | Ver la trayectoria del jugador en su ficha | en testing | P1 | — (nueva) | — | specs/jugador/JUG-003.md |

### Módulo: Comparación

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| CMP-001 | Comparar 2 o 3 candidatos | en testing | P0 | 5/11 | Garrido + Cilento | specs/comparacion/CMP-001.md |

### Módulo: Seguimiento

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| SEG-001 | Lista de seguimiento | en testing | P1 | — | — | specs/seguimiento/SEG-001.md |

### Módulo: Interfaz

| ID | Feature | Estado | Prioridad | Vence | Responsables | Spec |
|---|---|---|---|---|---|---|
| UI-001 | Rebranding: paleta, logotipo, tipografía y favicon | en testing | P1 | — (nueva) | — | — (sin spec; la fuente es la hoja de marca del 29/10) |
| UI-002 | Buscar con filtros en vivo, tabla ordenable y panel de detalle | en testing | P1 | — (nueva) | — | specs/interfaz/UI-002.md |
| UI-003 | Hero de la home con la pelota que recorre la línea | en testing | P1 | — (nueva) | — | specs/interfaz/UI-003.md |

### Mapeo con las tarjetas de Trello

| Tarjeta de Trello | ID |
|---|---|
| Definir repo, stack y entorno de desarrollo | INF-001 |
| Sincronizar datos de jugadores desde API-Football | DAT-001 |
| Registrarse en la plataforma | AUT-001 |
| Iniciar sesión en la plataforma | AUT-002 |
| Filtrar jugadores por posición y edad | BUS-001 |
| Filtrar jugadores por liga o competición | BUS-002 |
| Filtrar jugadores por características tácticas | BUS-003 |
| Filtrar jugadores por presupuesto del club | BUS-004 |
| Crear perfil de búsqueda + Guardar perfil de búsqueda | BUS-005 |
| Ver ficha individual de un jugador | JUG-001 |
| Comparar directamente dos o más candidatos | CMP-001 |
| Guardar jugadores en una lista de seguimiento | SEG-001 |
| Unificar las métricas del MVP | Resuelta con RN-001 (27/10) |
| Definir el Score del jugador | Resuelta con RN-010: sale del v1 (27/10) |

## R2 — después del MVP

| ID | Feature | Estado | Nota |
|---|---|---|---|
| BUS-007 | Score del jugador (0-100) | borrador | RN-010 y RN-011 |
| BUS-008 | Múltiples perfiles de búsqueda | borrador | |
| JUG-002 | Buscar jugadores similares a uno dado | borrador | RN-013 |
| CMP-002 | Exportar comparación en PDF | borrador | RN-014 |
| SEG-002 | Compartir la lista de seguimiento | borrador | |
| AUT-003 | Recuperar contraseña por email | borrador | |
| AUT-004 | Ingresar con Google u otras redes | borrador | |
| BUS-009 | Montos en pesos argentinos | borrador | RN-004 |

## R3 e ideas futuras (sin ID)

- **R3:**
  - historial de búsquedas;
  - historial de comparaciones;
  - alertas de jugadores nuevos que cumplen el perfil;
  - perfiles de equipo con roles y permisos;
  - notas colaborativas;
  - registrar el presupuesto del club;
  - cruzar rendimiento con presupuesto en la comparación;
  - panel principal con resumen;
  - datos del club.
- **Ideas futuras:**
  - onboarding guiado;
  - contacto con soporte;
  - validación retrospectiva contra transferencias pasadas;
  - app mobile nativa;
  - multi-idioma.
