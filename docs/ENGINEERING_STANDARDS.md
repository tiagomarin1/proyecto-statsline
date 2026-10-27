# ENGINEERING_STANDARDS.md

> Versión corta escrita para ScoutIAndo. El manual menciona un `ENGINEERING_STANDARDS.md` anterior del equipo que no está en el Project. Si aparece, se reemplaza este archivo por ese y se completa su sección 12 con la fila de stack de abajo.

Este documento define **cómo** se construye. El **qué** está en las specs y en las reglas.

## 1. Código
- Todo en español (ADR-0007) y con los nombres de `GLOSARIO.md`.
- **Python 3.12:**
  - formato y lint con `ruff format` + `ruff check`;
  - type hints en todas las funciones públicas;
  - funciones de 40 líneas o menos como guía.
- **TypeScript:**
  - `strict: true`;
  - ESLint + Prettier;
  - componentes funcionales con hooks;
  - nada de `any` sin un comentario que lo justifique.
- **Capas:** el router no tiene lógica, el servicio no hace SQL y el repositorio no tiene reglas de negocio (`ARQUITECTURA.md`).
- **Reglas de negocio:** cada una se implementa en **un** solo lugar (`servicios/`), con un docstring que cite la RN. Prohibido duplicar una regla en el frontend.
- **Excepción en el frontend:** puede validar formularios (RN-022, RN-023, RN-024) para dar feedback inmediato, pero el backend vuelve a validar siempre.
- **Sin números mágicos:** el tamaño de página, los límites de comparación y los rangos van en constantes con nombre (`MAX_JUGADORES_COMPARACION = 3`).

## 2. Seguridad
- Secretos solo en variables de entorno: `.env` en `.gitignore` y `.env.example` en el repo.
- Contraseñas con Argon2. La cookie de sesión es `httpOnly`, `Secure` en producción y `SameSite=Lax` (ADR-0005).
- Nada de SQL concatenado: siempre ORM o parámetros.
- Toda entrada se valida con Pydantic.
- Las respuestas nunca exponen hashes, tokens ni la API key, y los mensajes de error no revelan detalles internos.
- Los logs no incluyen contraseñas, cookies ni la clave de API-Football.
- Los endpoints 🔒 usan la dependencia `usuario_actual`. Un usuario solo ve y modifica **su** perfil y **su** lista de seguimiento.

## 3. Rendimiento
- Las búsquedas filtran y paginan en SQL, no en Python sobre todos los jugadores.
- Se crean los índices de `MODELO_CANONICO_DE_DATOS.md`. Objetivo: `GET /jugadores` en menos de 300 ms con unos 6.000 jugadores.
- Los promedios por posición (RN-015) se calculan con una consulta agregada y pueden cachearse en memoria hasta la próxima sincronización.
- Las pantallas nunca llaman a API-Football (ADR-0008).

## 4. Datos
- `NULL` significa "no disponible" y nunca se convierte en 0 (RN-008).
- Toda modificación del esquema pasa por una migración de Alembic. Las migraciones aplicadas no se editan.
- La sincronización es transaccional por liga (RN-025).

## 5. Errores
- Formato único: `{"detalle", "codigo"}` (`CONTRATO_DE_API.md`).
- Errores de la API externa: reintentos con backoff y degradación sin romper los datos existentes.

## 6. Git y PRs
- Ramas `feature/<ID>-descripcion-corta`. PR a `main` con al menos una revisión de otro integrante.
- Commits `<ID>: <qué hace>`.
- El PR enlaza la spec y lista los escenarios cubiertos por tests.

## 7. Accesibilidad y UI
- Responsive según el prototipo (1024px y 768px).
- Labels en todos los inputs, `aria-label` en los botones con ícono (★) y contraste AA.
- Los estados del prototipo son obligatorios: dato no disponible, datos básicos, liga sin datos, sin resultados y error de login genérico.

## 8. Testing
Ver `TESTING_STRATEGY.md`. Prioridad por riesgo:

1. autenticación y permisos;
2. reglas de negocio (servicios);
3. sincronización (escritura en DB);
4. flujo de la demo.

## 12. Definition of Done

| Ítem | Criterio |
|---|---|
| Spec | Escenarios Given/When/Then cubiertos 1 a 1 por tests |
| Tests | `pytest` y `npm test` en verde. Los tests nuevos fallaron antes de implementar |
| Lint | `ruff check` y `npm run lint` sin errores |
| Revisión | PR aprobado por otro integrante |
| Docs | Catálogo actualizado, línea en el CHANGELOG, glosario y reglas al día |
| Deploy | Funciona en Railway (staging = main) |

**Stack de ScoutIAndo:** FastAPI + SQLAlchemy 2 + Alembic + MySQL 8 (Railway) · React + Vite + TS · pytest/httpx · Vitest/Testing Library · Playwright (flujo de la demo).
