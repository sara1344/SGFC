-- SGFC — Usuario demo: Cesar Augusto Sanchez Duque (administrativo de centro)
USE `sgfc`;

UPDATE `personas`
SET `nombres`    = 'Cesar Augusto',
    `Apellidos`  = 'Sanchez Duque',
    `correo`     = 'cesar.sanchez@sena.edu.co',
    `contrasena` = '$2y$10$sEdJHczemuOZH7hDWe1CvesSyAQFAu3XCKp/7n7qOmb.EkMfNrIC6',
    `id_genero`  = 2,
    `id_perfil`  = 4,
    `activo`     = 1
WHERE `usuario` = 'cs60860';
