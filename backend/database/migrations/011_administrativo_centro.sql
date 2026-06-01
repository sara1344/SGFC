-- SGFC — Migración 011: Administrativo por centro de formación (reemplaza Administrador Regional)
USE `sgfc`;

UPDATE `perfil`
SET `nombre_perfil` = 'administrativo_centro',
    `tipo_perfil`   = 4,
    `descripcion`   = 'Administrativo de un centro de formación'
WHERE `id_Perfil` = 4;

INSERT INTO `perfil` (`id_Perfil`, `nombre_perfil`, `tipo_perfil`, `descripcion`) VALUES
(4, 'administrativo_centro', 4, 'Administrativo de un centro de formación')
ON DUPLICATE KEY UPDATE
  `nombre_perfil` = VALUES(`nombre_perfil`),
  `tipo_perfil`   = VALUES(`tipo_perfil`),
  `descripcion`   = VALUES(`descripcion`);
