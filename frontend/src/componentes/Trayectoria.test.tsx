import { render, screen } from '@testing-library/react';

import type { ClubEnTrayectoria } from '../tipos/api';
import Trayectoria from './Trayectoria';

const CLUBES: ClubEnTrayectoria[] = [
  { club: 'Deportivo Merlo', actual: true, tramos: [{ desde: 2024, hasta: 2025 }] },
  { club: 'Atlanta', actual: false, tramos: [{ desde: 2023, hasta: 2023 }] },
  {
    club: 'Chacarita Juniors',
    actual: false,
    tramos: [
      { desde: 2016, hasta: 2017 },
      { desde: 2008, hasta: 2008 },
    ],
  },
  { club: 'Vargas Torres', actual: false, tramos: [] },
];

describe('JUG-003: trayectoria en la ficha (RN-032)', () => {
  it('lista los clubes en el orden recibido y marca el actual', () => {
    render(<Trayectoria trayectoria={CLUBES} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Deportivo Merlo');
    expect(items[0]).toHaveTextContent('Actual');
    expect(items[1]).not.toHaveTextContent('Actual');
  });

  it('muestra los tramos como rango y un solo año sin rango', () => {
    render(<Trayectoria trayectoria={CLUBES} />);

    expect(screen.getByText('2024–2025')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('2016–2017 · 2008')).toBeInTheDocument();
  });

  it('un club sin años dice "Sin año" y no un 0', () => {
    render(<Trayectoria trayectoria={CLUBES} />);

    expect(screen.getByText('Sin año')).toBeInTheDocument();
  });

  it('si nunca se sincronizó dice "Trayectoria no disponible"', () => {
    render(<Trayectoria trayectoria={null} />);

    expect(screen.getByText('Trayectoria no disponible')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('con solo el club actual avisa que no hay clubes anteriores registrados', () => {
    render(<Trayectoria trayectoria={[{ club: 'Deportivo Merlo', actual: true, tramos: [] }]} />);

    expect(screen.getByText('No hay clubes anteriores registrados')).toBeInTheDocument();
  });
});
