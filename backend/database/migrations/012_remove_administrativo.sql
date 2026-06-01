-- SGFC — Migración 012: elimina perfil administrativo nacional (id 3)
USE `sgfc`;

-- Asignar centro por defecto a administrativos legacy sin centro
UPDATE `personas` p
SET p.id_centro = (
    SELECT MIN(c.id_centro) FROM `centros` c WHERE COALESCE(c.activo, 1) = 1
)
WHERE p.id_perfil = 3 AND p.id_centro IS NULL;

-- Pasar administrativos nacionales a administrativo de centro
UPDATE `personas` SET id_perfil = 4 WHERE id_perfil = 3;

DELETE FROM `perfil` WHERE `id_Perfil` = 3;
