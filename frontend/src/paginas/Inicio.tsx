import { Link } from 'react-router-dom';

/** Home pública. Por ahora solo el hero del prototipo; el resto de la home se porta después. */
export default function Inicio() {
  return (
    <>
      <header className="topbar">
        <div className="topbar__in wrap">
          <Link className="logo" to="/">
            Stats<i>Line</i>
          </Link>
          <nav className="nav nav--site" aria-label="Principal">
            <Link to="/ingresar">Ingresar</Link>
            <Link className="nav__cta btn btn--sky btn--sm" to="/registro">
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__in wrap">
            <div>
              <h1>
                Fichá con datos,
                <br />
                no <em>a ojo</em>.
              </h1>
              <p className="hero__lead">
                Compará jugadores por rendimiento y presupuesto en una sola plataforma, pensada para
                clubes chicos y medianos, sin necesidad de un analista de datos.
              </p>
              <div className="hero__cta">
                <Link className="btn btn--sky" to="/registro">
                  Empezar ahora
                </Link>
              </div>
              <p className="hero__note">
                Liga Profesional · Primera Nacional · B Metropolitana · Primera C y D · Federal A
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="foot__in wrap">
          <span>StatsLine · Equipo 04 · UADE</span>
        </div>
      </footer>
    </>
  );
}
