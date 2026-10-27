"""Hash de contraseñas con Argon2 (ADR-0005). Nunca se guarda la contraseña en texto plano."""

from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

_hasher = PasswordHash((Argon2Hasher(),))


def hashear_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar_contrasena(contrasena: str, hash_contrasena: str) -> bool:
    return _hasher.verify(contrasena, hash_contrasena)
