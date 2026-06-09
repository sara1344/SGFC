-- Firma del contratista incrustada en evidencias que requieren firma.
ALTER TABLE `evidencias_uploads`
  ADD COLUMN `firmado_contratista` TINYINT(1) NOT NULL DEFAULT 0 AFTER `estado`,
  ADD COLUMN `firma_pagina` INT UNSIGNED NULL DEFAULT NULL AFTER `firmado_contratista`,
  ADD COLUMN `firma_x_pct` DECIMAL(7,4) NULL DEFAULT NULL AFTER `firma_pagina`,
  ADD COLUMN `firma_y_pct` DECIMAL(7,4) NULL DEFAULT NULL AFTER `firma_x_pct`,
  ADD COLUMN `firma_w_pct` DECIMAL(7,4) NULL DEFAULT NULL AFTER `firma_y_pct`,
  ADD COLUMN `firma_h_pct` DECIMAL(7,4) NULL DEFAULT NULL AFTER `firma_w_pct`,
  ADD COLUMN `fecha_firma_contratista` DATETIME NULL DEFAULT NULL AFTER `firma_h_pct`;
