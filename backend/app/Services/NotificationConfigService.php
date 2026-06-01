<?php
namespace App\Services;

use App\Config\Env;
use App\Models\SystemConfig;
use App\Models\User;

final class NotificationConfigService
{
    private const GRUPO = 'notificaciones';

    /** @var array<string,mixed>|null */
    private static ?array $cache = null;

    /** @return array<string,mixed> */
    public static function defaults(): array
    {
        return [
            'inapp_admin_evidencia_subida'  => true,
            'inapp_admin_pdf_firma'         => true,
            'inapp_contractor_aprobada'       => true,
            'inapp_contractor_rechazada'    => true,
            'inapp_contractor_pdf_firmado'  => true,
            'inapp_contractor_evidencias_asignadas' => true,
            'email_habilitado'              => false,
            'email_admin_evidencia'         => false,
            'email_contractor_rechazo'      => true,
            'email_contractor_aprobacion'   => false,
            'email_contractor_evidencias_asignadas' => false,
            'email_resumen_diario'          => false,
            'smtp_host'                     => '',
            'smtp_port'                     => 587,
            'smtp_encryption'               => 'tls',
            'smtp_user'                     => '',
            'smtp_from_email'               => '',
            'smtp_from_name'                => 'SGFC — SENA',
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

    public static function inAppEnabled(string $eventKey): bool
    {
        $cfg = self::get();
        $map = [
            'admin_evidencia_subida'  => 'inapp_admin_evidencia_subida',
            'admin_pdf_firma'         => 'inapp_admin_pdf_firma',
            'contractor_aprobada'     => 'inapp_contractor_aprobada',
            'contractor_rechazada'    => 'inapp_contractor_rechazada',
            'contractor_pdf_firmado'  => 'inapp_contractor_pdf_firmado',
            'contractor_evidencias_asignadas' => 'inapp_contractor_evidencias_asignadas',
        ];
        $field = $map[$eventKey] ?? null;
        return $field ? !empty($cfg[$field]) : true;
    }

    public static function emailEventEnabled(string $eventKey): bool
    {
        if (!self::emailEnabled()) {
            return false;
        }
        $cfg = self::get();
        $map = [
            'admin_evidencia_subida' => 'email_admin_evidencia',
            'contractor_rechazada'   => 'email_contractor_rechazo',
            'contractor_aprobada'    => 'email_contractor_aprobacion',
            'contractor_evidencias_asignadas' => 'email_contractor_evidencias_asignadas',
        ];
        $field = $map[$eventKey] ?? null;
        return $field ? !empty($cfg[$field]) : false;
    }

    public static function emailEnabled(): bool
    {
        $cfg = self::get();
        return !empty($cfg['email_habilitado']) && self::smtpReady();
    }

    public static function smtpReady(): bool
    {
        $cfg = self::get();
        $pass = trim((string) Env::get('SMTP_PASSWORD', ''));
        return trim((string) ($cfg['smtp_host'] ?? '')) !== ''
            && trim((string) ($cfg['smtp_user'] ?? '')) !== ''
            && trim((string) ($cfg['smtp_from_email'] ?? '')) !== ''
            && $pass !== '';
    }

    /** @param array<string,mixed> $input @return array{data:array<string,mixed>,errors:array<string,string>} */
    public static function normalizeInput(array $input): array
    {
        $errors = [];
        $d = self::defaults();

        $port = (int) ($input['smtp_port'] ?? $d['smtp_port']);
        if ($port < 1 || $port > 65535) {
            $errors['smtp_port'] = 'Puerto SMTP inválido.';
        }

        $enc = trim((string) ($input['smtp_encryption'] ?? 'tls'));
        if (!in_array($enc, ['tls', 'ssl', 'none'], true)) {
            $enc = 'tls';
        }

        $fromEmail = trim((string) ($input['smtp_from_email'] ?? ''));
        if ($fromEmail !== '' && !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
            $errors['smtp_from_email'] = 'Correo remitente inválido.';
        }

        $data = [
            'inapp_admin_evidencia_subida'  => !empty($input['inapp_admin_evidencia_subida']),
            'inapp_admin_pdf_firma'         => !empty($input['inapp_admin_pdf_firma']),
            'inapp_contractor_aprobada'     => !empty($input['inapp_contractor_aprobada']),
            'inapp_contractor_rechazada'    => !empty($input['inapp_contractor_rechazada']),
            'inapp_contractor_pdf_firmado'  => !empty($input['inapp_contractor_pdf_firmado']),
            'inapp_contractor_evidencias_asignadas' => !empty($input['inapp_contractor_evidencias_asignadas']),
            'email_habilitado'              => !empty($input['email_habilitado']),
            'email_admin_evidencia'         => !empty($input['email_admin_evidencia']),
            'email_contractor_rechazo'      => !empty($input['email_contractor_rechazo']),
            'email_contractor_aprobacion'     => !empty($input['email_contractor_aprobacion']),
            'email_contractor_evidencias_asignadas' => !empty($input['email_contractor_evidencias_asignadas']),
            'email_resumen_diario'          => !empty($input['email_resumen_diario']),
            'smtp_host'                     => trim((string) ($input['smtp_host'] ?? '')),
            'smtp_port'                     => $port,
            'smtp_encryption'               => $enc,
            'smtp_user'                     => trim((string) ($input['smtp_user'] ?? '')),
            'smtp_from_email'               => $fromEmail,
            'smtp_from_name'                => trim((string) ($input['smtp_from_name'] ?? $d['smtp_from_name'])),
        ];

        return ['data' => $data, 'errors' => $errors];
    }

    /** @param array<string,mixed> $datos */
    public static function save(array $datos, ?int $userId = null): array
    {
        $normalized = self::normalizeInput($datos);
        if (!empty($normalized['errors'])) {
            return $normalized;
        }
        (new SystemConfig())->saveGroup(self::GRUPO, $normalized['data'], $userId);
        self::$cache = $normalized['data'];
        return ['data' => $normalized['data'], 'errors' => []];
    }

    public static function maybeSendEmail(string $eventKey, int $userId, string $subject, string $body): void
    {
        if (!self::emailEventEnabled($eventKey)) {
            return;
        }
        $user = (new User())->find($userId);
        $to = trim((string) ($user['correo'] ?? ''));
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return;
        }
        MailService::send($to, $subject, $body);
    }

    /** @return array<string,mixed> */
    public static function adminView(): array
    {
        $cfg = self::get();
        return [
            'config'   => $cfg,
            'servidor' => [
                'smtp_password_configured' => trim((string) Env::get('SMTP_PASSWORD', '')) !== '',
                'smtp_ready'               => self::smtpReady(),
                'email_effective'          => self::emailEnabled(),
            ],
        ];
    }
}
