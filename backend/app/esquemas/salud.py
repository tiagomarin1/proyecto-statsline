from typing import Literal

from pydantic import BaseModel


class RespuestaSalud(BaseModel):
    estado: Literal["ok", "error"]
    base_de_datos: Literal["ok", "error"]
