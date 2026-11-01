import type { Posicion, RolUsuario } from '../tipos/api';

export const POSICIONES: Record<Posicion, string> = {
  arquero: 'Arquero',
  defensor: 'Defensor',
  mediocampista: 'Mediocampista',
  delantero: 'Delantero',
};

export const ROLES: Record<RolUsuario, string> = {
  director_tecnico: 'Director técnico',
  director_deportivo: 'Director deportivo / Manager',
  dirigente: 'Dirigente',
  ojeador: 'Ojeador / Scout',
};

const eur = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const formatearEur = (valor: number) => eur.format(valor);
