import { LINK_WHATSAPP, TELEFONO_VISIBLE } from '../utilidades/contacto';

/** UI-004: términos y condiciones. Página pública. */
export default function Terminos() {
  return (
    <div className="wrap app terminos">
      <h1>Términos y condiciones</h1>
      <p className="muted">Última actualización: 26 de noviembre de 2026.</p>

      <h2>1. Qué es StatsLine</h2>
      <p>
        StatsLine es un proyecto académico del Equipo 04 de la Universidad Argentina de la Empresa
        (UADE). No es un producto comercial: no se cobra, no tiene publicidad y puede cambiar o
        dejar de estar disponible en cualquier momento. Lo usamos para mostrar nuestro trabajo en
        presentaciones y para que personas invitadas lo prueben y nos den su opinión.
      </p>

      <h2>2. Aceptación</h2>
      <p>Al crear una cuenta aceptás estos términos. Si no estás de acuerdo, no crees la cuenta.</p>

      <h2>3. Qué datos tuyos guardamos</h2>
      <ul>
        <li>
          Tu nombre y apellido, tu correo electrónico, tu rol en el club y el nombre del club.
        </li>
        <li>Tu contraseña, guardada cifrada: nadie del equipo puede verla.</li>
        <li>La fecha en que aceptaste estos términos.</li>
        <li>
          Lo que guardás dentro de la plataforma: tu perfil de búsqueda y tu lista de seguimiento.
        </li>
      </ul>

      <h2>4. Para qué los usamos</h2>
      <p>
        Solo para que puedas ingresar y usar StatsLine, y para mandarte un correo si pedís recuperar
        tu contraseña. No vendemos tus datos, no los compartimos con nadie con fines comerciales y
        no te vamos a mandar publicidad. La plataforma funciona sobre servicios de terceros
        (alojamiento web, base de datos y envío de correos), que guardan los datos solo para que
        StatsLine funcione.
      </p>

      <h2>5. Tus derechos</h2>
      <p>
        Podés pedirnos en cualquier momento ver, corregir o borrar tus datos, o que demos de baja tu
        cuenta. Escribinos por WhatsApp (sección 10) y lo resolvemos a mano.
      </p>
      <p>
        Como titular de los datos, tenés derecho a acceder a ellos en forma gratuita cada seis
        meses, salvo que acredites un interés legítimo para hacerlo antes (artículo 14, inciso 3, de
        la Ley 25.326). La Agencia de Acceso a la Información Pública, órgano de control de la Ley
        25.326, atiende las denuncias y los reclamos de quienes se vean afectados por el
        incumplimiento de las normas de protección de datos personales.
      </p>

      <h2>6. Los datos de fútbol</h2>
      <p>
        Las estadísticas de los jugadores salen de API-Football y de Sportmonks, y los valores de
        mercado del conjunto de datos público transfermarkt-datasets. Se muestran como referencia:
        pueden tener errores, estar incompletos o no estar al día, y no reemplazan el trabajo de un
        cuerpo técnico. StatsLine no tiene relación con esas fuentes ni con los clubes, las ligas o
        los jugadores que aparecen, y ninguno de ellos lo avala.
      </p>

      <h2>7. Uso aceptable</h2>
      <p>
        No intentes entrar a cuentas ajenas, sobrecargar la plataforma ni copiar los datos en forma
        masiva. Podemos dar de baja las cuentas que lo hagan.
      </p>

      <h2>8. Sin garantías</h2>
      <p>
        Como es un proyecto académico en etapa de prueba, StatsLine se ofrece tal como está: puede
        tener errores o quedar sin servicio por momentos. El equipo no se hace responsable por
        decisiones que se tomen en base a la información que muestra.
      </p>

      <h2>9. Cambios en estos términos</h2>
      <p>Si los cambiamos, actualizamos la fecha de arriba.</p>

      <h2>10. Contacto</h2>
      <p>
        Para dudas, errores, sugerencias o para ejercer tus derechos, escribinos por WhatsApp al{' '}
        <a href={LINK_WHATSAPP} target="_blank" rel="noopener noreferrer">
          {TELEFONO_VISIBLE}
        </a>
        .
      </p>
    </div>
  );
}
