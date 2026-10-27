/* ScoutIAndo · Prototipo v1
   Prototipo navegable de las pantallas del MVP: Home, Login, Registro,
   Búsqueda, Comparador, Ficha y Lista de seguimiento.
   Sin backend: la sesión, los favoritos y el perfil de búsqueda se guardan
   en el navegador de quien lo abre. */

(function () {
  'use strict';

  var D = window.SCOUTIANDO_DATA;
  var METRICAS = D.METRICAS, JUGADORES = D.JUGADORES, LIGAS = D.LIGAS, POSICIONES = D.POSICIONES;

  var LIGA = {};
  LIGAS.forEach(function (l) { LIGA[l.id] = l; });

  var PAGE_SIZE = 6;
  var MAX_CMP = 3;
  var VISTAS = ['home', 'planes', 'como', 'login', 'registro', 'buscar', 'comparar', 'ficha', 'seguimiento'];
  var PRIVADAS = ['buscar', 'comparar', 'ficha', 'seguimiento'];

  /* ---------------- almacenamiento ---------------- */

  var KEY = 'scoutiando.proto.v1';

  function leer() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function guardar() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        user: S.user, favs: S.favs, perfil: S.perfil, cuentas: S.cuentas, demobar: S.demobar
      }));
    } catch (e) { /* modo privado o storage bloqueado: el prototipo sigue andando */ }
  }

  var guardado = leer();

  var S = {
    vista: 'home',
    user: guardado.user || null,
    cuentas: guardado.cuentas || [],
    favs: guardado.favs || [],
    perfil: guardado.perfil || null,
    demobar: guardado.demobar !== false,
    filtros: filtrosPorDefecto(),
    sel: [],
    orden: 'score',
    pagina: 1,
    jugadorId: null,
    menuAbierto: false,
    navAbierta: false,
    cajonAbierto: false,
    errLogin: null,
    errReg: null,
    verPass: {}
  };

  function filtrosPorDefecto() {
    /* Los mismos valores que trae la pantalla 4 del wireframe mid-fi. */
    return {
      posicion: 'Lateral derecho',
      liga: '',
      edadMin: 17,
      edadMax: 34,
      presupuesto: 150000,
      pases: 80,
      duelos: 55,
      recup: 6
    };
  }

  /* ---------------- utilidades ---------------- */

  function h(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function usd(n) {
    return 'USD ' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }

  function usdCorto(n) {
    return 'USD ' + Math.round(n / 1000) + 'K';
  }

  function metrica(key) {
    for (var i = 0; i < METRICAS.length; i++) if (METRICAS[i].key === key) return METRICAS[i];
    return null;
  }

  function valorMetrica(p, key) {
    var m = metrica(key), v = p[key];
    if (v == null) return null;
    return v.toFixed(m.decimales) + m.unidad;
  }

  function nd(texto) {
    return '<span class="nd" title="' + h(texto || 'La liga de este jugador no publica esta métrica') + '">Dato no disponible</span>';
  }

  function porPosicion(pos) {
    return JUGADORES.filter(function (p) { return p.pos === pos; });
  }

  /* Límites para normalizar: por posición (un lateral se compara con laterales).
     Si la posición tiene menos de 3 valores, se usa el total de la base. */
  var LIMITES = {};

  function limites(pos, key) {
    var k = pos + '|' + key;
    if (LIMITES[k]) return LIMITES[k];
    var vals = porPosicion(pos).map(function (p) { return p[key]; }).filter(function (v) { return v != null; });
    if (vals.length < 3) vals = JUGADORES.map(function (p) { return p[key]; }).filter(function (v) { return v != null; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    LIMITES[k] = { min: min, max: max === min ? min + 1 : max };
    return LIMITES[k];
  }

  function promedio(pos, key) {
    var vals = porPosicion(pos).map(function (p) { return p[key]; }).filter(function (v) { return v != null; });
    if (!vals.length) return null;
    return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }

  /* Score provisorio: promedio ponderado de las métricas normalizadas 0-100
     contra el resto de los jugadores de la misma posición. Si faltan métricas,
     se reparten los pesos entre las disponibles y el score queda marcado como
     parcial. (Definición a confirmar con el PO: ver card del Trello.) */
  function score(p) {
    var acc = 0, pesos = 0, faltan = 0;
    METRICAS.forEach(function (m) {
      var v = p[m.key];
      if (v == null) { faltan++; return; }
      var b = limites(p.pos, m.key);
      var n = (v - b.min) / (b.max - b.min);
      acc += Math.max(0, Math.min(1, n)) * m.peso;
      pesos += m.peso;
    });
    if (!pesos) return { v: null, parcial: true, faltan: faltan };
    return { v: Math.round((acc / pesos) * 100), parcial: faltan > 0, faltan: faltan };
  }

  function jugador(id) {
    for (var i = 0; i < JUGADORES.length; i++) if (JUGADORES[i].id === id) return JUGADORES[i];
    return null;
  }

  function esFav(id) { return S.favs.indexOf(id) !== -1; }

  /* ---------------- filtrado ---------------- */

  function pasaFiltros(p, f) {
    if (f.posicion && p.pos !== f.posicion) return false;
    if (f.liga && p.liga !== f.liga) return false;
    if (p.edad < f.edadMin || p.edad > f.edadMax) return false;
    if (p.valor > f.presupuesto) return false;
    /* Criterio de aceptación: si el jugador no tiene la métrica por la que se
       filtra, queda excluido (no se muestra con el dato vacío). */
    if (f.pases !== '' && f.pases != null) { if (p.pases == null || p.pases < f.pases) return false; }
    if (f.duelos !== '' && f.duelos != null) { if (p.duelos == null || p.duelos < f.duelos) return false; }
    if (f.recup !== '' && f.recup != null) { if (p.recup == null || p.recup < f.recup) return false; }
    return true;
  }

  function resultados(f) {
    var ls = JUGADORES.filter(function (p) { return pasaFiltros(p, f); });
    var dir = S.orden === 'valor' || S.orden === 'edad' ? 1 : -1;
    ls.sort(function (a, b) {
      var va, vb;
      if (S.orden === 'score') { va = score(a).v || 0; vb = score(b).v || 0; }
      else if (S.orden === 'valor') { va = a.valor; vb = b.valor; }
      else if (S.orden === 'edad') { va = a.edad; vb = b.edad; }
      else { va = a[S.orden] == null ? -1 : a[S.orden]; vb = b[S.orden] == null ? -1 : b[S.orden]; }
      if (va === vb) return a.nom.localeCompare(b.nom, 'es');
      return (va - vb) * dir;
    });
    return ls;
  }

  /* Cuántos quedaron afuera sólo por no tener la métrica cargada. */
  function excluidosPorFaltaDeDatos(f) {
    var sinMetricas = Object.assign({}, f, { pases: '', duelos: '', recup: '' });
    return JUGADORES.filter(function (p) {
      if (!pasaFiltros(p, sinMetricas)) return false;
      if (pasaFiltros(p, f)) return false;
      var falta = false;
      if (f.pases !== '' && p.pases == null) falta = true;
      if (f.duelos !== '' && p.duelos == null) falta = true;
      if (f.recup !== '' && p.recup == null) falta = true;
      return falta;
    }).length;
  }

  /* Para el estado vacío: qué filtro conviene relajar. */
  function filtroMasRestrictivo(f) {
    var candidatos = [
      { campo: 'posicion', etiqueta: 'la posición', valor: '' },
      { campo: 'liga', etiqueta: 'la liga', valor: '' },
      { campo: 'presupuesto', etiqueta: 'el presupuesto', valor: 999999999 },
      { campo: 'pases', etiqueta: 'el mínimo de pases completados', valor: '' },
      { campo: 'duelos', etiqueta: 'el mínimo de duelos ganados', valor: '' },
      { campo: 'recup', etiqueta: 'el mínimo de recuperaciones', valor: '' }
    ];
    var mejor = null;
    candidatos.forEach(function (c) {
      if (f[c.campo] === '' || f[c.campo] == null) return;
      if (c.campo === 'presupuesto' && f.presupuesto >= 999999999) return;
      var alt = Object.assign({}, f);
      alt[c.campo] = c.valor;
      var n = JUGADORES.filter(function (p) { return pasaFiltros(p, alt); }).length;
      if (!mejor || n > mejor.n) mejor = { etiqueta: c.etiqueta, n: n, campo: c.campo };
    });
    return mejor;
  }

  /* ---------------- toasts ---------------- */

  function toast(msg) {
    var cont = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(function () { el.remove(); }, 4200);
  }

  /* ---------------- navegación ---------------- */

  function ir(vista) {
    if (location.hash.replace('#', '') === vista) render();
    else location.hash = vista;
  }

  function rutaActual() {
    var t = location.hash.replace('#', '').trim();
    return VISTAS.indexOf(t) !== -1 ? t : 'home';
  }

  /* ---------------- barra superior ---------------- */

  function navSitio() {
    return '' +
      '<nav class="nav nav--site' + (S.navAbierta ? ' is-open' : '') + '" id="nav">' +
        '<a href="#planes">Planes</a>' +
        '<a href="#login">Ingresar</a>' +
        '<a class="nav__cta btn btn--sky btn--sm" href="#registro">Registrarse</a>' +
      '</nav>';
  }

  function navApp() {
    var v = S.vista;
    return '' +
      '<nav class="nav nav--app' + (S.navAbierta ? ' is-open' : '') + '" id="nav">' +
        '<a href="#buscar"' + (v === 'buscar' ? ' aria-current="page"' : '') + '>Buscar</a>' +
        '<a href="#comparar"' + (v === 'comparar' ? ' aria-current="page"' : '') + '>Comparar</a>' +
        '<a href="#reportes" data-act="r2" data-r2="Reportes">Reportes <span class="chip chip--r2">R2</span></a>' +
        '<a href="#seguimiento"' + (v === 'seguimiento' ? ' aria-current="page"' : '') + '>Mi club</a>' +
        '<span class="nav__sep"></span>' +
        '<div class="menu">' +
          '<button type="button" data-act="menu" aria-expanded="' + (S.menuAbierto ? 'true' : 'false') + '">' +
            h(S.user.nombre.split(' ')[0]) + ' &#9662;' +
          '</button>' +
          (S.menuAbierto ? panelCuenta() : '') +
        '</div>' +
      '</nav>';
  }

  function panelCuenta() {
    return '' +
      '<div class="menu__panel" role="menu">' +
        '<div class="menu__head">' +
          '<div><b>' + h(S.user.nombre) + '</b></div>' +
          '<div class="muted" style="font-size:13.5px">' + h(S.user.rol) + ' &middot; ' + h(S.user.club) + '</div>' +
        '</div>' +
        '<a href="#seguimiento" role="menuitem">Lista de seguimiento (' + S.favs.length + ')</a>' +
        '<button type="button" role="menuitem" data-act="r2" data-r2="Mi club">Datos del club <span class="chip chip--r2">R3</span></button>' +
        '<button type="button" role="menuitem" data-act="salir">Cerrar sesi&oacute;n</button>' +
      '</div>';
  }

  function renderTopbar() {
    var logueado = !!S.user;
    document.getElementById('topbar').innerHTML = '' +
      '<div class="topbar">' +
        '<div class="topbar__in wrap">' +
          '<a class="logo" href="#' + (logueado ? 'buscar' : 'home') + '">Scout<i>IA</i>ndo</a>' +
          '<button class="burger btn btn--onNavy btn--sm" type="button" data-act="nav" aria-expanded="' + (S.navAbierta ? 'true' : 'false') + '">Men&uacute;</button>' +
          (logueado ? navApp() : navSitio()) +
        '</div>' +
      '</div>';
  }

  function renderFoot() {
    document.getElementById('foot').innerHTML = '' +
      '<div class="foot">' +
        '<div class="foot__in wrap">' +
          '<span>ScoutIAndo &middot; Equipo 04 &middot; Seminario de Gesti&oacute;n de Tecnolog&iacute;a</span>' +
          '<span class="foot__links">' +
            '<a href="#contacto" data-act="r2" data-r2="Contacto">Contacto</a>' +
            '<a href="#terminos" data-act="r2" data-r2="Términos y condiciones">T&eacute;rminos y condiciones</a>' +
            '<a href="#privacidad" data-act="r2" data-r2="Privacidad">Privacidad</a>' +
          '</span>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- Pantalla 1 · Home (patrón Z) ---------------- */

  function vistaHome() {
    return '' +
    '<section class="hero">' +
      '<div class="hero__in wrap">' +
        '<div>' +
          '<h1>Fich&aacute; con datos,<br>no <em>a ojo</em>.</h1>' +
          '<p class="hero__lead">Compar&aacute; jugadores por rendimiento y presupuesto en una sola plataforma, pensada para clubes chicos y medianos, sin necesidad de un analista de datos.</p>' +
          '<div class="hero__cta">' +
            '<a class="btn btn--sky" href="#registro">Empezar ahora</a>' +
            '<a class="btn btn--onNavy" href="#como">Ver c&oacute;mo funciona</a>' +
          '</div>' +
          '<p class="hero__note">Primera Nacional &middot; B Metropolitana &middot; Primera C y D &middot; Federal A</p>' +
        '</div>' +
        maqueta() +
      '</div>' +
    '</section>' +

    '<section class="band--stat">' +
      '<div class="stat__in wrap">' +
        '<div class="stat__big num">91%</div>' +
        '<div class="stat__txt">' +
          '<b>de los clubes ficha jugadores sin datos</b>' +
          '<p class="muted">Seg&uacute;n nuestra encuesta a 166 personas del ambiente del f&uacute;tbol: el 91% decide por recomendaciones, observaci&oacute;n directa o videos de terceros.</p>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band" id="como">' +
      '<div class="wrap">' +
        '<div class="section__head">' +
          '<p class="eyebrow">&iquest;C&oacute;mo funciona?</p>' +
          '<h2>Tres pasos, de la necesidad al fichaje</h2>' +
          '<p>El mismo recorrido que hace un director t&eacute;cnico cuando necesita reforzar una posici&oacute;n.</p>' +
        '</div>' +
        '<div class="steps">' +
          paso(1, 'Filtr&aacute;', 'Eleg&iacute; la posici&oacute;n, las m&eacute;tricas t&aacute;cticas que busc&aacute;s y tu presupuesto m&aacute;ximo.') +
          paso(2, 'Compar&aacute;', 'Mir&aacute; a los candidatos cara a cara, m&eacute;trica por m&eacute;trica.') +
          paso(3, 'Decid&iacute;', 'Fich&aacute; con seguridad y justific&aacute; cada elecci&oacute;n ante la comisi&oacute;n directiva.') +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band" id="planes" style="padding-top:0">' +
      '<div class="wrap">' +
        '<div class="section__head">' +
          '<p class="eyebrow">Planes</p>' +
          '<h2>Por debajo de lo que paga un club de &eacute;lite</h2>' +
          '<p>Propuesta de precios a validar con una segunda ronda de consulta: el 68,7% de la muestra acepta pagar hasta USD 100 por mes.</p>' +
        '</div>' +
        '<div class="planes">' +
          plan('Club', 29, ['1 usuario', 'B&uacute;squeda y filtros t&aacute;cticos', 'Comparaci&oacute;n de hasta 3 jugadores', 'Lista de seguimiento'], false, false) +
          plan('Club Plus', 79, ['Hasta 5 usuarios del club', 'Todo lo del plan Club', 'Reportes en PDF para la comisi&oacute;n', 'Perfiles de b&uacute;squeda m&uacute;ltiples'], true, false) +
          plan('A medida', null, ['Ligas o federaciones completas', 'Integraci&oacute;n con los datos del club', 'Soporte dedicado'], false, true) +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band--cta">' +
      '<div class="cta__in wrap" style="padding-block:46px">' +
        '<h2>Datos pensados para ligas locales y regionales.</h2>' +
        '<a class="btn btn--sky" href="#registro">Crear cuenta</a>' +
      '</div>' +
    '</section>';
  }

  function paso(n, titulo, texto) {
    return '<article class="card step"><div class="step__n num">' + n + '</div><h3>' + titulo + '</h3><p>' + texto + '</p></article>';
  }

  function plan(nombre, precio, items, marcado, ultimo) {
    return '' +
      '<article class="card plan' + (marcado ? ' plan--mark' : '') + (ultimo ? ' plan--last' : '') + '">' +
        (marcado ? '<span class="chip chip--accent">El m&aacute;s elegido en la encuesta</span>' : '') +
        '<h3 style="font-size:20px">' + nombre + '</h3>' +
        '<div class="plan__price num">' + (precio ? 'USD ' + precio + '<span> / mes</span>' : 'A cotizar') + '</div>' +
        '<ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
      '</article>';
  }

  function maqueta() {
    /* Maqueta en HTML de la pantalla de búsqueda, en lugar de una captura. */
    var filas = [
      ['N. Ferreyra', 'USD 85K', '92'],
      ['E. Quiroga', 'USD 120K', '84'],
      ['F. Olivera', 'USD 65K', '79'],
      ['I. Barreto', 'USD 140K', '74']
    ];
    return '' +
      '<div class="shot" aria-hidden="true">' +
        '<div class="shot__bar"><span class="shot__dot"></span><span class="shot__dot"></span><span class="shot__dot"></span></div>' +
        '<div class="shot__body">' +
          '<div class="shot__side">' +
            '<div class="shot__lbl">Posici&oacute;n</div><div class="shot__inp"></div>' +
            '<div class="shot__lbl">Presupuesto</div><div class="shot__inp"></div>' +
            '<div class="shot__lbl">M&eacute;tricas</div><div class="shot__inp"></div><div class="shot__inp"></div>' +
            '<div class="shot__btn"></div>' +
          '</div>' +
          '<div class="shot__main">' +
            '<div class="shot__row shot__row--head"><div class="shot__name"></div><div class="shot__val"></div><div class="shot__val"></div></div>' +
            filas.map(function (f) {
              return '<div class="shot__row">' +
                '<div class="shot__name" style="width:' + (62 + Math.random() * 30) + '%"></div>' +
                '<div class="shot__val"></div>' +
                '<div class="shot__score num">' + f[2] + '</div></div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------------- Pantalla 2 · Login ---------------- */

  function vistaLogin() {
    var err = S.errLogin;
    return '' +
    '<div class="wrap authpage">' +
      '<section class="card auth">' +
        '<h1>Ingresar</h1>' +
        '<p class="auth__sub">Entr&aacute; para ver tus b&uacute;squedas y comparaciones guardadas.</p>' +
        (err ? '<div class="alert" style="margin-top:20px" role="alert"><span class="alert__i">!</span><span>' + h(err) + '</span></div>' : '') +
        '<form class="auth__form" id="form-login" novalidate>' +
          campo('login-email', 'Correo electr&oacute;nico', 'email', 'nombre@club.com', '', false) +
          campoPass('login-pass', 'Contrase&ntilde;a', '', '<a href="#recuperar" data-act="r2" data-r2="Recuperar contraseña">&iquest;Olvidaste tu contrase&ntilde;a?</a>') +
          '<button class="btn btn--primary" type="submit">Ingresar</button>' +
        '</form>' +
        '<p class="auth__alt">&iquest;No ten&eacute;s cuenta? <a href="#registro">Registrate</a></p>' +
        '<div class="demohint">' +
          '<b>Para probar el prototipo:</b> correo <code>' + h(D.CUENTA_DEMO.email) + '</code> y contrase&ntilde;a <code>' + h(D.CUENTA_DEMO.pass) + '</code>. ' +
          'Con cualquier otra combinaci&oacute;n se ve el estado de error.' +
        '</div>' +
      '</section>' +
    '</div>';
  }

  /* ---------------- Pantalla 3 · Registro ---------------- */

  function vistaRegistro() {
    var e = S.errReg || {};
    var roles = ['Director t&eacute;cnico', 'Director deportivo / Manager', 'Dirigente', 'Ojeador / Scout'];
    return '' +
    '<div class="wrap authpage">' +
      '<section class="card auth">' +
        '<h1>Crear cuenta</h1>' +
        '<p class="auth__sub">Empez&aacute; a comparar jugadores en minutos.</p>' +
        (e.general ? '<div class="alert" style="margin-top:20px" role="alert"><span class="alert__i">!</span><span>' + e.general + '</span></div>' : '') +
        '<form class="auth__form" id="form-registro" novalidate>' +
          campo('reg-nombre', 'Nombre y apellido', 'text', 'Ej. Juan P&eacute;rez', e.nombre, false) +
          campo('reg-email', 'Correo electr&oacute;nico', 'email', 'nombre@club.com', e.email, false) +
          '<div class="field' + (e.rol ? ' field--bad' : '') + '">' +
            '<label for="reg-rol">Rol</label>' +
            '<select class="input" id="reg-rol">' +
              '<option value="">Seleccion&aacute; tu rol</option>' +
              roles.map(function (r) { return '<option>' + r + '</option>'; }).join('') +
            '</select>' +
            (e.rol ? '<p class="field__err"><span>!</span>' + e.rol + '</p>' : '') +
          '</div>' +
          campo('reg-club', 'Club', 'text', 'Nombre de tu club', e.club, false) +
          campoPass('reg-pass', 'Contrase&ntilde;a', e.pass, '', 'M&iacute;nimo 8 caracteres') +
          '<label class="check' + (e.tyc ? ' field--bad' : '') + '">' +
            '<input type="checkbox" id="reg-tyc">' +
            '<span>Acepto los t&eacute;rminos y condiciones' + (e.tyc ? ' <b style="color:var(--bad)">&mdash; ' + e.tyc + '</b>' : '') + '</span>' +
          '</label>' +
          '<button class="btn btn--primary" type="submit">Crear cuenta</button>' +
        '</form>' +
        '<p class="auth__alt">&iquest;Ya ten&eacute;s cuenta? <a href="#login">Ingres&aacute;</a></p>' +
      '</section>' +
    '</div>';
  }

  function campo(id, label, tipo, ph, err, req) {
    return '' +
      '<div class="field' + (err ? ' field--bad' : '') + '">' +
        '<label for="' + id + '">' + label + '</label>' +
        '<div class="field__ctrl"><input class="input" id="' + id + '" type="' + tipo + '" placeholder="' + ph + '" autocomplete="off"></div>' +
        (err ? '<p class="field__err"><span>!</span>' + err + '</p>' : '') +
      '</div>';
  }

  function campoPass(id, label, err, extra, hint) {
    var ver = !!S.verPass[id];
    return '' +
      '<div class="field' + (err ? ' field--bad' : '') + '">' +
        '<div class="field__row"><label for="' + id + '">' + label + '</label>' + (extra || '') + '</div>' +
        '<div class="field__ctrl">' +
          '<input class="input" id="' + id + '" type="' + (ver ? 'text' : 'password') + '" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" style="padding-right:62px" autocomplete="off">' +
          '<button class="field__peek" type="button" data-act="peek" data-id="' + id + '" aria-label="' + (ver ? 'Ocultar' : 'Mostrar') + ' la contrase&ntilde;a">' + (ver ? 'Ocultar' : 'Ver') + '</button>' +
        '</div>' +
        (err ? '<p class="field__err"><span>!</span>' + err + '</p>' : (hint ? '<p class="field__hint">' + hint + '</p>' : '')) +
      '</div>';
  }

  /* ---------------- Pantalla 4 · Búsqueda (patrón F) ---------------- */

  function vistaBuscar() {
    return '' +
    '<div class="wrap app">' +
      '<div class="app__head">' +
        '<div style="flex:1;min-width:0">' +
          '<h1>Buscar jugadores</h1>' +
          '<p>Defin&iacute; el perfil que necesita tu plantel y compar&aacute; a los candidatos que lo cumplen.</p>' +
        '</div>' +
        '<button class="btn btn--ghost drawer__btn" type="button" data-act="cajon">Filtros</button>' +
      '</div>' +
      '<div class="cols">' +
        '<div class="scrim" id="scrim" data-act="cerrar-cajon"></div>' +
        panelFiltros() +
        '<div class="results" id="results"></div>' +
      '</div>' +
    '</div>';
  }

  function panelFiltros() {
    var f = S.filtros;
    return '' +
    '<aside class="card filters" id="filters" aria-label="Filtros de b&uacute;squeda">' +
      '<h2>Filtros</h2>' +

      '<div class="filters__grp">' +
        '<label class="filters__legend" for="f-pos">Posici&oacute;n</label>' +
        '<select class="input" id="f-pos" data-f="posicion">' +
          '<option value="">Todas las posiciones</option>' +
          POSICIONES.map(function (p) {
            return '<option' + (f.posicion === p ? ' selected' : '') + '>' + p + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      '<div class="filters__grp">' +
        '<label class="filters__legend" for="f-liga">Liga o competici&oacute;n</label>' +
        '<select class="input" id="f-liga" data-f="liga">' +
          '<option value="">Todas las ligas</option>' +
          LIGAS.map(function (l) {
            return '<option value="' + l.id + '"' + (f.liga === l.id ? ' selected' : '') + '>' + l.nombre +
              (l.cobertura === 'basica' ? ' (datos b&aacute;sicos)' : l.cobertura === 'sin_datos' ? ' (sin datos)' : '') + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +

      '<div class="filters__grp">' +
        '<span class="filters__legend">Edad</span>' +
        '<div class="metric" style="grid-template-columns:1fr 1fr">' +
          '<input class="input num" id="f-edad-min" type="number" min="15" max="45" value="' + f.edadMin + '" data-f="edadMin" aria-label="Edad m&iacute;nima">' +
          '<input class="input num" id="f-edad-max" type="number" min="15" max="45" value="' + f.edadMax + '" data-f="edadMax" aria-label="Edad m&aacute;xima">' +
        '</div>' +
      '</div>' +

      '<div class="filters__grp range">' +
        '<label class="filters__legend" for="f-pres">Presupuesto m&aacute;ximo</label>' +
        '<input type="range" id="f-pres" min="20000" max="400000" step="5000" value="' + f.presupuesto + '" data-f="presupuesto">' +
        '<div class="range__val"><span>USD 20.000</span><b class="num" id="f-pres-val">Hasta ' + usd(f.presupuesto) + '</b></div>' +
      '</div>' +

      '<hr>' +

      '<div class="filters__grp">' +
        '<span class="filters__legend">M&eacute;tricas t&aacute;cticas</span>' +
        '<div class="metric"><label for="f-pases">% pases completados</label>' +
          '<input class="input num" id="f-pases" type="number" min="0" max="100" placeholder="M&iacute;n." value="' + f.pases + '" data-f="pases"></div>' +
        '<div class="metric"><label for="f-duelos">Duelos ganados %</label>' +
          '<input class="input num" id="f-duelos" type="number" min="0" max="100" placeholder="M&iacute;n." value="' + f.duelos + '" data-f="duelos"></div>' +
        '<div class="metric"><label for="f-recup">Recuperaciones por partido</label>' +
          '<input class="input num" id="f-recup" type="number" min="0" max="15" step="0.1" placeholder="M&iacute;n." value="' + f.recup + '" data-f="recup"></div>' +
      '</div>' +

      '<hr>' +

      '<div class="filters__acts">' +
        '<button class="btn btn--primary" type="button" data-act="buscar">Buscar</button>' +
        '<button class="btn btn--ghost btn--sm" type="button" data-act="guardar-perfil">Guardar perfil de b&uacute;squeda</button>' +
        (S.perfil ? '<button class="btn btn--ghost btn--sm" type="button" data-act="cargar-perfil">Cargar perfil guardado</button>' : '') +
        '<button class="btn btn--ghost btn--sm" type="button" data-act="limpiar">Limpiar filtros</button>' +
      '</div>' +
      (S.perfil ? '<p class="field__hint">Perfil guardado: ' + h(S.perfil.posicion || 'todas las posiciones') + ' &middot; ' + h(S.perfil.edadMin) + '-' + h(S.perfil.edadMax) + ' a&ntilde;os &middot; ' + h(S.perfil.liga ? LIGA[S.perfil.liga].nombre : 'todas las ligas') + '</p>' : '') +
    '</aside>';
  }

  function renderResultados() {
    var cont = document.getElementById('results');
    if (!cont) return;
    var f = S.filtros;

    if (f.liga && LIGA[f.liga].cobertura === 'sin_datos') {
      cont.innerHTML = chipsAplicados(f) +
        '<div class="card empty">' +
          '<h3>Todav&iacute;a no tenemos datos de ' + h(LIGA[f.liga].nombre) + '</h3>' +
          '<p>Esa competici&oacute;n no est&aacute; cubierta por nuestra fuente de datos. Eleg&iacute; otra liga para seguir.</p>' +
          '<button class="btn btn--primary" type="button" data-act="limpiar-liga">Ver todas las ligas</button>' +
        '</div>';
      return;
    }

    var ls = resultados(f);
    var total = ls.length;
    var paginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (S.pagina > paginas) S.pagina = paginas;
    var desde = (S.pagina - 1) * PAGE_SIZE;
    var pagina = ls.slice(desde, desde + PAGE_SIZE);
    var sinDatos = excluidosPorFaltaDeDatos(f);

    var html = '' +
      '<div class="results__bar">' +
        '<div style="min-width:0">' +
          '<h2>Candidatos recomendados</h2>' +
          '<p class="results__meta num">' + (total ? 'Mostrando ' + (desde + 1) + '-' + Math.min(desde + PAGE_SIZE, total) + ' de ' + total + ' resultados' : 'Sin resultados') + '</p>' +
        '</div>' +
        '<label class="results__sort">Ordenar por' +
          '<select class="input" id="orden" data-act="orden">' +
            opcion('score', 'Score') + opcion('valor', 'Valor (menor primero)') +
            opcion('edad', 'Edad (menor primero)') + opcion('pases', '% pases completados') +
          '</select>' +
        '</label>' +
      '</div>' +
      chipsAplicados(f);

    if (sinDatos) {
      html += '<div class="alert alert--warn"><span class="alert__i">i</span><span>' + sinDatos +
        ' jugador' + (sinDatos > 1 ? 'es' : '') + ' cumpl' + (sinDatos > 1 ? 'en' : 'e') +
        ' el perfil pero qued' + (sinDatos > 1 ? 'aron' : 'ó') + ' afuera: su liga no publica alguna de las m&eacute;tricas por las que est&aacute;s filtrando.</span></div>';
    }

    if (!total) {
      var sug = filtroMasRestrictivo(f);
      html += '<div class="card empty">' +
        '<h3>No hay jugadores que cumplan estos filtros</h3>' +
        '<p>Ning&uacute;n candidato de la base cumple las tres condiciones a la vez.' +
        (sug ? ' Si relaj&aacute;s <b>' + sug.etiqueta + '</b> aparecen ' + sug.n + ' candidatos.' : '') + '</p>' +
        (sug ? '<button class="btn btn--primary" type="button" data-act="relajar" data-campo="' + sug.campo + '">Relajar ' + sug.etiqueta + '</button>' : '') +
        '<button class="btn btn--ghost btn--sm" type="button" data-act="limpiar">Limpiar todos los filtros</button>' +
      '</div>';
    } else {
      html += tabla(pagina, desde) + tarjetas(pagina, desde);
      if (paginas > 1) html += pager(paginas);
    }

    html += barraSeleccion();
    cont.innerHTML = html;
  }

  function opcion(v, label) {
    return '<option value="' + v + '"' + (S.orden === v ? ' selected' : '') + '>' + label + '</option>';
  }

  function chipsAplicados(f) {
    var cs = [];
    cs.push(f.posicion || 'Todas las posiciones');
    cs.push(f.liga ? LIGA[f.liga].nombre : 'Todas las ligas');
    cs.push(f.edadMin + '-' + f.edadMax + ' a&ntilde;os');
    cs.push('Hasta ' + usd(f.presupuesto));
    if (f.pases !== '') cs.push('Pases &ge; ' + f.pases + '%');
    if (f.duelos !== '') cs.push('Duelos &ge; ' + f.duelos + '%');
    if (f.recup !== '') cs.push('Recuperaciones &ge; ' + f.recup);
    return '<div class="applied">' + cs.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join('') + '</div>';
  }

  function badgeLiga(p) {
    var l = LIGA[p.liga];
    if (l.cobertura === 'basica') return '<span class="chip chip--warn" title="En esta liga la fuente de datos s&oacute;lo publica algunas m&eacute;tricas">Datos b&aacute;sicos</span>';
    return '';
  }

  function celdaScore(p) {
    var s = score(p);
    if (s.v == null) return nd();
    return '<span class="score' + (s.parcial ? ' score--part' : '') + ' num" title="' +
      (s.parcial ? 'Score parcial: le faltan ' + s.faltan + ' métricas, se calculó con las disponibles' : 'Promedio ponderado de las métricas, normalizado contra los jugadores de su misma posición') +
      '">' + s.v + (s.parcial ? '*' : '') + '</span>';
  }

  function tabla(pagina, desde) {
    return '' +
    '<div class="tablebox">' +
      '<table class="tbl">' +
        '<thead><tr>' +
          '<th class="c-pick"><span class="sr">Seleccionar</span></th>' +
          '<th class="n">#</th><th>Jugador</th><th>Club</th><th class="n">Edad</th>' +
          '<th class="n">Pases</th><th class="n">Duelos</th><th class="n">Recup.</th>' +
          '<th class="n">Valor</th><th class="n">Score</th>' +
          '<th class="c-fav"><span class="sr">Seguimiento</span></th>' +
        '</tr></thead>' +
        '<tbody>' + pagina.map(function (p, i) {
          var sel = S.sel.indexOf(p.id) !== -1;
          return '<tr class="' + (sel ? 'is-sel' : '') + '" data-act="ficha" data-id="' + p.id + '">' +
            '<td class="c-pick"><input type="checkbox" data-act="pick" data-id="' + p.id + '"' + (sel ? ' checked' : '') + ' aria-label="Seleccionar a ' + h(p.nom) + ' para comparar"></td>' +
            '<td class="n rank num">' + (desde + i + 1) + '</td>' +
            '<td><div class="who"><b>' + h(p.nom) + '</b><span>' + h(p.pos) + ' ' + badgeLiga(p) + '</span></div></td>' +
            '<td><div class="who"><span style="color:var(--fg)">' + h(p.club) + '</span><span>' + h(LIGA[p.liga].nombre) + '</span></div></td>' +
            '<td class="n num">' + p.edad + '</td>' +
            '<td class="n num">' + (p.pases == null ? nd() : p.pases + '%') + '</td>' +
            '<td class="n num">' + (p.duelos == null ? nd() : p.duelos + '%') + '</td>' +
            '<td class="n num">' + (p.recup == null ? nd() : p.recup.toFixed(1)) + '</td>' +
            '<td class="n num">' + usdCorto(p.valor) + '</td>' +
            '<td class="n">' + celdaScore(p) + '</td>' +
            '<td class="c-fav"><button class="fav" type="button" data-act="fav" data-id="' + p.id + '" aria-pressed="' + (esFav(p.id) ? 'true' : 'false') + '" aria-label="' + (esFav(p.id) ? 'Quitar de' : 'Guardar en') + ' la lista de seguimiento">&#9733;</button></td>' +
          '</tr>';
        }).join('') + '</tbody>' +
      '</table>' +
    '</div>';
  }

  function tarjetas(pagina, desde) {
    return '<div class="cards">' + pagina.map(function (p, i) {
      var sel = S.sel.indexOf(p.id) !== -1;
      return '<article class="card pcard' + (sel ? ' is-sel' : '') + '">' +
        '<div class="pcard__top">' +
          '<input type="checkbox" data-act="pick" data-id="' + p.id + '"' + (sel ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--accent);margin-top:2px" aria-label="Seleccionar a ' + h(p.nom) + ' para comparar">' +
          '<div class="who"><b>' + (desde + i + 1) + '. ' + h(p.nom) + '</b>' +
            '<span>' + h(p.pos) + ' &middot; ' + h(p.edad) + ' a&ntilde;os</span>' +
            '<span>' + h(p.club) + ' &middot; ' + h(LIGA[p.liga].nombre) + '</span>' +
            (badgeLiga(p) ? '<span style="margin-top:4px">' + badgeLiga(p) + '</span>' : '') +
          '</div>' +
          '<div style="display:grid;gap:6px;justify-items:end">' + celdaScore(p) +
            '<button class="fav" type="button" data-act="fav" data-id="' + p.id + '" aria-pressed="' + (esFav(p.id) ? 'true' : 'false') + '" aria-label="' + (esFav(p.id) ? 'Quitar de' : 'Guardar en') + ' la lista de seguimiento">&#9733;</button>' +
          '</div>' +
        '</div>' +
        '<div class="pcard__mx">' +
          mini('Pases', p.pases == null ? null : p.pases + '%') +
          mini('Duelos', p.duelos == null ? null : p.duelos + '%') +
          mini('Recup.', p.recup == null ? null : p.recup.toFixed(1)) +
          mini('Valor', usdCorto(p.valor)) +
        '</div>' +
        '<div class="pcard__foot">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-act="ficha" data-id="' + p.id + '">Ver ficha</button>' +
        '</div>' +
      '</article>';
    }).join('') + '</div>';
  }

  function mini(label, valor) {
    return '<div class="pcard__m"><span>' + label + '</span><b>' + (valor == null ? nd() : valor) + '</b></div>';
  }

  function pager(paginas) {
    var btns = '';
    for (var i = 1; i <= paginas; i++) {
      btns += '<button type="button" data-act="pag" data-p="' + i + '"' + (S.pagina === i ? ' aria-current="true"' : '') + '>' + i + '</button>';
    }
    return '' +
    '<div class="pager">' +
      '<div class="pager__btns">' +
        '<button type="button" data-act="pag" data-p="' + (S.pagina - 1) + '"' + (S.pagina === 1 ? ' disabled' : '') + ' aria-label="P&aacute;gina anterior">&lsaquo;</button>' +
        btns +
        '<button type="button" data-act="pag" data-p="' + (S.pagina + 1) + '"' + (S.pagina === paginas ? ' disabled' : '') + ' aria-label="P&aacute;gina siguiente">&rsaquo;</button>' +
      '</div>' +
    '</div>';
  }

  function barraSeleccion() {
    var n = S.sel.length;
    var nombres = S.sel.map(function (id) {
      var p = jugador(id);
      return '<span class="chip chip--accent">' + h(p.nom) +
        '<button type="button" data-act="pick" data-id="' + id + '" aria-label="Quitar a ' + h(p.nom) + ' de la comparaci&oacute;n">&times;</button></span>';
    }).join('');
    return '' +
    '<div class="selbar">' +
      '<div class="selbar__names">' +
        (n ? nombres : '<span class="muted">Seleccion&aacute; 2 o 3 jugadores para comparar</span>') +
      '</div>' +
      (n ? '<button class="btn btn--ghost btn--sm" type="button" data-act="limpiar-sel">Quitar todos</button>' : '') +
      '<button class="btn btn--primary" type="button" data-act="comparar"' + (n < 2 ? ' disabled' : '') + '>' +
        'Comparar' + (n ? ' ' + n : '') + '</button>' +
    '</div>';
  }

  /* ---------------- Pantalla 5 · Comparador ---------------- */

  function vistaComparar() {
    var ps = S.sel.map(jugador).filter(Boolean);
    if (ps.length < 2) {
      return '<div class="wrap app"><div class="card empty">' +
        '<h3>Eleg&iacute; al menos dos jugadores</h3>' +
        '<p>La comparaci&oacute;n se arma desde la pantalla de b&uacute;squeda: tild&aacute; 2 o 3 candidatos y toc&aacute; Comparar.</p>' +
        '<a class="btn btn--primary" href="#buscar">Ir a buscar jugadores</a>' +
      '</div></div>';
    }

    var letras = ['A', 'B', 'C'];
    var ganadas = ps.map(function () { return 0; });

    var filas = METRICAS.map(function (m) {
      var vals = ps.map(function (p) { return p[m.key]; });
      var disp = vals.filter(function (v) { return v != null; });
      var max = disp.length ? Math.max.apply(null, disp) : 0;
      var min = disp.length ? Math.min.apply(null, disp) : 0;
      if (disp.length > 1) {
        vals.forEach(function (v, i) { if (v != null && v === max) ganadas[i]++; });
      }
      var tope = Math.max(max, limites(ps[0].pos, m.key).max);

      return '<div class="mrow">' +
        '<div class="mrow__lbl">' + m.label + (m.unidad === '/p' ? ' por partido' : '') +
          (disp.length < ps.length ? ' <span class="chip chip--warn">Falta en ' + (ps.length - disp.length) + '</span>' : '') +
        '</div>' +
        '<div class="mrow__bars">' + ps.map(function (p, i) {
          var v = vals[i];
          var pct = v == null ? 0 : Math.max(3, (v / tope) * 100);
          var cls = v == null ? '' : (disp.length > 1 && v === max ? ' is-best' : (disp.length > 1 && v === min ? ' is-worst' : ''));
          return '<div class="bar">' +
            '<span class="bar__who">' + letras[i] + ' &middot; ' + h(p.nom.split(' ')[0]) + '</span>' +
            '<div class="bar__track"><div class="bar__fill' + cls + '" style="width:' + pct + '%"></div></div>' +
            '<span class="bar__v num">' + (v == null ? nd() : valorMetrica(p, m.key)) + '</span>' +
          '</div>';
        }).join('') + '</div>' +
      '</div>';
    }).join('');

    var valores = ps.map(function (p) { return p.valor; });
    var masBarato = ps[valores.indexOf(Math.min.apply(null, valores))];
    var dif = Math.max.apply(null, valores) - Math.min.apply(null, valores);
    var scores = ps.map(function (p) { return score(p); });
    var algunoParcial = scores.some(function (s) { return s.parcial; });

    return '' +
    '<div class="wrap app">' +
      '<div class="app__head">' +
        '<div style="flex:1;min-width:0">' +
          '<h1>Comparar jugadores</h1>' +
          '<p>' + h(ps[0].pos) + ' &middot; Promedios por partido, &uacute;ltimos 12 meses</p>' +
        '</div>' +
      '</div>' +

      '<div class="cmp">' +
        '<div class="cmp__heads" style="grid-template-columns:repeat(' + ps.length + ',minmax(0,1fr))">' +
          ps.map(function (p, i) {
            return '<article class="card cmp__head">' +
              '<span class="k">Jugador ' + letras[i] + '</span>' +
              '<h3>' + h(p.nom) + '</h3>' +
              '<p class="pos">' + h(p.pos) + ' &middot; ' + h(p.club) + '</p>' +
              '<p class="pos">' + h(LIGA[p.liga].nombre) + ' &middot; ' + p.edad + ' a&ntilde;os ' + badgeLiga(p) + '</p>' +
              '<div class="val"><span class="muted" style="font-size:13px">Valor</span><br><b class="num">' + usd(p.valor) + '</b></div>' +
              '<div><a class="btn btn--ghost btn--sm" href="#ficha" data-act="ficha" data-id="' + p.id + '">Ver ficha</a></div>' +
            '</article>';
          }).join('') +
        '</div>' +

        '<section class="card">' +
          '<div style="padding:16px 18px;border-bottom:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">' +
            '<h2 style="font-size:19px">M&eacute;trica por m&eacute;trica</h2>' +
            '<div class="legend">' +
              '<span><i style="background:var(--accent)"></i>Mejor en la m&eacute;trica</span>' +
              '<span><i style="background:var(--line-strong)"></i>Peor en la m&eacute;trica</span>' +
            '</div>' +
          '</div>' +
          filas +
        '</section>' +

        '<div class="verdict">' +
          '<article class="card vcard"><span>M&eacute;tricas ganadas</span><b class="num">' +
            ps.map(function (p, i) { return letras[i] + ' ' + ganadas[i]; }).join(' &middot; ') +
            '</b><p>Sobre ' + METRICAS.length + ' m&eacute;tricas comparadas.</p></article>' +
          '<article class="card vcard"><span>Diferencia de valor</span><b class="num">' + usd(dif) + '</b>' +
            '<p>' + h(masBarato.nom) + ' es el m&aacute;s barato de la comparaci&oacute;n.</p></article>' +
          '<article class="card vcard"><span>Score</span><b class="num">' +
            ps.map(function (p, i) { return letras[i] + ' ' + (scores[i].v == null ? '—' : scores[i].v + (scores[i].parcial ? '*' : '')); }).join(' &middot; ') +
            '</b><p>' + (algunoParcial ? '* calculado sin todas las m&eacute;tricas.' : 'Promedio ponderado normalizado por posici&oacute;n.') + '</p></article>' +
        '</div>' +

        '<div class="alert alert--info"><span class="alert__i">i</span><span>El Score es una definici&oacute;n provisoria del equipo: promedio ponderado de las cinco m&eacute;tricas (pases 30%, duelos 25%, recuperaciones 20%, distancia 15%, centros 10%), normalizado contra los jugadores de la misma posici&oacute;n. Falta confirmarlo con el PO y escribirle la historia de usuario.</span></div>' +

        '<div class="actions">' +
          '<a class="btn btn--ghost" href="#buscar">Volver a resultados</a>' +
          '<button class="btn" type="button" data-act="r2" data-r2="Exportar PDF" disabled>Exportar PDF</button>' +
          '<span class="chip chip--r2">Exportar PDF entra en el release 2</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- Ficha del jugador ---------------- */

  function vistaFicha() {
    var p = jugador(S.jugadorId);
    if (!p) {
      return '<div class="wrap app"><div class="card empty">' +
        '<h3>No hay ning&uacute;n jugador abierto</h3>' +
        '<p>Las fichas se abren desde la lista de candidatos.</p>' +
        '<a class="btn btn--primary" href="#buscar">Ir a buscar jugadores</a>' +
      '</div></div>';
    }
    var s = score(p);
    var f = S.perfil || S.filtros;

    var criterios = [
      critPos(p, f),
      { ok: p.edad >= f.edadMin && p.edad <= f.edadMax, txt: 'Edad entre ' + f.edadMin + ' y ' + f.edadMax + ' a&ntilde;os (tiene ' + p.edad + ')' },
      { ok: p.valor <= f.presupuesto, txt: 'Entra en el presupuesto de ' + usd(f.presupuesto) + ' (vale ' + usd(p.valor) + ')' }
    ];
    [['pases', '% de pases completados'], ['duelos', 'duelos ganados'], ['recup', 'recuperaciones por partido']].forEach(function (par) {
      var k = par[0];
      if (f[k] === '' || f[k] == null) return;
      if (p[k] == null) criterios.push({ na: true, txt: 'M&iacute;nimo de ' + par[1] + ': su liga no publica esta m&eacute;trica' });
      else criterios.push({ ok: p[k] >= f[k], txt: 'M&iacute;nimo de ' + f[k] + ' en ' + par[1] + ' (tiene ' + p[k] + ')' });
    });

    var cumple = criterios.filter(function (c) { return c.ok; }).length;

    return '' +
    '<div class="wrap app">' +
      '<div class="app__head"><a class="btn btn--ghost btn--sm" href="#buscar">&lsaquo; Volver a resultados</a></div>' +
      '<div class="ficha">' +
        '<section class="card ficha__hero">' +
          '<div style="min-width:0">' +
            '<h1>' + h(p.nom) + '</h1>' +
            '<div class="ficha__meta">' +
              '<span class="chip chip--accent">' + h(p.pos) + '</span>' +
              '<span class="chip">' + h(p.club) + '</span>' +
              '<span class="chip">' + h(LIGA[p.liga].nombre) + '</span>' +
              '<span class="chip">' + p.edad + ' a&ntilde;os</span>' +
              '<span class="chip num">' + p.part + ' partidos &middot; ' + p.min.toLocaleString('es-AR') + ' min</span>' +
              badgeLiga(p) +
            '</div>' +
          '</div>' +
          '<div class="ficha__right">' +
            '<div><span class="muted" style="font-size:13px">Valor de referencia</span><div class="ficha__val">' + usd(p.valor) + '</div></div>' +
            '<div>' + celdaScore(p) + ' <span class="muted" style="font-size:13px">Score' + (s.parcial ? ' parcial' : '') + '</span></div>' +
            '<button class="btn ' + (esFav(p.id) ? 'btn--ghost' : 'btn--primary') + ' btn--sm" type="button" data-act="fav" data-id="' + p.id + '">' +
              (esFav(p.id) ? '&#9733; Quitar del seguimiento' : '&#9733; Guardar en seguimiento') + '</button>' +
          '</div>' +
        '</section>' +

        '<div class="ficha__grid">' +
          '<section class="card mlist">' +
            '<div style="padding:16px 18px 10px"><h2 style="font-size:19px">M&eacute;tricas de rendimiento</h2>' +
            '<p class="muted" style="font-size:13.5px;margin-top:4px">La marca vertical es el promedio de la posici&oacute;n en la base.</p></div>' +
            METRICAS.map(function (m) {
              var v = p[m.key];
              if (v == null) {
                return '<div class="mitem"><div class="mitem__top"><span>' + m.label + '</span><b>' + nd() + '</b></div>' +
                  '<p class="mitem__foot">' + h(LIGA[p.liga].nombre) + ' no publica esta m&eacute;trica.</p></div>';
              }
              var b = limites(p.pos, m.key);
              var tope = b.max * 1.05;
              var avg = promedio(p.pos, m.key);
              return '<div class="mitem">' +
                '<div class="mitem__top"><span>' + m.label + (m.unidad === '/p' ? ' por partido' : '') + '</span><b class="num">' + valorMetrica(p, m.key) + '</b></div>' +
                '<div class="mitem__bar"><div class="mitem__fill" style="width:' + Math.min(100, (v / tope) * 100) + '%"></div>' +
                  (avg != null ? '<span class="mitem__avg" style="left:' + Math.min(99, (avg / tope) * 100) + '%"></span>' : '') + '</div>' +
                '<p class="mitem__foot num">Promedio de la posici&oacute;n: ' + (avg != null ? avg.toFixed(m.decimales) + m.unidad : '—') + '</p>' +
              '</div>';
            }).join('') +
          '</section>' +

          '<section class="card match">' +
            '<h3>Coincidencia con tu perfil</h3>' +
            '<p class="muted" style="font-size:14px">Cumple ' + cumple + ' de ' + criterios.length + ' criterios' +
              (S.perfil ? ' de tu perfil guardado' : ' de la b&uacute;squeda actual') + '.</p>' +
            criterios.map(function (c) {
              var cls = c.na ? 'na' : (c.ok ? 'ok' : 'no');
              var ic = c.na ? '?' : (c.ok ? '&#10003;' : '&times;');
              return '<div class="match__row"><span class="match__i match__i--' + cls + '">' + ic + '</span><span>' + c.txt + '</span></div>';
            }).join('') +
            '<hr style="border:0;border-top:1px solid var(--line)">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-act="pick" data-id="' + p.id + '">' +
              (S.sel.indexOf(p.id) !== -1 ? 'Quitar de la comparaci&oacute;n' : 'Agregar a la comparaci&oacute;n') + '</button>' +
          '</section>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function critPos(p, f) {
    if (!f.posicion) return { ok: true, txt: 'Cualquier posici&oacute;n (no filtraste por posici&oacute;n)' };
    return { ok: p.pos === f.posicion, txt: 'Juega de ' + f.posicion + (p.pos === f.posicion ? '' : ' (es ' + p.pos + ')') };
  }

  /* ---------------- Lista de seguimiento ---------------- */

  function vistaSeguimiento() {
    var ps = S.favs.map(jugador).filter(Boolean);
    return '' +
    '<div class="wrap app">' +
      '<div class="app__head">' +
        '<div style="flex:1;min-width:0">' +
          '<h1>Lista de seguimiento</h1>' +
          '<p>Los jugadores que guard&oacute; ' + h(S.user.club) + ' para volver a revisarlos.</p>' +
        '</div>' +
        (ps.length > 1 ? '<button class="btn btn--primary btn--sm" type="button" data-act="comparar-favs">Comparar los primeros ' + Math.min(MAX_CMP, ps.length) + '</button>' : '') +
      '</div>' +
      (ps.length ? '<div class="follow">' + ps.map(function (p) {
        return '<article class="card pcard">' +
          '<div class="pcard__top">' +
            '<div class="who"><b>' + h(p.nom) + '</b>' +
              '<span>' + h(p.pos) + ' &middot; ' + h(p.edad) + ' a&ntilde;os &middot; ' + usd(p.valor) + '</span>' +
              '<span>' + h(p.club) + ' &middot; ' + h(LIGA[p.liga].nombre) + ' ' + badgeLiga(p) + '</span>' +
            '</div>' +
            '<div style="display:grid;gap:8px;justify-items:end">' + celdaScore(p) + '</div>' +
          '</div>' +
          '<div class="pcard__foot">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-act="ficha" data-id="' + p.id + '">Ver ficha</button>' +
            '<button class="btn btn--ghost btn--sm" type="button" data-act="fav" data-id="' + p.id + '">Quitar de la lista</button>' +
          '</div>' +
        '</article>';
      }).join('') + '</div>'
      : '<div class="card empty">' +
          '<h3>Todav&iacute;a no guardaste ning&uacute;n jugador</h3>' +
          '<p>Desde la lista de candidatos o desde una ficha, toc&aacute; la estrella para guardar a un jugador y volver a revisarlo sin buscarlo de nuevo.</p>' +
          '<a class="btn btn--primary" href="#buscar">Buscar jugadores</a>' +
        '</div>') +
    '</div>';
  }

  /* ---------------- render ---------------- */

  function render() {
    var ruta = rutaActual();

    if (ruta === 'planes' || ruta === 'como') S.vista = 'home';
    else S.vista = ruta;

    if (PRIVADAS.indexOf(S.vista) !== -1 && !S.user) {
      S.errLogin = 'Necesitás iniciar sesión para entrar a esa pantalla.';
      S.vista = 'login';
      location.hash = 'login';
      return;
    }
    if ((S.vista === 'login' || S.vista === 'registro') && S.user) {
      location.hash = 'buscar';
      return;
    }

    document.body.classList.toggle('drawer', S.cajonAbierto);
    document.getElementById('demobar').hidden = !S.demobar;

    renderTopbar();
    renderFoot();

    var v = document.getElementById('view');
    if (S.vista === 'home') v.innerHTML = vistaHome();
    else if (S.vista === 'login') v.innerHTML = vistaLogin();
    else if (S.vista === 'registro') v.innerHTML = vistaRegistro();
    else if (S.vista === 'buscar') { v.innerHTML = vistaBuscar(); renderResultados(); }
    else if (S.vista === 'comparar') v.innerHTML = vistaComparar();
    else if (S.vista === 'ficha') v.innerHTML = vistaFicha();
    else if (S.vista === 'seguimiento') v.innerHTML = vistaSeguimiento();

    if (ruta === 'planes' || ruta === 'como') {
      var t = document.getElementById(ruta === 'planes' ? 'planes' : 'como');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }

  /* ---------------- acciones ---------------- */

  function togglePick(id) {
    var i = S.sel.indexOf(id);
    if (i !== -1) S.sel.splice(i, 1);
    else {
      if (S.sel.length >= MAX_CMP) { toast('Se pueden comparar hasta ' + MAX_CMP + ' jugadores a la vez.'); return; }
      S.sel.push(id);
    }
  }

  function toggleFav(id) {
    var i = S.favs.indexOf(id);
    if (i !== -1) { S.favs.splice(i, 1); toast(jugador(id).nom + ' salió de la lista de seguimiento.'); }
    else { S.favs.push(id); toast(jugador(id).nom + ' quedó guardado en la lista de seguimiento.'); }
    guardar();
  }

  document.getElementById('app').addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el) {
      if (S.menuAbierto) { S.menuAbierto = false; render(); }
      return;
    }
    var act = el.getAttribute('data-act');
    var id = el.getAttribute('data-id');

    /* Las filas de la tabla llevan data-act="ficha"; los controles de dentro ganan. */
    if (act === 'pick') {
      ev.preventDefault(); ev.stopPropagation();
      togglePick(parseInt(id, 10));
      if (S.vista === 'buscar') renderResultados(); else render();
      return;
    }
    if (act === 'fav') {
      ev.preventDefault(); ev.stopPropagation();
      toggleFav(parseInt(id, 10));
      if (S.vista === 'buscar') renderResultados(); else render();
      return;
    }
    if (act === 'ficha') {
      ev.preventDefault();
      S.jugadorId = parseInt(id, 10);
      ir('ficha');
      return;
    }
    if (act === 'r2') {
      ev.preventDefault();
      var q = el.getAttribute('data-r2') || 'Esa función';
      toast(q + ': no entra en el MVP v1, está priorizada para un release siguiente.');
      return;
    }
    if (act === 'menu') { ev.preventDefault(); S.menuAbierto = !S.menuAbierto; render(); return; }
    if (act === 'nav') { ev.preventDefault(); S.navAbierta = !S.navAbierta; render(); return; }
    if (act === 'salir') {
      ev.preventDefault();
      S.user = null; S.menuAbierto = false; S.sel = [];
      guardar(); toast('Cerraste la sesión.'); ir('home');
      return;
    }
    if (act === 'cerrar-demobar') { S.demobar = false; guardar(); document.getElementById('demobar').hidden = true; return; }
    if (act === 'cajon') { ev.preventDefault(); S.cajonAbierto = true; document.body.classList.add('drawer'); return; }
    if (act === 'cerrar-cajon') { S.cajonAbierto = false; document.body.classList.remove('drawer'); return; }
    if (act === 'peek') {
      ev.preventDefault();
      var pid = el.getAttribute('data-id');
      var inp = document.getElementById(pid);
      var val = inp ? inp.value : '';
      S.verPass[pid] = !S.verPass[pid];
      render();
      var nuevo = document.getElementById(pid);
      if (nuevo) { nuevo.value = val; nuevo.focus(); }
      return;
    }
    if (act === 'buscar') {
      ev.preventDefault();
      S.pagina = 1; S.cajonAbierto = false;
      document.body.classList.remove('drawer');
      renderResultados();
      var r = document.getElementById('results');
      if (r && window.innerWidth < 1024) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (act === 'limpiar') {
      ev.preventDefault();
      S.filtros = filtrosPorDefecto();
      S.filtros.posicion = ''; S.filtros.pases = ''; S.filtros.duelos = ''; S.filtros.recup = '';
      S.filtros.presupuesto = 400000;
      S.pagina = 1;
      render();
      return;
    }
    if (act === 'limpiar-liga') { ev.preventDefault(); S.filtros.liga = ''; S.pagina = 1; render(); return; }
    if (act === 'relajar') {
      ev.preventDefault();
      var campo = el.getAttribute('data-campo');
      S.filtros[campo] = campo === 'presupuesto' ? 400000 : '';
      S.pagina = 1;
      render();
      return;
    }
    if (act === 'limpiar-sel') { ev.preventDefault(); S.sel = []; renderResultados(); return; }
    if (act === 'comparar') { ev.preventDefault(); ir('comparar'); return; }
    if (act === 'comparar-favs') {
      ev.preventDefault();
      S.sel = S.favs.slice(0, MAX_CMP);
      ir('comparar');
      return;
    }
    if (act === 'pag') {
      ev.preventDefault();
      S.pagina = parseInt(el.getAttribute('data-p'), 10);
      renderResultados();
      return;
    }
    if (act === 'guardar-perfil') {
      ev.preventDefault();
      /* Criterio de aceptación: si falta un campo del perfil, se marca y no avanza. */
      var faltan = [];
      if (!S.filtros.posicion) faltan.push('la posición');
      if (!S.filtros.liga) faltan.push('la liga');
      if (!S.filtros.edadMin || !S.filtros.edadMax) faltan.push('el rango de edad');
      if (faltan.length) {
        toast('Para guardar el perfil falta elegir ' + faltan.join(' y ') + '.');
        if (!S.filtros.posicion) marcar('f-pos');
        if (!S.filtros.liga) marcar('f-liga');
        return;
      }
      S.perfil = Object.assign({}, S.filtros);
      guardar();
      toast('Perfil de búsqueda guardado. Reemplaza al anterior: en el MVP hay un solo perfil.');
      render();
      return;
    }
    if (act === 'cargar-perfil') {
      ev.preventDefault();
      if (!S.perfil) return;
      S.filtros = Object.assign({}, S.perfil);
      S.pagina = 1;
      toast('Perfil guardado cargado.');
      render();
      return;
    }
  });

  function marcar(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.closest('.filters__grp').classList.add('field--bad');
    el.style.borderColor = 'var(--bad)';
    el.focus();
  }

  /* Filtros: la tabla se actualiza en la misma pantalla, sin recargar la vista. */
  document.getElementById('app').addEventListener('input', function (ev) {
    var el = ev.target.closest('[data-f]');
    if (!el) return;
    var campo = el.getAttribute('data-f');
    var v = el.value;
    if (campo === 'posicion' || campo === 'liga') S.filtros[campo] = v;
    else if (v === '') S.filtros[campo] = '';
    else S.filtros[campo] = Number(v);

    if (campo === 'presupuesto') {
      var lbl = document.getElementById('f-pres-val');
      if (lbl) lbl.textContent = 'Hasta ' + usd(S.filtros.presupuesto);
    }
    el.style.borderColor = '';
    S.pagina = 1;
    renderResultados();
  });

  document.getElementById('app').addEventListener('change', function (ev) {
    var sel = ev.target.closest('[data-act="orden"]');
    if (sel) { S.orden = sel.value; S.pagina = 1; renderResultados(); return; }
    var f = ev.target.closest('[data-f]');
    if (f && f.tagName === 'SELECT') {
      S.filtros[f.getAttribute('data-f')] = f.value;
      S.pagina = 1;
      renderResultados();
    }
  });

  /* Login y registro */
  document.getElementById('app').addEventListener('submit', function (ev) {
    var form = ev.target;
    ev.preventDefault();

    if (form.id === 'form-login') {
      var em = (document.getElementById('login-email').value || '').trim().toLowerCase();
      var pw = document.getElementById('login-pass').value || '';
      var cuenta = null;
      if (em === D.CUENTA_DEMO.email && pw === D.CUENTA_DEMO.pass) cuenta = D.CUENTA_DEMO;
      S.cuentas.forEach(function (c) { if (c.email === em && c.pass === pw) cuenta = c; });
      if (!cuenta) {
        /* Mensaje genérico a propósito: no revela cuál de los dos datos falló. */
        S.errLogin = 'Correo o contraseña incorrectos.';
        render();
        return;
      }
      S.user = { nombre: cuenta.nombre, rol: cuenta.rol, club: cuenta.club, email: cuenta.email };
      S.errLogin = null;
      guardar();
      toast('Hola, ' + S.user.nombre.split(' ')[0] + '.');
      ir('buscar');
      return;
    }

    if (form.id === 'form-registro') {
      var nombre = (document.getElementById('reg-nombre').value || '').trim();
      var email = (document.getElementById('reg-email').value || '').trim().toLowerCase();
      var rol = document.getElementById('reg-rol').value;
      var club = (document.getElementById('reg-club').value || '').trim();
      var pass = document.getElementById('reg-pass').value || '';
      var tyc = document.getElementById('reg-tyc').checked;
      var e = {};

      if (!nombre) e.nombre = 'Complet&aacute; tu nombre y apellido.';
      if (!email) e.email = 'Complet&aacute; tu correo electr&oacute;nico.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Ese correo no parece v&aacute;lido.';
      else if (email === D.CUENTA_DEMO.email || S.cuentas.some(function (c) { return c.email === email; })) {
        e.email = 'Ese correo ya tiene una cuenta. Prob&aacute; ingresando.';
      }
      if (!rol) e.rol = 'Eleg&iacute; tu rol en el club.';
      if (!club) e.club = 'Complet&aacute; el nombre de tu club.';
      if (!pass) e.pass = 'Eleg&iacute; una contrase&ntilde;a.';
      else if (pass.length < 8) e.pass = 'Le faltan ' + (8 - pass.length) + ' caracteres: el m&iacute;nimo es 8.';
      if (!tyc) e.tyc = 'hay que aceptarlos para crear la cuenta';

      if (Object.keys(e).length) { S.errReg = e; render(); return; }

      var nueva = { email: email, pass: pass, nombre: nombre, rol: rol, club: club };
      S.cuentas.push(nueva);
      S.user = { nombre: nombre, rol: rol, club: club, email: email };
      S.errReg = null;
      guardar();
      toast('Cuenta creada. Bienvenido, ' + nombre.split(' ')[0] + '.');
      ir('buscar');
    }
  });

  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024 && S.cajonAbierto) {
      S.cajonAbierto = false;
      document.body.classList.remove('drawer');
    }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (S.cajonAbierto) { S.cajonAbierto = false; document.body.classList.remove('drawer'); }
    if (S.menuAbierto) { S.menuAbierto = false; render(); }
  });

  render();
})();
