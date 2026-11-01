import { render, screen } from '@testing-library/react';

import Dato from './Dato';

describe('RN-008: Dato no disponible', () => {
  it('un valor nulo se muestra como "Dato no disponible", nunca como 0', () => {
    render(<Dato valor={null} />);
    expect(screen.getByText('Dato no disponible')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('un 0 real se muestra como 0 (no es dato faltante)', () => {
    render(<Dato valor={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('Dato no disponible')).not.toBeInTheDocument();
  });

  it('muestra el valor con su sufijo', () => {
    render(<Dato valor={61} sufijo="%" />);
    expect(screen.getByText('61%')).toBeInTheDocument();
  });
});
