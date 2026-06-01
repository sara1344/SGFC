-- SGFC — Migración 006: configuración institucional (valores por defecto)
USE `sgfc`;

INSERT INTO `configuracion_sistema` (`grupo`, `datos`) VALUES
('institucional', JSON_OBJECT(
  'nombre_regional', 'Regional Caldas',
  'nombre_centro', 'Centro Industrial y del Desarrollo Tecnológico',
  'codigo_sena', '',
  'correo_contacto', '',
  'telefono', '',
  'direccion', '',
  'id_regional', 7,
  'id_centro', NULL
))
ON DUPLICATE KEY UPDATE `grupo` = `grupo`;
