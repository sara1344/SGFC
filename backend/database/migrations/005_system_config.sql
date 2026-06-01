-- SGFC — Migración 005: configuración del sistema (módulo seguridad)
USE `sgfc`;

CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `grupo`           VARCHAR(40)  NOT NULL,
  `datos`           JSON         NOT NULL,
  `actualizado_en`  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `actualizado_por` INT(11)      DEFAULT NULL,
  PRIMARY KEY (`grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `intentos_login` (
  `identificador`   VARCHAR(120) NOT NULL,
  `intentos`        INT(11)      NOT NULL DEFAULT 0,
  `bloqueado_hasta` DATETIME     DEFAULT NULL,
  `ultimo_intento`  DATETIME     DEFAULT NULL,
  PRIMARY KEY (`identificador`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `configuracion_sistema` (`grupo`, `datos`) VALUES
('seguridad', JSON_OBJECT(
  'password_min_length', 6,
  'password_require_upper', false,
  'password_require_number', false,
  'max_login_attempts', 5,
  'lockout_minutes', 15,
  'session_lifetime_minutes', 120,
  'recaptcha_habilitado', true,
  'max_upload_mb', 10
))
ON DUPLICATE KEY UPDATE `grupo` = `grupo`;
