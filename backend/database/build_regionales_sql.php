<?php
declare(strict_types=1);

$lines = file(__DIR__ . '/data/regionales_centros.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$regionales = [];
$rid = 0;
foreach ($lines as $line) {
    $line = trim($line);
    if (str_starts_with($line, 'Regional ')) {
        $rid++;
        $regionales[$rid] = ['nombre' => $line, 'centros' => []];
    } elseif ($rid > 0) {
        $regionales[$rid]['centros'][] = $line;
    }
}

function esc(string $s): string
{
    return str_replace(["\\", "'"], ["\\\\", "\\'"], $s);
}

$out = <<<'HDR'
-- SGFC — Migración 004: regionales, centros y vínculo en personas
-- Ejecutar en MySQL:  USE sgfc;  luego pegar este script.

USE sgfc;

SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `centros`;
TRUNCATE TABLE `regionales`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS `regionales` (
  `id_regional` INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(120) NOT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_regional`),
  UNIQUE KEY `uq_regionales_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `centros` (
  `id_centro`   INT(11)      NOT NULL AUTO_INCREMENT,
  `id_regional` INT(11)      NOT NULL,
  `nombre`      VARCHAR(200) NOT NULL,
  `activo`      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_centro`),
  KEY `fk_centro_regional` (`id_regional`),
  UNIQUE KEY `uq_centro_regional_nombre` (`id_regional`, `nombre`),
  CONSTRAINT `fk_centro_regional` FOREIGN KEY (`id_regional`) REFERENCES `regionales` (`id_regional`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `regionales` (`id_regional`, `nombre`) VALUES

HDR;

$rvals = [];
foreach ($regionales as $id => $r) {
    $rvals[] = sprintf("(%d, '%s')", $id, esc($r['nombre']));
}
$out .= implode(",\n", $rvals) . "\nON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);\n\n";
$out .= "INSERT INTO `centros` (`id_centro`, `id_regional`, `nombre`) VALUES\n";

$cvals = [];
$cid = 0;
foreach ($regionales as $id => $r) {
    foreach ($r['centros'] as $c) {
        $cid++;
        $cvals[] = sprintf("(%d, %d, '%s')", $cid, $id, esc($c));
    }
}
$out .= implode(",\n", $cvals) . "\nON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `id_regional` = VALUES(`id_regional`);\n\n";

$out .= <<<'TAIL'
-- Agregar columna id_centro a personas (si aún no existe)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personas' AND COLUMN_NAME = 'id_centro'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE `personas`
     ADD COLUMN `id_centro` INT(11) DEFAULT NULL AFTER `id_perfil`,
     ADD KEY `fk_persona_centro` (`id_centro`),
     ADD CONSTRAINT `fk_persona_centro` FOREIGN KEY (`id_centro`) REFERENCES `centros` (`id_centro`)
       ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
TAIL;

$dest = __DIR__ . '/migrations/004_regionales_centros.sql';
file_put_contents($dest, $out);
echo "OK: {$dest}\n";
echo 'Regionales: ' . count($regionales) . "\n";
echo 'Centros: ' . count($cvals) . "\n";
