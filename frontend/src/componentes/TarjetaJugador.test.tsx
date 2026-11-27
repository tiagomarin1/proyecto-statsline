import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { JugadorResumen } from '../tipos/api';
import TarjetaJugador from './TarjetaJugador';

const JUGADOR: JugadorResumen = {
  id: 7,
  nombre: 'N. Ferreyra',
  nombre_completo: 'Nahuel Ferreyra',
  posicion: 'defensor',
  edad: 23,
  equipo: 'Deportivo Norte',
  liga: { id: 1, nombre: 'Liga Profesional', cobertura: 'completa' },
  temporada: 2026,
  minutos_jugados: 2410,
  pases_precision_pct: 72,
  duelos_ganados_pct: 61.5,
  recuperaciones_por_partido: 2.6,
  rating: 6.45,
  valor_mercado_eur: 850000,
  en_seguimiento: false,
};

function ver(
  j: JugadorResumen = JUGADOR,
  extra: Partial<Parameters<typeof TarjetaJugador>[0]> = {},
) {
  return render(
    <MemoryRouter>
      <TarjetaJugador
        jugador={j}
        filtros="ver=1&posicion=defensor"
        onAlternarSeguimiento={vi.fn()}
        {...extra}
      />
    </MemoryRouter>,
  );
}

describe('UI-010: tarjeta de jugador', () => {
  it('muestra el nombre completo, la posición, la edad, el equipo y la liga', () => {
    ver();
    expect(screen.getByRole('heading', { name: 'Nahuel Ferreyra' })).toBeInTheDocument();
    expect(screen.getByText(/Defensor/)).toBeInTheDocument();
    expect(screen.getByText(/23 años/)).toBeInTheDocument();
    expect(screen.getByText(/Deportivo Norte/)).toBeInTheDocument();
    expect(screen.getByText(/Liga Profesional/)).toBeInTheDocument();
  });

  it('tiene un avatar con las iniciales que no se anuncia a lectores de pantalla', () => {
    const { container } = ver();
    const avatar = container.querySelector('.avatar') as HTMLElement;
    expect(avatar).toHaveTextContent('NF');
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveClass('avatar--defensor');
  });

  it('JUG-004: usa el nombre completo y no el abreviado de la fuente, también en las iniciales', () => {
    const { container } = ver(
      {
        ...JUGADOR,
        nombre: 'M. Rojo',
        nombre_completo: 'Faustino Marcos Alberto Rojo',
      },
      { onAlternarSeleccion: vi.fn() },
    );
    expect(
      screen.getByRole('heading', { name: 'Faustino Marcos Alberto Rojo' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('M. Rojo')).toBeNull();
    expect(container.querySelector('.avatar')).toHaveTextContent('FM');
    expect(
      screen.getByRole('checkbox', { name: 'Comparar a Faustino Marcos Alberto Rojo' }),
    ).toBeInTheDocument();
  });

  it('muestra todos los datos con formato argentino', () => {
    ver();
    expect(screen.getByText('EUR 850.000')).toBeInTheDocument();
    expect(screen.getByText('6,45')).toBeInTheDocument(); // rating
    expect(screen.getByText('2.410')).toBeInTheDocument(); // minutos
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('61,5%')).toBeInTheDocument();
    expect(screen.getByText('2,6')).toBeInTheDocument();
    for (const etiqueta of [
      'Valor de mercado',
      'Rating',
      'Minutos',
      '% pases',
      '% duelos',
      'Recuperaciones',
    ]) {
      expect(screen.getByText(etiqueta)).toBeInTheDocument();
    }
  });

  it('los porcentajes llevan una barra que muestra el valor', () => {
    const { container } = ver();
    const barras = [...container.querySelectorAll<HTMLElement>('.pcard__barra i')];
    expect(barras.map((b) => b.style.width)).toEqual(['72%', '61.5%']);
    barras.forEach((b) =>
      expect(b.closest('.pcard__barra')).toHaveAttribute('aria-hidden', 'true'),
    );
  });

  it('un dato que falta dice "Dato no disponible", nunca 0, y su barra queda vacía (RN-008)', () => {
    const { container } = ver({
      ...JUGADOR,
      pases_precision_pct: null,
      valor_mercado_eur: null,
      rating: null,
    });
    expect(screen.getAllByText('Dato no disponible')).toHaveLength(3);
    expect(screen.queryByText('0')).toBeNull();
    const barras = [...container.querySelectorAll<HTMLElement>('.pcard__barra i')];
    expect(barras[0].style.width).toBe('0%');
  });

  it('el chip "Datos básicos" aparece en ligas de cobertura básica', () => {
    ver({ ...JUGADOR, liga: { id: 2, nombre: 'Primera Nacional', cobertura: 'basica' } });
    expect(screen.getByText('Datos básicos')).toBeInTheDocument();
  });

  it('"Ver ficha" lleva a la ficha con los filtros de la búsqueda', () => {
    ver();
    expect(screen.getByRole('link', { name: /Ver ficha/ })).toHaveAttribute(
      'href',
      '/ficha/7?ver=1&posicion=defensor',
    );
  });

  it('la estrella guarda en seguimiento y refleja el estado', () => {
    const alternar = vi.fn();
    ver(JUGADOR, { onAlternarSeguimiento: alternar });
    const estrella = screen.getByRole('button', { name: 'Guardar en la lista de seguimiento' });
    expect(estrella).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(estrella);
    expect(alternar).toHaveBeenCalledWith(JUGADOR);
  });

  it('sin selección para comparar no hay casilla; con ella, se elige y se resalta', () => {
    const { container, rerender } = ver();
    expect(screen.queryByRole('checkbox')).toBeNull();

    const alternarSeleccion = vi.fn();
    rerender(
      <MemoryRouter>
        <TarjetaJugador
          jugador={JUGADOR}
          onAlternarSeguimiento={vi.fn()}
          seleccionado
          onAlternarSeleccion={alternarSeleccion}
        />
      </MemoryRouter>,
    );
    const casilla = screen.getByRole('checkbox', { name: 'Comparar a Nahuel Ferreyra' });
    expect(casilla).toBeChecked();
    expect(container.querySelector('article')).toHaveClass('is-sel');
    fireEvent.click(casilla);
    expect(alternarSeleccion).toHaveBeenCalledWith(JUGADOR);
    expect(within(container.querySelector('article')!).getByText('Comparar')).toBeInTheDocument();
  });
});
