-- Indica si la evidencia debe estar firmada (configuración del tipo de evidencia).
ALTER TABLE `evidencias_master`
  ADD COLUMN `requiere_firma` TINYINT(1) NOT NULL DEFAULT 0 AFTER `obligatoria`;
