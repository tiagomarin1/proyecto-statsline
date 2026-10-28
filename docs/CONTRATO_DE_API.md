# CONTRATO_DE_API.md

Diseño intencional de la API. FastAPI genera `/docs` a partir del código; este archivo dice cómo **tiene que** quedar.

**Convenciones generales:**

- **Base:** `/api/v1`.
- **Formato:** JSON en `snake_case` y en español.
- **Autenticación:** cookie `sesion` (ADR-0005). Los endpoints marcados 🔒 responden 401 sin sesión.
- **Formato de error:** `{"detalle": "mensaje para el usuario", "codigo": "codigo_maquina"}`.
- **Validación:** los errores de validación de Pydantic devuelven 422 con `codigo: "validacion"` y `errores: [{campo, mensaje}]`.
- **Dato no disponible:** se devuelve `null`, nunca `0`.

## Tipos comunes

```jsonc
// JugadorResumen (filas de resultados, lista de seguimiento)
{
  "id": 1,
  "nombre": "Nahuel Ferreyra",
  "posicion": "defensor",               // RN-019, puede ser null
  "edad": 23,                           // RN-009, puede ser null
  "equipo": "Deportivo Norte",
  "liga": { "id": 2, "nombre": "Primera Nacional", "cobertura": "completa" },
  "temporada": 2026,
  "minutos_jugados": 2410,
  "pases_precision_pct": 87.0,          // null = dato no disponible
  "duelos_ganados_pct": 61.0,
  "recuperaciones_por_partido": 1.9,
  "rating": 7.12,
  "valor_mercado_eur": 85000,           // null = costo no disponible
  "en_seguimiento": true
}

// Metricas (ficha y comparador). Siempre se devuelven todas las claves.
{
  "partidos_jugados": 28, "minutos_jugados": 2410, "goles": 1, "asistencias": 4,
  "pases_precision_pct": 87.0, "duelos_ganados_pct": 61.0,
  "recuperaciones_por_partido": 1.9, "rating": 7.12
}
```

---

## Autenticación

| Método | Ruta | Auth | Request | 2xx | Errores |
|---|---|---|---|---|---|
| POST | `/auth/registro` | — | `{nombre, email, rol, club, contrasena, acepta_terminos}` | 201 `Usuario` + cookie | 409 `email_registrado`, 422 `validacion` |
| POST | `/auth/ingreso` | — | `{email, contrasena}` | 200 `Usuario` + cookie | 401 `credenciales_invalidas` ("Correo o contraseña incorrectos.") |
| POST | `/auth/salida` | 🔒 | — | 204, borra la cookie | — |
| GET | `/auth/yo` | 🔒 | — | 200 `Usuario` | 401 `sin_sesion` |

`Usuario` = `{id, nombre, email, rol, club}`. Nunca se devuelve el hash.

## Ligas

| Método | Ruta | Auth | 2xx |
|---|---|---|---|
| GET | `/ligas` | 🔒 | 200 `[{id, nombre, cobertura, temporada_actual}]`, ordenado por `orden` |

## Jugadores (búsqueda)

`GET /jugadores` 🔒

**Query params:** todos son opcionales; un param vacío u omitido significa "sin filtro". Rangos en RN-024.

| Param | Tipo | Regla |
|---|---|---|
| `posicion` | enum Posicion | BUS-001 |
| `edad_min`, `edad_max` | int | BUS-001, RN-009 |
| `liga_id` | int | BUS-002 |
| `pases_min`, `duelos_min`, `recuperaciones_min`, `minutos_min` | número | BUS-003, RN-008 |
| `presupuesto_max_eur` | int | BUS-004, RN-005 |
| `orden` | `minutos` \| `valor` \| `edad` \| `pases` \| `rating` | RN-021, por defecto `minutos` |
| `pagina` | int ≥ 1 | Por defecto 1 |
| `tamano` | int | Por defecto 6, máximo 50 |

**Respuesta 200:**

```jsonc
{
  "resultados": [JugadorResumen],
  "total": 14,
  "pagina": 1,
  "tamano": 6,
  "excluidos_por_dato_faltante": 3,   // RN-008
  "excluidos_sin_valor": 5,           // RN-005, 0 si no hay presupuesto
  "liga_sin_datos": false,            // BUS-002, true si la liga tiene cobertura sin_datos
  "sugerencia": null                  // RN-016, solo si total == 0: {"filtro": "presupuesto_max_eur", "etiqueta": "el presupuesto", "cantidad": 7}
}
```

**Errores:**

- 422 `validacion`: valores fuera de rango o `edad_min > edad_max`.
- 404 `liga_inexistente`.

## Jugador (ficha)

`GET /jugadores/{id}` 🔒

**Query params opcionales:** los mismos filtros de la búsqueda. Se usan para calcular la coincidencia (RN-012). El frontend manda el perfil guardado o, si no hay, los filtros actuales.

**Respuesta 200:**

```jsonc
{
  "id": 1, "nombre": "Nahuel Ferreyra", "posicion": "defensor", "edad": 23,
  "fecha_nacimiento": "2003-04-12", "nacionalidad": "Argentina",
  "equipo": "Deportivo Norte",
  "liga": { "id": 2, "nombre": "Primera Nacional", "cobertura": "completa" },
  "temporada": 2026,
  "metricas": Metricas,
  "promedios_posicion": Metricas,          // RN-015, null donde nadie tiene el dato
  "valor_mercado": { "eur": 85000, "fecha": "2026-07-06", "fuente": "Transfermarkt" },  // o null
  "en_seguimiento": false,
  "coincidencia": {                         // null si no se mandaron filtros
    "cumple": 3, "total": 4,
    "criterios": [{ "criterio": "posicion", "estado": "cumple", "texto": "Juega de Defensor" }, ...]
  }
}
```

**Errores:** 404 `jugador_inexistente`.

## Comparaciones

`POST /comparaciones` 🔒. **No guarda nada**: el historial es R3.

**Request:** `{"jugador_ids": [1, 2, 3]}`.

**Respuesta 200:**

```jsonc
{
  "jugadores": [{ "id", "nombre", "posicion", "edad", "equipo", "liga", "temporada", "valor_mercado_eur" }],
  "filas": [
    { "metrica": "pases_precision_pct", "etiqueta": "% pases completados",
      "valores": [87.0, 83.0, 87.0],          // mismo orden que jugadores, null = no disponible
      "mejor": [1, 3], "peor": [2] }           // IDs, RN-006
  ],
  "metricas_ganadas": { "1": 4, "2": 1, "3": 3 },
  "diferencia_valor_eur": 55000,              // null si menos de 2 tienen valor
  "mas_barato_id": 1                          // null si nadie tiene valor
}
```

**Errores:**

- 400 `cantidad_invalida`: "Se pueden comparar entre 2 y 3 jugadores". También para IDs repetidos.
- 404 `jugador_inexistente`.

## Perfil de búsqueda

| Método | Ruta | Auth | Request | 2xx | Errores |
|---|---|---|---|---|---|
| GET | `/perfil-busqueda` | 🔒 | — | 200 `PerfilBusqueda` | 404 `sin_perfil` |
| PUT | `/perfil-busqueda` | 🔒 | `PerfilBusqueda` (sin id) | 200, crea o reemplaza (RN-023) | 422 `validacion` (falta posición, liga o edad) |

`PerfilBusqueda` = `{posicion, liga_id, edad_min, edad_max, presupuesto_max_eur, pases_min, duelos_min, recuperaciones_min, minutos_min}`.

## Lista de seguimiento

| Método | Ruta | Auth | Request | 2xx | Errores |
|---|---|---|---|---|---|
| GET | `/seguimiento` | 🔒 | — | 200 `[JugadorResumen]`, del más reciente al más viejo | — |
| POST | `/seguimiento` | 🔒 | `{jugador_id}` | 201 si se agregó, 200 si ya estaba (idempotente) | 404 `jugador_inexistente` |
| DELETE | `/seguimiento/{jugador_id}` | 🔒 | — | 204 (idempotente) | — |

## Salud

`GET /salud` (sin auth). Devuelve 200 `{"estado": "ok", "base_de_datos": "ok"}`. Si la base no responde, devuelve 503 `{"estado": "error", "base_de_datos": "error"}`. Lo usa Render como healthcheck.
