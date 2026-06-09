-- SGFC — Migración 022: días aprobados y motivo de cambio en prórrogas
USE `sgfc`;

ALTER TABLE `periodo_prorrogas`
  ADD COLUMN `dias_aprobados` TINYINT(3) NULL DEFAULT NULL AFTER `dias_solicitados`,
  ADD COLUMN `motivo_cambio_dias` TEXT NULL DEFAULT NULL AFTER `justificacion`;
