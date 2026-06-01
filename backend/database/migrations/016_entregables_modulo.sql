-- GF: PDF unificado + firmas | GC: ZIP sin firmas
ALTER TABLE `pdfs_unificados`
  ADD COLUMN `modulo_codigo`   VARCHAR(4)  NOT NULL DEFAULT 'GF' AFTER `id_persona`,
  ADD COLUMN `tipo_entregable` ENUM('pdf','zip') NOT NULL DEFAULT 'pdf' AFTER `modulo_codigo`;

ALTER TABLE `pdfs_unificados` DROP INDEX `uk_pdf_periodo_persona`;
ALTER TABLE `pdfs_unificados`
  ADD UNIQUE KEY `uk_pdf_periodo_persona_modulo` (`id_periodo`, `id_persona`, `modulo_codigo`);

UPDATE `pdfs_unificados` SET `modulo_codigo` = 'GF', `tipo_entregable` = 'pdf' WHERE `modulo_codigo` = 'GF';
