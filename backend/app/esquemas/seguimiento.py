"""Lista de seguimiento (SEG-001, CONTRATO_DE_API.md)."""

from pydantic import BaseModel


class PedidoSeguimiento(BaseModel):
    jugador_id: int


class RespuestaGuardado(BaseModel):
    """POST /seguimiento: 201 si se agregó, 200 si ya estaba. El aviso es el de RN-026."""

    jugador_id: int
    aviso: str
