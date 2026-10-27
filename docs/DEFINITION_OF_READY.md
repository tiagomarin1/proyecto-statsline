# DEFINITION_OF_READY.md

Una spec puede pasarse a la IA para implementar solo si cumple todo esto:

- [ ] Tiene ID y figura en `CATALOGO_DE_FEATURES.md`.
- [ ] Tiene historia de usuario y al menos un escenario Given/When/Then.
- [ ] El contrato de API está definido en la spec o en `CONTRATO_DE_API.md`, o se aclara que no aplica.
- [ ] Las entidades que toca existen en `MODELO_CANONICO_DE_DATOS.md`.
- [ ] Las reglas que usa están en `REGLAS_DE_NEGOCIO.md` y se citan por ID.
- [ ] Los casos borde principales están listados, incluido el de "dato no disponible" si usa métricas.
- [ ] Dice qué queda fuera de alcance.
- [ ] Las dependencias están en `hecho` o se van a hacer en el mismo PR.

**Regla para la IA:** si falta algo, lo primero es señalar qué falta. No se completa el hueco por cuenta propia.
