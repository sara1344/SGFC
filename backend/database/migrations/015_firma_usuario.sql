-- Firma registrada una sola vez por usuario (personas.firma_imagen_b64)
ALTER TABLE `personas`
  ADD COLUMN `firma_imagen_b64` LONGTEXT NULL DEFAULT NULL AFTER `activo`;

-- Copiar firmas ya usadas en PDFs (si existen)
UPDATE `personas` p
SET p.firma_imagen_b64 = (
    SELECT f.imagen_b64 FROM `firmas` f
    WHERE f.id_persona = p.id_persona
      AND f.imagen_b64 IS NOT NULL
      AND TRIM(f.imagen_b64) <> ''
    ORDER BY f.id_firma DESC
    LIMIT 1
)
WHERE p.firma_imagen_b64 IS NULL
  AND EXISTS (
    SELECT 1 FROM `firmas` f2
    WHERE f2.id_persona = p.id_persona
      AND f2.imagen_b64 IS NOT NULL
      AND TRIM(f2.imagen_b64) <> ''
  );
