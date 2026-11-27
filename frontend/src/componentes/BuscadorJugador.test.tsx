import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { buscarJugadores } from '../servicios/jugadores';
import type { JugadorResumen, RespuestaBusqueda } from '../tipos/api';
import BuscadorJugador from './BuscadorJugador';

vi.mock('../servicios/jugadores', () => ({ buscarJugadores: vi.fn() }));
const buscarMock = vi.mocked(buscarJugadores);

const j = (id: number, nombre: string): JugadorResumen =>
  ({
    id,
    nombre: `${nombre[0]}.`,
    nombre_completo: nombre,
    equipo: 'Club',
    posicion: 'defensor',
    edad: 22,
  }) as JugadorResumen;
const resp = (resultados: JugadorResumen[]) => ({ resultados }) as RespuestaBusqueda;

describe('CMP-005: buscador de jugadores', () => {
  afterEach(() => buscarMock.mockReset());

  it('busca por nombre con el campo nombre y pide pocos resultados', async () => {
    buscarMock.mockResolvedValue(resp([j(5, 'Lucas Pérez')]));
    render(<BuscadorJugador excluirIds={[]} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar jugador por nombre'), {
      target: { value: 'luc' },
    });
    await screen.findByRole('button', { name: /Lucas Pérez/ });
    const filtros = buscarMock.mock.calls[0][0];
    expect(filtros.get('nombre')).toBe('luc');
    expect(filtros.get('tamano')).toBe('6');
  });

  it('no busca con menos de 2 letras', async () => {
    render(<BuscadorJugador excluirIds={[]} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar jugador por nombre'), {
      target: { value: 'l' },
    });
    await new Promise((r) => setTimeout(r, 400));
    expect(buscarMock).not.toHaveBeenCalled();
  });

  it('no ofrece a quien ya está en la comparación', async () => {
    buscarMock.mockResolvedValue(resp([j(1, 'Ana Gómez'), j(5, 'Ana Lima')]));
    render(<BuscadorJugador excluirIds={[1]} onElegir={vi.fn()} onCerrar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar jugador por nombre'), {
      target: { value: 'ana' },
    });
    await screen.findByRole('button', { name: /Ana Lima/ });
    expect(screen.queryByRole('button', { name: /Ana Gómez/ })).toBeNull();
  });

  it('al elegir devuelve el jugador', async () => {
    const onElegir = vi.fn();
    buscarMock.mockResolvedValue(resp([j(5, 'Lucas Pérez')]));
    render(<BuscadorJugador excluirIds={[]} onElegir={onElegir} onCerrar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Buscar jugador por nombre'), {
      target: { value: 'luc' },
    });
    fireEvent.click(await screen.findByRole('button', { name: /Lucas Pérez/ }));
    expect(onElegir).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
  });

  it('sin resultados lo dice, y Escape cierra', async () => {
    const onCerrar = vi.fn();
    buscarMock.mockResolvedValue(resp([]));
    render(<BuscadorJugador excluirIds={[]} onElegir={vi.fn()} onCerrar={onCerrar} />);
    const campo = screen.getByLabelText('Buscar jugador por nombre');
    fireEvent.change(campo, { target: { value: 'zzz' } });
    expect(await screen.findByText('No encontramos jugadores con ese nombre')).toBeInTheDocument();
    fireEvent.keyDown(campo, { key: 'Escape' });
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
  });
});
