// INF-002: el recorrido de la demo, de punta a punta, contra el seed fijo semillas/demo_e2e.py.
// Los números (40, 6, montos y métricas ganadas) salen de ese seed: si cambian sus fixtures, se
// actualiza este test en el mismo PR. Nunca se usan ids fijos: se navega por nombre.
import { expect, test, type APIRequestContext, type Locator } from '@playwright/test';

const EMAIL_DEMO = 'javier@deportivonorte.com';
const COMO_LEVANTAR = 'Levantá la app y cargá el seed como dice docs/SETUP.md (sección E2E).';

// Avisos de RN-026
const avisoGuardado = (nombre: string) => `${nombre} quedó guardado en la lista de seguimiento.`;
const avisoQuitado = (nombre: string) => `${nombre} salió de la lista de seguimiento.`;

function contrasenaDemo(): string {
  const contrasena = process.env.DEMO_CONTRASENA;
  if (!contrasena) {
    throw new Error(
      'Falta DEMO_CONTRASENA: definila en el entorno o en backend/.env, con la misma ' +
        'contraseña que usó el seed.',
    );
  }
  return contrasena;
}

/** Completa la contraseña sin que el valor quede en el reporte HTML: `fill` titula el paso con
 * el texto que escribe (Fill "…"). Se usa el setter nativo y el evento `input`, como al tipear. */
async function completarContrasena(campo: Locator, contrasena: string) {
  await campo.evaluate((input, valor) => {
    const elemento = input as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      elemento,
      valor,
    );
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  }, contrasena);
}

/** Deja a M. Rojo fuera de la lista de seguimiento del usuario demo, por si una corrida anterior
 * se cortó a la mitad. Usa su propia sesión de la API: la página sigue sin sesión. */
async function prepararSeguimiento(api: APIRequestContext, contrasena: string) {
  const salud = await api.get('/api/v1/salud').catch(() => null);
  if (!salud?.ok()) throw new Error(`La app no responde en /api/v1/salud. ${COMO_LEVANTAR}`);

  const ingreso = await api.post('/api/v1/auth/ingreso', {
    data: { email: EMAIL_DEMO, contrasena },
  });
  if (!ingreso.ok()) {
    throw new Error(
      `El usuario demo no pudo ingresar (HTTP ${ingreso.status()}). ¿El seed se cargó con la ` +
        `misma DEMO_CONTRASENA? ${COMO_LEVANTAR}`,
    );
  }

  const busqueda = await api.get('/api/v1/jugadores', {
    params: { nombre: 'Rojo', posicion: 'defensor' },
  });
  const { resultados } = (await busqueda.json()) as {
    resultados: { id: number; nombre: string }[];
  };
  const rojo = resultados.find((j) => j.nombre === 'M. Rojo');
  if (!rojo) throw new Error(`M. Rojo no está en la base: falta el seed. ${COMO_LEVANTAR}`);
  const baja = await api.delete(`/api/v1/seguimiento/${rojo.id}`);
  expect(baja.status(), 'DELETE /seguimiento es idempotente y responde 204').toBe(204);
}

test('inf002 recorrido de la demo: ingresar, filtrar, ficha, comparar y seguimiento', async ({
  page,
  request,
}) => {
  const contrasena = contrasenaDemo();
  await prepararSeguimiento(request, contrasena);

  const resultados = page.getByText(/^\d+ resultados$/);
  const chips = page.getByRole('list', { name: 'Filtros aplicados' });
  // UI-010: cada candidato es una tarjeta (article) con su link "Ver ficha"
  const tarjetas = page
    .getByRole('article')
    .filter({ has: page.getByRole('link', { name: /^Ver ficha/ }) });

  await test.step('Ingresar (AUT-002)', async () => {
    await page.goto('/buscar');
    // Ruta protegida: sin sesión, a /ingresar
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.getByLabel('Correo electrónico').fill(EMAIL_DEMO);
    await completarContrasena(page.getByLabel('Contraseña'), contrasena);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/buscar$/);
    // UI-007: la primera vez con sesión sale la guía de bienvenida; se salta para seguir
    await page.getByRole('button', { name: 'Saltar guía' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Buscar jugadores' })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Principal' });
    await expect(nav.getByText('Javier', { exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Buscar' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Seguimiento' })).toBeVisible();
    // UI-009: la primera pantalla son solo los filtros; los candidatos recién aparecen con
    // "Ver resultados"
    await expect(page.getByRole('button', { name: 'Ver resultados' })).toBeVisible();
    await expect(resultados).toHaveCount(0);
  });

  await test.step('Filtrar y ver resultados (BUS-001, BUS-002, BUS-006, UI-009)', async () => {
    await page.getByLabel('Posición', { exact: true }).selectOption({ label: 'Defensor' });
    await page.getByLabel('Liga', { exact: true }).selectOption({ label: 'Liga Profesional' });
    // Los filtros no piden nada hasta tocar "Ver resultados"
    await expect(resultados).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver resultados' }).click();

    await expect(page).toHaveURL(/[?&]posicion=defensor(&|$)/);
    await expect(page).toHaveURL(/[?&]liga_id=\d+(&|$)/);
    await expect(chips.getByText('Defensor', { exact: true })).toBeVisible();
    await expect(chips.getByText('Liga Profesional', { exact: true })).toBeVisible();
    await expect(resultados).toHaveText('6 resultados');
    await expect(tarjetas).toHaveCount(6);
    for (const tarjeta of await tarjetas.all()) {
      await expect(tarjeta).toContainText('Defensor');
      await expect(tarjeta).toContainText('Liga Profesional');
    }
    // RN-021: por defecto, de más a menos minutos
    await expect(tarjetas.first()).toContainText('L. Magallán');
    // RN-008: el valor que falta se dice, no es un 0
    await expect(tarjetas.first()).toContainText('Dato no disponible');
    await expect(tarjetas.first()).not.toContainText('EUR');
  });

  await test.step('Ficha (JUG-001)', async () => {
    await tarjetas
      .filter({ hasText: 'S. Arias' })
      .getByRole('link', { name: /^Ver ficha/ })
      .click();

    await expect(page).toHaveURL(/\/ficha\/\d+\?.*posicion=defensor/);
    await expect(page.getByRole('heading', { level: 1, name: 'S. Arias' })).toBeVisible();
    await expect(page.getByText('Defensor', { exact: true })).toBeVisible();
    await expect(page.getByText('Liga Profesional', { exact: true })).toBeVisible();
    // RN-002: valor de Transfermarkt
    await expect(page.getByText('EUR 1.200.000')).toBeVisible();
    await expect(page.getByText(/^Transfermarkt · /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Métricas de rendimiento' })).toBeVisible();
    // RN-012: coincidencia con los filtros de la búsqueda
    await expect(page.getByRole('heading', { name: 'Coincidencia con tu búsqueda' })).toBeVisible();
    await expect(page.getByText('Cumple 1 de 1 criterios.')).toBeVisible();
    await expect(page.getByText('Juega de Defensor')).toBeVisible();

    await page.getByRole('link', { name: 'Volver a resultados' }).click();
    await expect(page).toHaveURL(/\/buscar\?.*posicion=defensor/);
    await expect(chips.getByText('Defensor', { exact: true })).toBeVisible();
    await expect(chips.getByText('Liga Profesional', { exact: true })).toBeVisible();
    await expect(resultados).toHaveText('6 resultados');
  });

  await test.step('Comparar (CMP-001)', async () => {
    await page.getByRole('checkbox', { name: 'Comparar a S. Arias' }).check();
    await page.getByRole('checkbox', { name: 'Comparar a M. Rojo' }).check();
    const comparar = page.getByRole('button', { name: 'Comparar 2' });
    await expect(comparar).toBeEnabled();
    await comparar.click();

    await expect(page).toHaveURL(/\/comparar\?ids=\d+,\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Comparar jugadores' })).toBeVisible();
    // CMP-006: cada jugador va en su columna, con el nombre completo
    await expect(page.getByRole('heading', { name: 'S. Arias' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'M. Rojo' })).toBeVisible();
    // RN-006: Mejor/Peor por métrica
    await expect(page.getByRole('article').filter({ hasText: 'Métricas ganadas' })).toContainText(
      /S\. Arias\s*3\s*M\. Rojo\s*5/,
    );
    const diferencia = page.getByRole('article').filter({ hasText: 'Diferencia de valor' });
    await expect(diferencia).toContainText('EUR 1.075.000');
    await expect(diferencia).toContainText('M. Rojo es el más barato de la comparación.');
  });

  await test.step('Seguimiento (SEG-001)', async () => {
    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'M. Rojo' }) })
      .getByRole('link', { name: 'Ver ficha' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'M. Rojo' })).toBeVisible();
    await page.getByRole('button', { name: /Guardar en seguimiento/ }).click();
    await expect(page.getByText(avisoGuardado('M. Rojo'))).toBeVisible();
    await expect(page.getByRole('button', { name: /Quitar del seguimiento/ })).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Seguimiento' })
      .click();
    await expect(page).toHaveURL(/\/seguimiento$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Lista de seguimiento' }),
    ).toBeVisible();
    const tarjeta = page.getByRole('article').filter({ hasText: 'M. Rojo' });
    await expect(tarjeta).toHaveCount(1);
    await tarjeta.getByRole('button', { name: 'Quitar de la lista de seguimiento' }).click();
    await expect(page.getByText(avisoQuitado('M. Rojo'))).toBeVisible();
    // Solo se mira a M. Rojo: si el usuario demo tiene otros guardados, no se tocan
    await expect(tarjeta).toHaveCount(0);
  });
});
