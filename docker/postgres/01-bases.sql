-- Se ejecuta una sola vez, cuando el contenedor de PostgreSQL arranca con el volumen vacío.
-- POSTGRES_DB ya crea statsline_dev con el usuario statsline; acá se suma la base de test.
CREATE DATABASE statsline_test OWNER statsline ENCODING 'UTF8' TEMPLATE template0;
