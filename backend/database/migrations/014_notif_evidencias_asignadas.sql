-- SGFC — Migración 014: notificación contratista evidencias asignadas
USE `sgfc`;

UPDATE `configuracion_sistema`
SET `datos` = JSON_SET(
    COALESCE(`datos`, JSON_OBJECT()),
    '$.inapp_contractor_evidencias_asignadas', true,
    '$.email_contractor_evidencias_asignadas', false
)
WHERE `grupo` = 'notificaciones';
