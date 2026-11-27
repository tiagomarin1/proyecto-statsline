import { formatearNumero, iniciales } from './formato';

describe('UI-010: formato de números y avatar', () => {
  it('los números usan la coma decimal argentina y hasta 2 decimales', () => {
    expect(formatearNumero(6.45)).toBe('6,45');
    expect(formatearNumero(2.6)).toBe('2,6');
    expect(formatearNumero(3)).toBe('3');
    expect(formatearNumero(3.4000000000000004)).toBe('3,4');
    expect(formatearNumero(1890)).toBe('1.890');
    expect(formatearNumero(0)).toBe('0');
  });

  it('las iniciales salen de las dos primeras palabras del nombre', () => {
    expect(iniciales('L. Magallán')).toBe('LM');
    expect(iniciales('Nahuel Ferreyra')).toBe('NF');
    expect(iniciales('Juan Pablo Pérez')).toBe('JP');
    expect(iniciales('Ñandú')).toBe('ÑA');
    expect(iniciales('  ')).toBe('?');
  });
});
