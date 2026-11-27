import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DialogoPdf from './DialogoPdf';

describe('CMP-002: diálogo de notas del PDF', () => {
  it('es un diálogo con el foco adentro, cuadro de notas con contador y los dos botones', () => {
    render(<DialogoPdf onCerrar={vi.fn()} onDescargar={vi.fn()} />);
    const dialogo = screen.getByRole('dialog', { name: 'Exportar PDF' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    const notas = screen.getByLabelText('Notas (opcional)');
    expect(notas).toHaveFocus();
    expect(notas).toHaveAttribute('maxLength', '500');
    expect(screen.getByText('0 / 500')).toBeInTheDocument();
    fireEvent.change(notas, { target: { value: 'Verlo el sábado' } });
    expect(screen.getByText('15 / 500')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeInTheDocument();
  });

  it('Escape y "Cancelar" cierran', () => {
    const cerrar = vi.fn();
    render(<DialogoPdf onCerrar={cerrar} onDescargar={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cerrar).toHaveBeenCalledTimes(2);
  });

  it('"Descargar PDF" manda las notas, muestra la carga y cierra al terminar', async () => {
    let terminar: () => void = () => {};
    const descargar = vi.fn(() => new Promise<void>((r) => (terminar = r)));
    const cerrar = vi.fn();
    render(<DialogoPdf onCerrar={cerrar} onDescargar={descargar} />);
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), { target: { value: 'Ojo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(descargar).toHaveBeenCalledWith('Ojo');
    const boton = screen.getByRole('button', { name: 'Generando PDF…' });
    expect(boton).toBeDisabled();
    terminar();
    await waitFor(() => expect(cerrar).toHaveBeenCalled());
  });

  it('si falla lo dice y deja probar de nuevo', async () => {
    const descargar = vi.fn().mockRejectedValue(new Error('x'));
    const cerrar = vi.fn();
    render(<DialogoPdf onCerrar={cerrar} onDescargar={descargar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos generar el PDF. Probá de nuevo.',
    );
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
    expect(cerrar).not.toHaveBeenCalled();
  });
});
