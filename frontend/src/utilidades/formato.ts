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

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** UI-010: coma decimal argentina y hasta 2 decimales ("6,45", "2,6", "1.890"). */
export const formatearNumero = (valor: number) => numero.format(valor);

/** UI-010: iniciales del avatar, de las dos primeras palabras ("L. Magallán" → "LM"). */
export function iniciales(nombre: string): string {
  const palabras = nombre.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toLocaleUpperCase('es-AR');
  return (palabras[0][0] + palabras[1][0]).toLocaleUpperCase('es-AR');
}
