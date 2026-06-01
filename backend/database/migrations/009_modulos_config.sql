-- SGFC — Migración 009: configuración de módulos y funciones
USE `sgfc`;

INSERT INTO `configuracion_sistema` (`grupo`, `datos`) VALUES
('modulos', JSON_OBJECT(
  'carga_contratista', true,
  'revision_admin', true,
  'unificar_pdf', true,
  'firma_pdf', true
))
ON DUPLICATE KEY UPDATE `grupo` = `grupo`;
