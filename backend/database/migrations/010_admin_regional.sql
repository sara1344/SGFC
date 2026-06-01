-- SGFC — Migración 010: rol Administrador Regional
USE `sgfc`;

INSERT INTO `perfil` (`id_Perfil`, `nombre_perfil`, `tipo_perfil`, `descripcion`) VALUES
(4, 'administrador_regional', 4, 'Administrador de una regional y sus centros de formación')
ON DUPLICATE KEY UPDATE
  `nombre_perfil` = VALUES(`nombre_perfil`),
  `tipo_perfil`   = VALUES(`tipo_perfil`),
  `descripcion`   = VALUES(`descripcion`);
