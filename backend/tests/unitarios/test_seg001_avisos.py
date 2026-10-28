"""SEG-001: avisos de la lista de seguimiento (RN-026)."""

from app.servicios.seguimiento import aviso_guardado, aviso_quitado


def test_seg001_rn026_aviso_al_guardar():
    assert aviso_guardado("Nahuel Ferreyra") == (
        "Nahuel Ferreyra quedó guardado en la lista de seguimiento."
    )


def test_seg001_rn026_aviso_al_quitar():
    assert aviso_quitado("Nahuel Ferreyra") == "Nahuel Ferreyra salió de la lista de seguimiento."
