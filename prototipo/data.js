/* ScoutIAndo · Prototipo v1 — datos de demostración
   Jugadores, clubes y métricas FICTICIOS, generados para el prototipo.
   En el MVP v1 esta estructura se reemplaza por la respuesta de API-Football
   (ver card "Sincronizar datos de jugadores desde API-Football" en el Trello).
   Un valor null significa "métrica no disponible para esa liga/jugador". */

window.SCOUTIANDO_DATA = (function () {
  var LIGAS = [
    { id: 'pn', nombre: 'Primera Nacional',        cobertura: 'completa' },
    { id: 'bm', nombre: 'Primera B Metropolitana', cobertura: 'completa' },
    { id: 'pc', nombre: 'Primera C',               cobertura: 'basica' },
    { id: 'pd', nombre: 'Primera D',               cobertura: 'basica' },
    { id: 'fa', nombre: 'Torneo Federal A',        cobertura: 'basica' },
    { id: 'pe', nombre: 'Primera E',               cobertura: 'sin_datos' }
  ];

  var POSICIONES = [
    'Arquero', 'Lateral derecho', 'Lateral izquierdo', 'Defensor central',
    'Mediocampista central', 'Mediocampista ofensivo', 'Volante por derecha',
    'Volante por izquierda', 'Extremo', 'Delantero'
  ];

  /* Las 5 métricas tácticas del wireframe. El peso es el usado para el Score
     (definición provisoria: promedio ponderado normalizado 0-100). */
  var METRICAS = [
    { key: 'pases',   label: '% pases completados',   corto: 'Pases',         unidad: '%',    peso: 0.30, decimales: 0 },
    { key: 'duelos',  label: 'Duelos ganados',        corto: 'Duelos',        unidad: '%',    peso: 0.25, decimales: 0 },
    { key: 'recup',   label: 'Recuperaciones',        corto: 'Recuperaciones', unidad: '/p',  peso: 0.20, decimales: 1 },
    { key: 'centros', label: 'Centros',               corto: 'Centros',       unidad: '/p',   peso: 0.10, decimales: 1 },
    { key: 'dist',    label: 'Distancia recorrida',   corto: 'Distancia',     unidad: ' km',  peso: 0.15, decimales: 1 }
  ];

  function j(id, nom, club, liga, pos, edad, valor, pases, duelos, recup, centros, dist, part, min) {
    return {
      id: id, nom: nom, club: club, liga: liga, pos: pos, edad: edad, valor: valor,
      pases: pases, duelos: duelos, recup: recup, centros: centros, dist: dist,
      part: part, min: min
    };
  }

  var JUGADORES = [
    /* --- Laterales derechos (la búsqueda que trae el prototipo por defecto) --- */
    j(1,  'Nahuel Ferreyra',   'Deportivo Norte',        'pn', 'Lateral derecho', 23,  85000, 87, 61, 7.4, 4.1, 10.8, 28, 2410),
    j(2,  'Emanuel Quiroga',   'Atlético Ribera',        'pn', 'Lateral derecho', 26, 120000, 83, 58, 6.8, 5.2, 10.2, 31, 2740),
    j(3,  'Franco Olivera',    'Sportivo Llanura',       'bm', 'Lateral derecho', 21,  65000, 81, 56, 6.2, 3.4, 11.1, 24, 1980),
    j(4,  'Ignacio Barreto',   'Unión del Valle',        'bm', 'Lateral derecho', 29, 140000, 80, 63, 6.0, 2.8,  9.6, 30, 2650),
    j(5,  'Lucas Verón',       'Social Sierra',          'pc', 'Lateral derecho', 19,  42000, 78, 52, 5.1, null, null, 18, 1290),
    j(6,  'Matías Sosa',       'Club Puerto Alegre',     'pc', 'Lateral derecho', 24,  58000, 84, 57, 6.5, null, null, 26, 2180),
    j(7,  'Alan Peralta',      'Defensores del Oeste',   'fa', 'Lateral derecho', 27,  95000, 76, 60, 7.1, 2.2, null, 29, 2520),
    j(8,  'Bruno Maidana',     'Atlético Las Flores',    'pn', 'Lateral derecho', 31, 180000, 88, 64, 7.8, 4.6, 10.4, 33, 2910),

    /* --- Laterales izquierdos --- */
    j(9,  'Thiago Ledesma',    'Deportivo Alto Verde',   'pn', 'Lateral izquierdo', 22,  92000, 85, 59, 6.9, 4.8, 10.9, 27, 2330),
    j(10, 'Gonzalo Ibarra',    'Sportivo Barranca',      'bm', 'Lateral izquierdo', 25,  74000, 82, 55, 6.1, 3.9, 10.5, 29, 2480),
    j(11, 'Ramiro Cáceres',    'Unión Ferroviaria',      'pd', 'Lateral izquierdo', 20,  31000, 79, 54, 5.8, null, null, 21, 1640),
    j(12, 'Joaquín Rivas',     'Racing de Arroyo Seco',  'fa', 'Lateral izquierdo', 28, 110000, 86, 57, 6.4, 4.2, null, 32, 2800),

    /* --- Defensores centrales --- */
    j(13, 'Hernán Giménez',    'Deportivo Norte',        'pn', 'Defensor central', 30, 165000, 89, 68, 8.9, 0.6, 9.1, 32, 2880),
    j(14, 'Diego Arrieta',     'Atlético Ribera',        'pn', 'Defensor central', 24, 135000, 86, 66, 8.2, 0.4, 9.4, 30, 2700),
    j(15, 'Sebastián Núñez',   'Unión del Valle',        'bm', 'Defensor central', 27,  88000, 84, 64, 7.9, 0.5, 9.0, 28, 2520),
    j(16, 'Maximiliano Ortiz', 'Club Atlético Médano',   'pc', 'Defensor central', 22,  49000, 81, 62, 7.4, null, null, 25, 2110),
    j(17, 'Rodrigo Villalba',  'Social y Deportivo Quebrada', 'pd', 'Defensor central', 33, 28000, 77, 65, 8.1, null, null, 27, 2430),
    j(18, 'Facundo Bustos',    'Defensores del Oeste',   'fa', 'Defensor central', 26,  72000, 83, 63, 7.7, 0.3, null, 31, 2760),

    /* --- Mediocampistas centrales --- */
    j(19, 'Agustín Cardozo',   'Deportivo Norte',        'pn', 'Mediocampista central', 25, 210000, 92, 57, 9.1, 1.8, 11.4, 33, 2950),
    j(20, 'Leandro Paz',       'Sportivo Llanura',       'bm', 'Mediocampista central', 23, 128000, 90, 55, 8.6, 1.4, 11.2, 29, 2510),
    j(21, 'Tomás Herrera',     'Atlético Las Flores',    'pn', 'Mediocampista central', 28, 175000, 88, 59, 8.8, 2.1, 10.8, 31, 2770),
    j(22, 'Marcos Aguirre',    'Unión Ferroviaria',      'pc', 'Mediocampista central', 20,  45000, 85, 51, 7.6, null, null, 22, 1720),
    j(23, 'Ezequiel Romero',   'Club Puerto Alegre',     'pc', 'Mediocampista central', 26,  66000, 87, 54, 8.0, null, null, 28, 2440),
    j(24, 'Darío Sandoval',    'Racing de Arroyo Seco',  'fa', 'Mediocampista central', 31, 102000, 86, 58, 8.4, 1.6, null, 30, 2690),
    j(25, 'Iván Correa',       'Social Sierra',          'pd', 'Mediocampista central', 18,  22000, 80, 48, 6.9, null, null, 14,  890),

    /* --- Mediocampistas ofensivos --- */
    j(26, 'Juan Cruz Ávalos',  'Atlético Ribera',        'pn', 'Mediocampista ofensivo', 24, 230000, 86, 49, 5.2, 3.1, 10.6, 30, 2560),
    j(27, 'Santino Escobar',   'Deportivo Alto Verde',   'pn', 'Mediocampista ofensivo', 21, 195000, 84, 46, 4.8, 3.6, 10.9, 26, 2050),
    j(28, 'Nicolás Bravo',     'Sportivo Barranca',      'bm', 'Mediocampista ofensivo', 27, 118000, 82, 51, 5.5, 2.9, 10.1, 29, 2470),
    j(29, 'Mauro Campos',      'Club Atlético Médano',   'pc', 'Mediocampista ofensivo', 23,  54000, 79, 47, 4.9, null, null, 24, 1930),

    /* --- Volantes por derecha --- */
    j(30, 'Lautaro Benítez',   'Deportivo Norte',        'pn', 'Volante por derecha', 22, 160000, 81, 52, 5.6, 5.8, 11.3, 28, 2290),
    j(31, 'Kevin Molina',      'Unión del Valle',        'bm', 'Volante por derecha', 25,  97000, 78, 50, 5.1, 6.4, 10.7, 27, 2210),
    j(32, 'Elías Figueroa',    'Defensores del Oeste',   'fa', 'Volante por derecha', 29,  69000, 76, 53, 5.4, 4.9, null, 31, 2630),

    /* --- Volantes por izquierda --- */
    j(33, 'Valentín Ojeda',    'Atlético Las Flores',    'pn', 'Volante por izquierda', 20, 148000, 80, 48, 5.0, 5.5, 11.0, 25, 1980),
    j(34, 'Brian Acosta',      'Sportivo Llanura',       'bm', 'Volante por izquierda', 26, 105000, 79, 51, 5.3, 6.1, 10.4, 30, 2590),
    j(35, 'Cristian Lezcano',  'Unión Ferroviaria',      'pd', 'Volante por izquierda', 24,  38000, 75, 46, 4.6, null, null, 23, 1810),

    /* --- Extremos --- */
    j(36, 'Jeremías Ponce',    'Atlético Ribera',        'pn', 'Extremo', 19, 240000, 77, 45, 4.2, 4.4, 11.5, 24, 1760),
    j(37, 'Axel Domínguez',    'Deportivo Alto Verde',   'pn', 'Extremo', 23, 182000, 79, 47, 4.5, 5.0, 11.1, 29, 2380),
    j(38, 'Enzo Chávez',       'Club Puerto Alegre',     'pc', 'Extremo', 21,  51000, 74, 43, 3.9, null, null, 20, 1480),

    /* --- Delanteros --- */
    j(39, 'Lisandro Medina',   'Deportivo Norte',        'pn', 'Delantero', 27, 320000, 75, 54, 3.4, 1.2, 10.3, 32, 2810),
    j(40, 'Fabricio Luna',     'Atlético Las Flores',    'pn', 'Delantero', 24, 265000, 73, 51, 3.2, 1.0, 10.6, 30, 2520),
    j(41, 'Walter Godoy',      'Unión del Valle',        'bm', 'Delantero', 30, 134000, 71, 56, 3.6, 0.9,  9.8, 31, 2700),
    j(42, 'Lucio Maldonado',   'Social Sierra',          'pc', 'Delantero', 22,  61000, 69, 49, 3.1, null, null, 26, 2080),
    j(43, 'Milton Figueredo',  'Racing de Arroyo Seco',  'fa', 'Delantero', 25,  88000, 72, 52, 3.3, 1.1, null, 28, 2350),

    /* --- Arqueros (los centros y la distancia no aplican a la posición) --- */
    j(44, 'Ariel Zapata',      'Deportivo Norte',        'pn', 'Arquero', 29, 115000, 72, 71, 1.2, null, null, 33, 2970),
    j(45, 'Gastón Rolón',      'Sportivo Barranca',      'bm', 'Arquero', 26,  78000, 68, 68, 1.0, null, null, 30, 2700),
    j(46, 'Pablo Insaurralde', 'Club Atlético Médano',   'pd', 'Arquero', 23,  34000, 65, 66, 0.9, null, null, 24, 2160)
  ];

  /* Cuenta de demostración, para que la pantalla de Login sea usable en la demo. */
  var CUENTA_DEMO = {
    email: 'javier@deportivonorte.com',
    pass: 'scoutiando',
    nombre: 'Javier Ledesma',
    rol: 'Director técnico',
    club: 'Deportivo Norte'
  };

  return {
    LIGAS: LIGAS,
    POSICIONES: POSICIONES,
    METRICAS: METRICAS,
    JUGADORES: JUGADORES,
    CUENTA_DEMO: CUENTA_DEMO
  };
})();
