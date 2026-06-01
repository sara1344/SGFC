-- Agrupa notificaciones de actividad de contratistas para administrativos.
USE `sgfc`;

ALTER TABLE `notificaciones`
  ADD COLUMN `id_contratista` INT(11) DEFAULT NULL AFTER `id_persona`,
  ADD COLUMN `cantidad_detalles` INT(11) NOT NULL DEFAULT 0 AFTER `id_contratista`;

ALTER TABLE `notificaciones`
  ADD KEY `fk_notif_contratista` (`id_contratista`),
  ADD CONSTRAINT `fk_notif_contratista` FOREIGN KEY (`id_contratista`) REFERENCES `personas` (`id_persona`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `notificacion_detalles` (
  `id_detalle`       INT(11)      NOT NULL AUTO_INCREMENT,
  `id_notificacion`  INT(11)      NOT NULL,
  `tipo`             VARCHAR(50)  NOT NULL,
  `titulo`           VARCHAR(180) NOT NULL,
  `mensaje`          TEXT         NOT NULL,
  `link`             VARCHAR(255) DEFAULT NULL,
  `fecha_creacion`   DATETIME     DEFAULT current_timestamp(),
  PRIMARY KEY (`id_detalle`),
  KEY `fk_det_notif` (`id_notificacion`),
  CONSTRAINT `fk_det_notif` FOREIGN KEY (`id_notificacion`) REFERENCES `notificaciones` (`id_notificacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
