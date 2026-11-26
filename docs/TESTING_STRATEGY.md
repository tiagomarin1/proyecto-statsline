# TESTING_STRATEGY.md

## Pirámide

| Nivel | Proporción | Herramienta | Qué cubre |
|---|---|---|---|
| Unitarios | Alrededor del 70% | pytest | Servicios y reglas RN-XXX como funciones puras: métricas derivadas, Mejor/Peor, presupuesto, coincidencia, sugerencia, cruce de Transfermarkt, mapeo de posiciones |
| Integración | Alrededor del 25% | pytest + TestClient de FastAPI + PostgreSQL de test (Docker) | Endpoints con DB real, auth, repositorios y sincronización con fixtures |
| Frontend | — | Vitest + Testing Library | Componentes con estados: Dato no disponible, sin resultados, selección de comparación |
| E2E | Alrededor del 5% | Playwright | **Un** test del recorrido de la demo: ingresar → filtrar → ficha → comparar → seguimiento |

## Ciclo obligatorio por feature (TDD)

1. Leer los escenarios Given/When/Then de la spec.
2. Escribir un test por escenario. Nombre: `test_<ID>_<escenario>`, por ejemplo `test_cmp001_empate_marca_todos_como_mejor`. Commit: `<ID>: tests en rojo`.
3. Escribir el código mínimo para que pasen. Commit: `<ID>: implementa <qué>`.
4. Refactorizar con los tests en verde.
5. Actualizar el catálogo (`en testing` → `hecho`) y el CHANGELOG.

## Reglas
- **Nunca** se le pega a API-Football real en unitarios ni en integración. Se usan los fixtures de `backend/tests/fixtures/api_football/` (respuestas reales grabadas una vez) y se mockea con `httpx.MockTransport` o `respx`.
- Transfermarkt se prueba con `fixtures/transfermarkt/players_muestra.csv`.
- La DB de test (`statsline_test`) se recrea con las migraciones al inicio de la sesión de pytest, y cada test corre en una transacción con rollback.
- Fábricas de datos: funciones `crear_jugador(...)` y `crear_estadistica(...)` en `tests/fabricas.py`. Nada de datos sueltos por test.
- Los casos con `NULL` son obligatorios en toda regla que use métricas.
- El E2E de la demo corre contra un seed fijo (`semillas/demo_e2e.py`), no contra datos sincronizados.
- **E2E (INF-002):** está en `frontend/e2e/recorrido-demo.spec.ts`, con la configuración en `frontend/playwright.config.ts`. Antes de correrlo tiene que estar levantado:
  - una base **local** con las migraciones y `python -m semillas.demo_e2e`;
  - la app en `http://localhost:8000` (`npm run build` y `uvicorn app.main:app`), u otra URL en `E2E_URL`;
  - `DEMO_CONTRASENA` en el entorno o en `backend/.env`.

  Los pasos completos están en `SETUP.md`. Los selectores van por rol, etiqueta o texto accesible (`getByRole`, `getByLabel`), nunca por clases de CSS. La contraseña no se escribe en el código ni en los reportes, así que el trace queda apagado. Si cambian los fixtures que usa el seed, se actualiza el test en el mismo PR.

## Cobertura mínima

| Capa | Cobertura |
|---|---|
| `servicios/` | 90% |
| `repositorios/` y `sincronizacion/` | 70% |
| `routers/` | Al menos 1 test de éxito y 1 de error por endpoint |

## Comandos

```bash
cd backend && pytest                       # todo
cd backend && pytest tests/unitarios       # rápido, sin DB
cd frontend && npm test                    # Vitest
cd frontend && npx playwright test         # E2E (app levantada con el seed, ver SETUP.md)
```
