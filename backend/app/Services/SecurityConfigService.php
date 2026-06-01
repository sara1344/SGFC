<?php
namespace App\Services;

use App\Config\Env;
use App\Models\SystemConfig;

final class SecurityConfigService
{
    private const GRUPO = 'seguridad';

    /** @var array<string,mixed>|null */
    private static ?array $cache = null;

    /** @return array<string,mixed> */
    public static function defaults(): array
    {
        return [
            'password_min_length'      => 6,
            'password_require_upper'   => false,
            'password_require_number'  => false,
            'max_login_attempts'       => 5,
            'lockout_minutes'          => 15,
            'session_lifetime_minutes' => (int) Env::get('SESSION_LIFETIME', 120),
            'recaptcha_habilitado'     => true,
            'max_upload_mb'            => (int) round(((int) Env::get('MAX_UPLOAD_SIZE', 10_485_760)) / 1048576),
        ];
    }

    /** @return array<string,mixed> */
    public static function get(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        try {
            $row = (new SystemConfig())->getGroup(self::GRUPO);
            self::$cache = array_merge(self::defaults(), $row['datos'] ?? []);
        } catch (\Throwable) {
            self::$cache = self::defaults();
        }
        return self::$cache;
    }

    public static function clearCache(): void
    {
        self::$cache = null;
    }

    /** @param array<string,mixed> $input @return array<string,mixed> */
    public static function normalizeInput(array $input): array
    {
        $d = self::defaults();
        return [
            'password_min_length'      => max(4, min(32, (int) ($input['password_min_length'] ?? $d['password_min_length']))),
            'password_require_upper'   => !empty($input['password_require_upper']),
            'password_require_number'  => !empty($input['password_require_number']),
            'max_login_attempts'       => max(0, min(20, (int) ($input['max_login_attempts'] ?? $d['max_login_attempts']))),
            'lockout_minutes'          => max(1, min(1440, (int) ($input['lockout_minutes'] ?? $d['lockout_minutes']))),
            'session_lifetime_minutes' => max(15, min(480, (int) ($input['session_lifetime_minutes'] ?? $d['session_lifetime_minutes']))),
            'recaptcha_habilitado'     => !empty($input['recaptcha_habilitado']),
            'max_upload_mb'            => max(1, min(50, (int) ($input['max_upload_mb'] ?? $d['max_upload_mb']))),
        ];
    }

    /** @param array<string,mixed> $datos */
    public static function save(array $datos, ?int $userId = null): array
    {
        $normalized = self::normalizeInput($datos);
        (new SystemConfig())->saveGroup(self::GRUPO, $normalized, $userId);
        self::$cache = $normalized;
        return $normalized;
    }

    public static function sessionLifetimeMinutes(): int
    {
        return (int) self::get()['session_lifetime_minutes'];
    }

    public static function maxUploadBytes(): int
    {
        return (int) self::get()['max_upload_mb'] * 1048576;
    }

    public static function recaptchaEnabledInConfig(): bool
    {
        return (bool) self::get()['recaptcha_habilitado'];
    }

    public static function isRecaptchaRequired(): bool
    {
        $siteKey = trim((string) Env::get('RECAPTCHA_SITE_KEY', ''));
        $secret  = trim((string) Env::get('RECAPTCHA_SECRET_KEY', ''));
        if ($siteKey === '' || $secret === '') {
            return false;
        }
        return self::recaptchaEnabledInConfig();
    }

    public static function validatePassword(string $password): ?string
    {
        $cfg = self::get();
        $min = (int) $cfg['password_min_length'];
        if (strlen($password) < $min) {
            return "La contraseña debe tener al menos {$min} caracteres.";
        }
        if (!empty($cfg['password_require_upper']) && !preg_match('/[A-ZÁÉÍÓÚÑ]/u', $password)) {
            return 'La contraseña debe incluir al menos una letra mayúscula.';
        }
        if (!empty($cfg['password_require_number']) && !preg_match('/\d/', $password)) {
            return 'La contraseña debe incluir al menos un número.';
        }
        return null;
    }

    /** @return array<string,mixed> */
    public static function publicView(): array
    {
        $cfg = self::get();
        $siteKey = trim((string) Env::get('RECAPTCHA_SITE_KEY', ''));
        $secret  = trim((string) Env::get('RECAPTCHA_SECRET_KEY', ''));
        $hasKeys = $siteKey !== '' && $secret !== '';
        $misconfigured = ($siteKey !== '') !== ($secret !== '');

        return [
            'config' => $cfg,
            'servidor' => [
                'recaptcha_keys_configured' => $hasKeys,
                'recaptcha_misconfigured'   => $misconfigured,
                'recaptcha_effective'       => self::isRecaptchaRequired(),
                'allowed_file_types'        => trim((string) Env::get('ALLOWED_FILE_TYPES', 'application/pdf')),
                'env_session_lifetime'      => (int) Env::get('SESSION_LIFETIME', 120),
                'env_max_upload_mb'         => round(((int) Env::get('MAX_UPLOAD_SIZE', 10_485_760)) / 1048576, 1),
            ],
        ];
    }
}
