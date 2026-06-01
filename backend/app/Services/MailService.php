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

            $detail = trim($mail->ErrorInfo ?: $e->getMessage());

            return [

                'ok'      => false,

                'message' => self::friendlyError($detail),

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



    private static function friendlyError(string $detail): string

    {

        $lower = mb_strtolower($detail);



        if (str_contains($detail, '5.7.139') || str_contains($lower, 'user credentials were incorrect')) {

            return 'Usuario o contraseña incorrectos. Verifique que puede entrar en office.com con ese correo. '

                . 'Si tiene verificación en dos pasos, cree una contraseña de aplicación en Microsoft y úsela en SMTP_PASSWORD (backend/.env).';

        }



        if (str_contains($detail, '5.7.57') || str_contains($lower, 'smtpclientauthentication is disabled')) {

            return 'Office 365 bloqueó SMTP para esta cuenta. Solicite al área TI del SENA habilitar SMTP AUTH o use otro correo remitente.';

        }



        if (str_contains($lower, 'authenticate') || str_contains($lower, 'authentication')) {

            return 'No se pudo autenticar en SMTP. Revise usuario, contraseña en backend/.env (SMTP_PASSWORD) y que el correo acepte SMTP.';

        }



        if (str_contains($lower, 'connect') || str_contains($lower, 'could not connect')) {

            return 'No se pudo conectar al servidor SMTP. Revise host (smtp.office365.com), puerto 587 y conexión a internet.';

        }



        return 'No se pudo enviar: ' . $detail;

    }

}


