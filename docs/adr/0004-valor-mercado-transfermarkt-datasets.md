# ADR-0004: Valor de mercado desde transfermarkt-datasets

**Estado:** Aceptada (2026-10-27)

## Contexto
El alcance de datos del MVP es el de API-Football, pero la API no trae valor de mercado y el filtro de presupuesto lo necesita. Transfermarkt no tiene API oficial y los scrapers violan sus términos de uso.

## Opciones consideradas
1. **Pasar el filtro de presupuesto a R2:** respeta el alcance, pero se pierde un pilar del producto (60,8% lo pidió).
2. **Carga manual del valor para los jugadores de la demo:** rápido, pero no escala.
3. **Que el club cargue el costo pedido:** suma alcance (formulario y datos propios).
4. **APIs pagas de "market value"** (por ejemplo, Zyla): no dicen de dónde sacan los datos, no aclaran la cobertura y cuestan desde USD 10.000 por año.
5. **Dataset público transfermarkt-datasets** (github.com/dcaribou/transfermarkt-datasets): licencia CC0, trae `market_value_in_eur`.

## Decisión
Opción 5. Es la **única excepción** al principio "alcance = API-Football". Los valores se muestran en **EUR** sin convertir (RN-004) y el cruce con API-Football sigue RN-002.

## Consecuencias
+ Hay un valor de mercado real y legal sin hacer scraping.
- El dataset está **congelado al 6/7/2026**, así que hay que mostrar la fecha del dato.
- **Riesgo:** falta verificar la cobertura en las ligas argentinas. Probablemente solo cubre Primera, y en el ascenso la mayoría quedaría con "Costo no disponible".
- El cruce por nombre y fecha de nacimiento puede fallar: si no hay una única coincidencia, el jugador queda sin valor.
