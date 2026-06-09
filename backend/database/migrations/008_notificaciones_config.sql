-- SGFC — Migración 008: notificaciones automáticas
USE `sgfc`;

INSERT INTO `configuracion_sistema` (`grupo`, `datos`) VALUES
('notificaciones', JSON_OBJECT(
  'inapp_admin_evidencia_subida', true,
  'inapp_admin_pdf_firma', true,
  'inapp_contractor_aprobada', true,
  'inapp_contractor_rechazada', true,
  'inapp_contractor_pdf_firmado', true,
  'email_habilitado', false,
  'email_admin_evidencia', false,
  'email_contractor_rechazo', true,
  'email_contractor_aprobacion', false,
  'email_resumen_diario', false,
  'smtp_host', 'smtp.gmail.com',
  'smtp_port', 587,
  'smtp_encryption', 'tls',
  'smtp_user', 'sgfcsena@gmail.com',
  'smtp_from_email', 'sgfcsena@gmail.com',
  'smtp_from_name', 'SGFC — SENA'
))
ON DUPLICATE KEY UPDATE `grupo` = `grupo`;
