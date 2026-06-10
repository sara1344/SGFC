<?php
namespace App\Services;

use App\Config\App;
use App\Config\Env;
use App\Models\PasswordResetToken;
use App\Models\User;

final class PasswordResetService
{
    private const TOKEN_TTL_MINUTES = 30;
    private const MAX_REQUESTS_PER_HOUR = 5;

    public const GENERIC_OK_MESSAGE =
        'Solicitud recibida. Si el usuario y el correo coinciden con una cuenta activa, recibirá un enlace para restablecer su contraseña en los próximos minutos.';

    /** @return array{ok:bool,message:string,sent?:bool} */
    public static function requestReset(string $usuario, string $correo): array
    {
        $usuario = trim($usuario);
        $correo = mb_strtolower(trim($correo));

        if ($usuario === '' || $correo === '') {
            return ['ok' => false, 'message' => 'Indique su usuario y correo electrónico.'];
        }
        if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'message' => 'El correo electrónico no es válido.'];
        }

        if (!NotificationConfigService::smtpReady()) {
            return [
                'ok' => false,
                'message' => 'El envío de correos no está configurado. Contacte al administrador del sistema.',
            ];
        }

        $userModel = new User();
        $row = $userModel->findByLoginAndEmail($usuario, $correo);
        $sent = false;

        if ($row) {
            $personaId = (int) $row['id_persona'];
            $tokenModel = new PasswordResetToken();

            if ($tokenModel->countRecentForUser($personaId, 60) >= self::MAX_REQUESTS_PER_HOUR) {
                return [
                    'ok' => true,
                    'message' => self::GENERIC_OK_MESSAGE,
                    'sent' => false,
                ];
            }

            $plainToken = bin2hex(random_bytes(32));
            $hash = hash('sha256', $plainToken);
            $expires = date('Y-m-d H:i:s', time() + self::TOKEN_TTL_MINUTES * 60);

            $tokenModel->invalidateForUser($personaId);
            $tokenModel->create($personaId, $hash, $expires);

            $link = self::buildResetLink($plainToken);
            $nombre = trim((string) ($row['nombres'] ?? ''));
            $subject = 'SGFC — Restablecer contraseña';
            $email = EmailTemplateService::passwordReset($nombre, $link);

            $mailResult = MailService::sendTransactional(
                $correo,
                $subject,
                $email['html'],
                $email['text'],
                $email['embeds']
            );
            $sent = $mailResult['ok'];

            if ($sent) {
                AuditService::log('password_reset_requested', 'personas', $personaId, [
                    'correo' => $correo,
                ]);
                return [
                    'ok' => true,
                    'message' => self::GENERIC_OK_MESSAGE,
                    'sent' => true,
                ];
            }

            App::logError(
                'PASSWORD_RESET_MAIL',
                ($mailResult['message'] ?? 'unknown') . " | usuario={$usuario} | to={$correo}"
            );

            return [
                'ok' => false,
                'message' => $mailResult['message']
                    ?? 'No pudimos enviar el correo de recuperación. Contacte al administrador del sistema.',
            ];
        }

        return [
            'ok' => true,
            'message' => self::GENERIC_OK_MESSAGE,
            'sent' => false,
        ];
    }

    /** @return array{ok:bool,message:string,user?:array<string,mixed>} */
    public static function validateToken(string $plainToken): array
    {
        $plainToken = trim($plainToken);
        if ($plainToken === '' || strlen($plainToken) < 32) {
            return ['ok' => false, 'message' => 'Enlace inválido o incompleto.'];
        }

        $row = (new PasswordResetToken())->findValid(hash('sha256', $plainToken));
        if (!$row) {
            return [
                'ok' => false,
                'message' => 'El enlace expiró o ya fue utilizado. Solicite uno nuevo.',
            ];
        }

        return [
            'ok' => true,
            'message' => 'Enlace válido.',
            'user' => [
                'usuario' => $row['usuario'],
                'nombre'  => trim(($row['nombres'] ?? '') . ' ' . ($row['Apellidos'] ?? '')),
            ],
        ];
    }

    /** @return array{ok:bool,message:string} */
    public static function resetPassword(string $plainToken, string $password, string $passwordConfirm): array
    {
        $plainToken = trim($plainToken);
        if ($password !== $passwordConfirm) {
            return ['ok' => false, 'message' => 'Las contraseñas no coinciden.'];
        }

        if ($pwdErr = SecurityConfigService::validatePassword($password)) {
            return ['ok' => false, 'message' => $pwdErr];
        }

        $tokenModel = new PasswordResetToken();
        $row = $tokenModel->findValid(hash('sha256', $plainToken));
        if (!$row) {
            return [
                'ok' => false,
                'message' => 'El enlace expiró o ya fue utilizado. Solicite uno nuevo.',
            ];
        }

        $personaId = (int) $row['id_persona'];
        (new User())->update($personaId, [
            'contrasena' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]),
        ]);
        $tokenModel->markUsed((int) $row['id']);
        $tokenModel->invalidateForUser($personaId);

        AuditService::log('password_reset_completed', 'personas', $personaId);

        return ['ok' => true, 'message' => 'Contraseña actualizada. Ya puede iniciar sesión.'];
    }

    private static function buildResetLink(string $plainToken): string
    {
        $base = rtrim((string) Env::get('FRONTEND_URL', ''), '/');
        if ($base === '') {
            $base = rtrim((string) Env::get('APP_URL', 'http://localhost/sgfc'), '/');
            $base .= '/frontend';
        }
        return $base . '/views/restablecer-contrasena.html?token=' . urlencode($plainToken);
    }
}
