-- SGFC — Migración 007: calendario institucional
USE `sgfc`;

INSERT INTO `configuracion_sistema` (`grupo`, `datos`) VALUES
('calendario', JSON_OBJECT(
  'zona_horaria', 'America/Bogota',
  'dias_habiles', JSON_ARRAY(1, 2, 3, 4, 5),
  'hora_cierre', '17:00',
  'validar_fecha_limite_habil', true,
  'fechas_especiales', JSON_ARRAY()
))
ON DUPLICATE KEY UPDATE `grupo` = `grupo`;
