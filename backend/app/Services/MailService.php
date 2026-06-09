<?php

namespace App\Services;



use App\Config\App;

use App\Config\Env;

use PHPMailer\PHPMailer\Exception as MailException;

use PHPMailer\PHPMailer\PHPMailer;



/**

 * Envío SMTP autenticado (PHPMailer).

 * La contraseña vive en backend/.env → SMTP_PASSWORD.

 */

final class MailService

{

    public static function send(string $to, string $subject, string $body): bool

    {

        if (!NotificationConfigService::emailEnabled()) {

            return false;

        }



        $result = self::deliver($to, $subject, $body);

        if (!$result['ok']) {

            App::logError('MAIL_SEND_FAILED', "to={$to} subject={$subject} error={$result['message']}");

        }

        return $result['ok'];

    }



    public static function sendTest(string $to): array

    {

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {

            return ['ok' => false, 'message' => 'Correo de prueba inválido.'];

        }

        if (!NotificationConfigService::smtpReady()) {

            return [

                'ok'      => false,

                'message' => 'Complete host, usuario, remitente y SMTP_PASSWORD en backend/.env antes de probar.',

            ];

        }



        $body = "Correo de prueba SGFC\n\nSi recibe este mensaje, la configuración SMTP está operativa.\n\n" . date('c');

        return self::deliver($to, 'Prueba SGFC — Notificaciones', $body);

    }



    /** Correo transaccional (recuperación de contraseña); no exige notificaciones habilitadas. */

    /** @return array{ok:bool,message:string} */

    public static function sendTransactional(string $to, string $subject, string $body): array

    {

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {

            return ['ok' => false, 'message' => 'Correo destino inválido.'];

        }

        if (!NotificationConfigService::smtpReady()) {

            return ['ok' => false, 'message' => 'SMTP no configurado.'];

        }

        $result = self::deliver($to, $subject, $body);

        if (!$result['ok']) {

            App::logError('MAIL_TRANSACTIONAL_FAILED', "to={$to} subject={$subject} error={$result['message']}");

        }

        return $result;

    }



    /** @return array{ok:bool,message:string} */

    private static function deliver(string $to, string $subject, string $body): array

    {

        $cfg = NotificationConfigService::get();

        $password = trim((string) Env::get('SMTP_PASSWORD', ''));

        $mail = new PHPMailer(true);



        try {

            self::configureMailer($mail, $cfg, $password);



            $fromEmail = (string) $cfg['smtp_from_email'];

            $fromName = (string) ($cfg['smtp_from_name'] ?: 'SGFC');

            $mail->setFrom($fromEmail, $fromName);

            $mail->addAddress($to);

            $mail->Subject = $subject;

            $mail->Body = $body;



            $mail->send();



            return ['ok' => true, 'message' => 'Correo de prueba enviado a ' . $to . '.'];

        } catch (MailException $e) {

            $detail = self::mailErrorDetail($mail, $e);

            return [

                'ok'      => false,

                'message' => self::friendlyError($detail, $cfg),

            ];

        } catch (\Throwable $e) {

            return ['ok' => false, 'message' => 'Error al enviar correo: ' . $e->getMessage()];

        }

    }



    /** @param array<string,mixed> $cfg */

    private static function configureMailer(PHPMailer $mail, array $cfg, string $password): void

    {

        $mail->CharSet = PHPMailer::CHARSET_UTF8;

        $mail->isSMTP();

        $mail->Host = (string) $cfg['smtp_host'];

        $mail->Port = (int) ($cfg['smtp_port'] ?? 587);

        $mail->SMTPAuth = true;

        $mail->AuthType = 'LOGIN';

        $mail->Username = (string) $cfg['smtp_user'];

        $mail->Password = $password;



        $enc = (string) ($cfg['smtp_encryption'] ?? 'tls');

        if ($enc === 'ssl') {

            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;

        } elseif ($enc === 'none') {

            $mail->SMTPSecure = '';

            $mail->SMTPAutoTLS = false;

        } else {

            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;

        }

    }



    private static function mailErrorDetail(PHPMailer $mail, MailException $e): string
    {
        $parts = array_filter([
            trim($mail->ErrorInfo ?: ''),
            trim($e->getMessage()),
            trim((string) ($mail->getSMTPInstance()?->getLastReply() ?? '')),
        ]);
        return implode(' ', $parts);
    }

    /** @param array<string,mixed> $cfg */
    private static function friendlyError(string $detail, array $cfg = []): string
    {
        $lower = mb_strtolower($detail);
        $host = mb_strtolower((string) ($cfg['smtp_host'] ?? ''));
        $isGmail = str_contains($host, 'gmail');



        if (
            str_contains($lower, 'smtpclientauthentication is disabled')
            || str_contains($detail, 'smtp_auth_disabled')
        ) {
            return 'Microsoft deshabilitó el envío SMTP en esta cuenta. Active SMTP AUTH en el buzón '
                . 'o use otro correo remitente (p. ej. Gmail). Más información: https://aka.ms/smtp_auth_disabled';
        }

        if (
            $isGmail
            || str_contains($lower, 'username and password not accepted')
            || str_contains($lower, 'badcredentials')
            || str_contains($lower, 'application-specific password')
            || str_contains($detail, '534-5.7.9')
        ) {
            return 'Gmail no acepta la contraseña normal de la cuenta para SMTP. '
                . 'Cree una contraseña de aplicación en https://myaccount.google.com/apppasswords '
                . '(verificación en 2 pasos activa) y póngala en SMTP_PASSWORD en backend/.env.';
        }

        if (str_contains($detail, '5.7.139') || str_contains($lower, 'user credentials were incorrect')) {
            return 'Usuario o contraseña SMTP incorrectos. Si tiene verificación en dos pasos en Microsoft, '
                . 'cree una contraseña de aplicación y configúrela en SMTP_PASSWORD (backend/.env).';
        }

        if (str_contains($detail, '5.7.57')) {
            return 'Office 365 bloqueó SMTP para esta cuenta. Solicite al área TI habilitar SMTP AUTH o use otro correo remitente.';
        }



        if (str_contains($lower, 'authenticate') || str_contains($lower, 'authentication')) {

            return 'No se pudo autenticar en SMTP. Revise usuario, contraseña en backend/.env (SMTP_PASSWORD) y que el correo acepte SMTP.';

        }



        if (str_contains($lower, 'connect') || str_contains($lower, 'could not connect')) {

            return 'No se pudo conectar al servidor SMTP. Revise host (smtp.gmail.com), puerto 587 y conexión a internet.';

        }



        return 'No se pudo enviar: ' . $detail;

    }

}


