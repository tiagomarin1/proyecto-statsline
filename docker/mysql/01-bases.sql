-- Se ejecuta una sola vez, cuando el contenedor de MySQL arranca con el volumen vacío.
-- MYSQL_DATABASE ya crea statsline_dev y el usuario statsline; acá se suma la base de test.
CREATE DATABASE IF NOT EXISTS statsline_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON statsline_test.* TO 'statsline'@'%';
FLUSH PRIVILEGES;
