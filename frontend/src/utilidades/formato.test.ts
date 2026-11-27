import { formatearNumero, iniciales, nombrePropio, primerNombre } from './formato';

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

describe('UI-012: nombre del usuario con mayúscula inicial (solo al mostrarlo)', () => {
  it.each([
    ['tiago marin', 'Tiago Marin'],
    ['TIAGO MARIN', 'Tiago Marin'],
    ['tiago', 'Tiago'],
    ['  tiago   marin ', 'Tiago Marin'],
    ['maría de la cruz', 'María de la Cruz'],
    ['MARÍA DE LA CRUZ', 'María de la Cruz'],
    ['juan pablo del valle', 'Juan Pablo del Valle'],
    ['ana-maría', 'Ana-María'],
    ["o'brien", "O'Brien"],
    ['McDonald', 'McDonald'],
    ['leonardo DiCaprio', 'Leonardo DiCaprio'],
    ["O'Brien", "O'Brien"],
    ['j. p. gómez', 'J. P. Gómez'],
    ['ñandú', 'Ñandú'],
    ['ÑANDÚ PÉREZ', 'Ñandú Pérez'],
    ['Javier Ledesma', 'Javier Ledesma'],
  ])('"%s" se muestra "%s"', (entrada, esperado) => {
    expect(nombrePropio(entrada)).toBe(esperado);
  });

  it('las partículas van en minúscula salvo que sean la primera palabra', () => {
    expect(nombrePropio('de la cruz')).toBe('De la Cruz');
    expect(nombrePropio('ana y pedro dos santos')).toBe('Ana y Pedro dos Santos');
    expect(nombrePropio('ludwig van der berg')).toBe('Ludwig van der Berg');
    expect(nombrePropio('carlos di maría')).toBe('Carlos di María');
  });

  it('una partícula ya escrita con mayúscula y minúscula se respeta', () => {
    expect(nombrePropio('María De la cruz')).toBe('María De la Cruz');
  });

  it('vacío o solo espacios devuelve ""', () => {
    expect(nombrePropio('')).toBe('');
    expect(nombrePropio('   ')).toBe('');
  });

  it('primerNombre devuelve la primera palabra ya normalizada', () => {
    expect(primerNombre('tiago marin')).toBe('Tiago');
    expect(primerNombre('TIAGO MARIN')).toBe('Tiago');
    expect(primerNombre('  javier  ledesma ')).toBe('Javier');
    expect(primerNombre('ana-maría lópez')).toBe('Ana-María');
    expect(primerNombre('Javier')).toBe('Javier');
    expect(primerNombre('')).toBe('');
    expect(primerNombre('   ')).toBe('');
  });
});
