-- Normaliza tipo_archivo a códigos de formato: pdf | excel | word | imagen
UPDATE `evidencias_master`
SET `tipo_archivo` = 'pdf'
WHERE `tipo_archivo` IS NULL
   OR TRIM(`tipo_archivo`) = ''
   OR `tipo_archivo` IN ('application/pdf', 'application/x-pdf');

UPDATE `evidencias_master` em
JOIN `subgrupos` s ON s.id_subgrupo = em.id_subgrupo
JOIN `modulos` m ON m.id_modulo = s.id_modulo
SET em.tipo_archivo = 'pdf'
WHERE m.codigo = 'GF' AND em.tipo_archivo <> 'pdf';
