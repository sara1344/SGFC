-- SGFC — Migración 021: prórrogas de entrega de evidencias por periodo
USE `sgfc`;

CREATE TABLE IF NOT EXISTS `periodo_prorrogas` (
  `id_prorroga`            INT(11)      NOT NULL AUTO_INCREMENT,
  `id_periodo`             INT(11)      NOT NULL,
  `id_contratista`         INT(11)      NOT NULL,
  `dias_solicitados`       TINYINT(3)   NOT NULL,
  `justificacion`          TEXT         NOT NULL,
  `estado`                 ENUM('Pendiente','Aprobada','Rechazada') NOT NULL DEFAULT 'Pendiente',
  `fecha_solicitud`        DATETIME     NOT NULL DEFAULT current_timestamp(),
  `fecha_limite_extendida` DATE         DEFAULT NULL,
  `id_responde`            INT(11)      DEFAULT NULL,
  `fecha_respuesta`        DATETIME     DEFAULT NULL,
  `observacion_admin`      TEXT         DEFAULT NULL,
  PRIMARY KEY (`id_prorroga`),
  KEY `fk_prorroga_periodo` (`id_periodo`),
  KEY `fk_prorroga_contratista` (`id_contratista`),
  KEY `idx_prorroga_estado` (`estado`),
  CONSTRAINT `fk_prorroga_periodo` FOREIGN KEY (`id_periodo`) REFERENCES `periodos` (`id_periodo`) ON DELETE CASCADE,
  CONSTRAINT `fk_prorroga_contratista` FOREIGN KEY (`id_contratista`) REFERENCES `personas` (`id_persona`) ON DELETE CASCADE,
  CONSTRAINT `fk_prorroga_responde` FOREIGN KEY (`id_responde`) REFERENCES `personas` (`id_persona`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

UPDATE `configuracion_sistema`
SET `datos` = JSON_SET(
    COALESCE(`datos`, JSON_OBJECT()),
    '$.inapp_admin_prorroga', true,
    '$.inapp_contractor_prorroga', true
)
WHERE `grupo` = 'notificaciones';
