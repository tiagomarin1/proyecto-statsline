import { fireEvent, render, screen } from '@testing-library/react';

import BarraFiltros from './BarraFiltros';

const base = { ligas: [], onCambiar: vi.fn() };
const conFiltros = new URLSearchParams('posicion=defensor&edad_min=20');

describe('UI-009: filtros y resumen', () => {
  afterEach(() => vi.clearAllMocks());

  it('el modo filtros muestra el formulario con "Ver resultados" como botón principal', () => {
    render(<BarraFiltros {...base} params={new URLSearchParams()} onGuardarPerfil={vi.fn()} />);
    expect(screen.getByLabelText('Nombre del jugador')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver resultados' })).toHaveClass('btn--primary');
    expect(screen.getByRole('button', { name: 'Guardar perfil de búsqueda' })).toHaveClass(
      'btn--ghost',
    );
  });

  it('"Ver resultados" entrega los filtros del formulario', () => {
    const onVer = vi.fn();
    render(<BarraFiltros {...base} params={conFiltros} onVerResultados={onVer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(onVer).toHaveBeenCalledWith({ posicion: 'defensor', edad_min: '20' });
  });

  it('"Ver resultados" incluye lo que se acaba de escribir y no cae en el aplicado solo', () => {
    vi.useFakeTimers();
    const onVer = vi.fn();
    render(<BarraFiltros {...base} params={conFiltros} onVerResultados={onVer} />);
    fireEvent.change(screen.getByLabelText('Edad máxima'), { target: { value: '27' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultados' }));
    vi.advanceTimersByTime(1000);
    expect(onVer).toHaveBeenCalledWith({ posicion: 'defensor', edad_min: '20', edad_max: '27' });
    // lo pendiente se cancela: no se aplica además por su cuenta
    expect(base.onCambiar).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('el modo filtros no muestra chips ni "Modificar filtros"', () => {
    render(<BarraFiltros {...base} params={conFiltros} />);
    expect(screen.queryByRole('list', { name: 'Filtros aplicados' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modificar filtros' })).toBeNull();
  });

  it('el modo resumen muestra los chips, "Limpiar todo" y "Modificar filtros", sin formulario', () => {
    const onModificar = vi.fn();
    render(<BarraFiltros {...base} modo="resumen" params={conFiltros} onModificar={onModificar} />);
    expect(screen.queryByLabelText('Nombre del jugador')).toBeNull();
    expect(screen.getByRole('list', { name: 'Filtros aplicados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar todo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Modificar filtros' }));
    expect(onModificar).toHaveBeenCalled();
  });

  it('el modo resumen sin filtros dice que se muestran todos los jugadores', () => {
    render(<BarraFiltros {...base} modo="resumen" params={new URLSearchParams()} />);
    expect(screen.getByText('Sin filtros: se muestran todos los jugadores.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Filtros aplicados' })).toBeNull();
  });
});
