# TESTING_STRATEGY.md

## Pirámide

| Nivel | Proporción | Herramienta | Qué cubre |
|---|---|---|---|
| Unitarios | Alrededor del 70% | pytest | Servicios y reglas RN-XXX como funciones puras: métricas derivadas, Mejor/Peor, presupuesto, coincidencia, sugerencia, cruce de Transfermarkt, mapeo de posiciones |
| Integración | Alrededor del 25% | pytest + TestClient de FastAPI + MySQL de test (Docker) | Endpoints con DB real, auth, repositorios y sincronización con fixtures |
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
cd frontend && npx playwright test         # E2E (app levantada)
```
