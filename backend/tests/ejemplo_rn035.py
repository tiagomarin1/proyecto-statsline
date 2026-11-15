"""El ejemplo de RN-035 (REGLAS_DE_NEGOCIO.md), para probar la misma tabla contra la regla en
Python (unitarios) y contra la consulta en SQL (integración)."""

# (nombre, nombre_pila, apellido), como los trae API-Football
JUGADORES_RN035 = [
    ("S. Arias", "Santiago", "Arias Naranjo"),
    ("Á. Correa", "Ángel Martín", "Correa Martínez"),
    ("Á. Di María", "Ángel Fabián", "Di María Hernández"),
    ("L. Magallán", "Lisandro", "Magallán"),
]
TODOS = [nombre for nombre, _, _ in JUGADORES_RN035]

# (texto escrito, nombres que coinciden)
CASOS_RN035 = [
    ("ARIAS", ["S. Arias"]),
    ("angel", ["Á. Correa", "Á. Di María"]),
    ("S. Ari", ["S. Arias"]),
    ("maría ángel", ["Á. Di María"]),
    ("mar", ["Á. Correa", "Á. Di María"]),
    ("rias", []),
    ("...", TODOS),
]

# Nombres con signos y letras que no son de la a a la z, para comparar Python con SQL
NOMBRES_DIFICILES = [
    ("L. Puñet", "Laureano Damián", "Puñet"),
    ("J. O'Higgins", "Juan Cruz", "O'Higgins"),
    ("M. Pérez-García", "Martín", "Pérez-García"),
    ("G. Müller", "Günther", "Müller"),
    ("P. Højbjerg", "Pierre-Emile", "Højbjerg"),
    ("  F.   Colidio ", "Facundo", "Colidio"),
    ("J. Sosa", None, None),
]
TEXTOS_DIFICILES = ["punet", "PUÑET", "o higgins", "ohiggins", "perez garcia", "garcía", "mull"]
TEXTOS_DIFICILES += ["hojbjerg", "jbjerg", "pierre emile", "f colidio", "sosa", "j", "damian l"]
