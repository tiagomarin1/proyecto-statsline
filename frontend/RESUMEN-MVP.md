# Resumen MVP frontend StatsLine

Entregable para revisión (Garrido). Sin commit. Código en `frontend/`.

## Stack (qué es y por qué)

| Pieza                        | Definición                                | Por qué                                                         |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| **React 18**                 | Librería para armar la UI con componentes | ADR-0003 del repo; mismo mental model que tu e‑commerce         |
| **TypeScript**               | JavaScript con tipos estáticos            | Tipar el contrato API; errores al compilar, no en la demo       |
| **Vite**                     | Bundler y servidor de desarrollo          | Arranque rápido; proxy `/api` → `localhost:8000` (cookies/CORS) |
| **react-router-dom 6**       | Rutas en el cliente                       | Layout compartido, rutas protegidas, filtros en la URL          |
| **Context (React)**          | Estado global liviano                     | Solo sesión y toasts; **sin Redux** (sobra para este MVP)       |
| **`pedirApi` + `fetch`**     | Cliente HTTP del scaffold                 | Cookie `sesion` con `credentials: 'include'`; **sin axios**     |
| **Vitest + Testing Library** | Tests unitarios/UI                        | Ya venían en el scaffold                                        |
| **ESLint + Prettier**        | Lint y formato                            | Ya venían; sin dependencias nuevas                              |

## Páginas (`src/paginas/`)

| Página                   | Para qué                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Inicio**               | Portada/hero. Con sesión el CTA va a buscar; sin sesión a registro                                     |
| **Ingresar**             | Login; muestra error del backend; vuelve a la ruta que querías abrir                                   |
| **Registro**             | Alta con validación 422 por campo y email duplicado                                                    |
| **Buscar**               | Filtros del contrato, orden, tarjetas, paginado, avisos RN (excluidos, liga sin datos, relajar filtro) |
| **Ficha** (`/ficha/:id`) | Detalle, valor de mercado, métricas vs promedio de posición, coincidencia, seguir/dejar                |
| **Seguimiento**          | Lista del usuario; quitar; vacío → buscar                                                              |

## Componentes (`src/componentes/`)

Solo los que se reutilizan o simplifican algo:

| Componente         | Para qué                                                            |
| ------------------ | ------------------------------------------------------------------- |
| **LayoutApp**      | Topbar Stats*Line*, nav según sesión, footer                        |
| **RutaProtegida**  | Sin sesión → `/ingresar` (guarda destino); loading mientras chequea |
| **Dato**           | `null` → “Dato no disponible” (nunca mostrar 0 por dato faltante)   |
| **TarjetaJugador** | Card + estrella de seguimiento (Buscar y Seguimiento)               |
| **Paginacion**     | Anterior/números/siguiente; oculta si hay una sola página           |

## Contextos, servicios y utilidades

- **`contexto/SesionContext`**: `GET /auth/yo` al montar; `ingresar` / `registrarse` / `salir`
- **`contexto/AvisosContext`**: toasts con clases `.toast` de `base.css`
- **`servicios/jugadores.ts`**, **`servicios/seguimiento.ts`**: wrappers de una línea sobre `pedirApi`
- **`utilidades/formato.ts`**: etiquetas de posición/rol y EUR
- **`tipos/api.ts`**: interfaces del `CONTRATO_DE_API.md`
- **`servicios/api.ts`**: `pedirApi` + `ErrorApi` (ya existía)

## TypeScript: qué se tipó y por qué

- Respuestas tipadas (`pedirApi<RespuestaBusqueda>`, etc.) → autocompletado alineado al backend
- Métricas `number | null` → obliga a tratar “dato no disponible” (componente `Dato`)
- Uniones `Posicion`, `RolUsuario`, `OrdenBusqueda`, `EstadoCriterio` → selects/íconos seguros
- Props e interfaz de sesión tipadas; `useSesion` falla fuera del provider

## Mejoras de diseño / UX agregadas

- Estados loading, error y vacío en las pantallas
- Toasts en login, registro, salida, seguir / dejar de seguir (respeta `aviso` RN-026)
- Rutas protegidas que vuelven al destino original
- Filtros en la URL (compartibles; “volver a resultados” mantiene la búsqueda; la ficha usa esos filtros para coincidencia)
- Etiqueta “Datos básicos” en ligas con cobertura básica
- Botones deshabilitados mientras se envía; detalles a11y (`aria-pressed`, `aria-live`)

**Fuera a propósito:** comparación (CMP), perfil de búsqueda guardado, menú hamburguesa mobile.

## Cómo correrlo

1. Backend en `:8000` (ver `docs/SETUP.md`).
2. `cd frontend && npm ci && npm run dev` → URL de Vite.

Usuario demo (semilla backend, no del front): `javier@deportivonorte.com` — contraseña `DEMO_CONTRASENA` / en prototipo `scoutiando`. Detalle en `docs/SETUP.md` y `README.md`.

## Archivos tocados (solo frontend)

- Modificados: `App.tsx`, `paginas/Inicio.tsx`, `tipos/api.ts`
- Nuevas páginas: Ingresar, Registro, Buscar, Ficha, Seguimiento
- Nuevos componentes: LayoutApp, RutaProtegida, Dato, TarjetaJugador, Paginacion
- Nuevos: SesionContext, AvisosContext, servicios jugadores/seguimiento, utilidades/formato
- Validado: `npm run build`, `npm test` (4/4), `npm run lint`
- No se modificó `backend/`. Sin commits.
