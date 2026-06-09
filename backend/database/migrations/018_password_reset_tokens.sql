-- SGFC — Migración 018: tokens de recuperación de contraseña (válidos 30 min)
USE `sgfc`;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `id_persona`   INT(11)      NOT NULL,
  `token_hash`   CHAR(64)     NOT NULL,
  `expires_at`   DATETIME     NOT NULL,
  `used_at`      DATETIME     DEFAULT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_persona_expires` (`id_persona`, `expires_at`),
  CONSTRAINT `fk_reset_persona` FOREIGN KEY (`id_persona`) REFERENCES `personas` (`id_persona`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
