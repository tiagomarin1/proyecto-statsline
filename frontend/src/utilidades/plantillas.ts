/** UI-007 (supuesto): atajos de búsqueda con valores elegidos por el equipo. Usan solo filtros que
 *  ya existen (BUS-001 a BUS-004); se pueden cambiar sin tocar la API. */
export interface Plantilla {
  id: string;
  titulo: string;
  filtros: Record<string, string>;
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'defensor-joven',
    titulo: 'Defensor joven hasta EUR 1 M',
    filtros: { posicion: 'defensor', edad_max: '23', presupuesto_max_eur: '1000000' },
  },
  {
    id: 'mediocampista-recuperador',
    titulo: 'Mediocampista que recupera mucho',
    filtros: { posicion: 'mediocampista', recuperaciones_min: '3', minutos_min: '900' },
  },
  {
    id: 'delantero-joven',
    titulo: 'Delantero de hasta 25 años',
    filtros: { posicion: 'delantero', edad_max: '25' },
  },
  {
    id: 'arquero-con-minutos',
    titulo: 'Arquero con minutos',
    filtros: { posicion: 'arquero', minutos_min: '1500' },
  },
];
