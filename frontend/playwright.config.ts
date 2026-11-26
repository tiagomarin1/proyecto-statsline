// INF-002: test E2E del recorrido de la demo. Corre contra la app ya levantada (docs/SETUP.md).
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { defineConfig, devices } from '@playwright/test';

const URL_POR_DEFECTO = 'http://localhost:8000';
const ENV_BACKEND = new URL('../backend/.env', import.meta.url);

// La contraseña del usuario demo es la misma que usó el seed. Si no está en el entorno, se toma
// solo esa variable de backend/.env. Nunca se escribe en el código ni en los logs.
if (!process.env.DEMO_CONTRASENA && existsSync(ENV_BACKEND)) {
  const contrasena = parseEnv(readFileSync(ENV_BACKEND, 'utf8')).DEMO_CONTRASENA;
  if (contrasena) process.env.DEMO_CONTRASENA = contrasena;
}

const enCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  // Un solo recorrido que cambia datos del usuario demo: nada en paralelo
  fullyParallel: false,
  workers: 1,
  forbidOnly: enCi,
  // En local, si falla, falló. En el CI, un reintento por si el runner se demora
  retries: enCi ? 1 : 0,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_URL ?? URL_POR_DEFECTO,
    viewport: { width: 1280, height: 800 },
    locale: 'es-AR',
    // El trace guarda lo que se escribe en cada campo, contraseña incluida: queda apagado.
    // Captura y video solo si falla (el campo de contraseña se ve enmascarado).
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
