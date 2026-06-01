<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Services\AuditService;
use App\Services\CalendarConfigService;
use App\Services\InstitutionalConfigService;
use App\Services\MailService;
use App\Services\ModulesConfigService;
use App\Services\NotificationConfigService;
use App\Services\SecurityConfigService;

final class SystemConfigController extends Controller
{
    public function institutionalPublic(): void
    {
        $this->success(InstitutionalConfigService::publicBranding());
    }

    public function institutionalShow(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $this->success(InstitutionalConfigService::adminView());
    }

    public function institutionalUpdate(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $user = $this->user();
        $result = InstitutionalConfigService::save($data, (int) ($user['id'] ?? 0));
        if (!empty($result['errors'])) {
            $this->error('Datos inválidos.', 422, $result['errors']);
        }
        AuditService::log('config_institucional_update', 'configuracion_sistema', 'institucional');
        $this->success(InstitutionalConfigService::adminView(), 'Información institucional guardada.');
    }

    public function securityShow(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $this->success(SecurityConfigService::publicView());
    }

    public function securityUpdate(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $user = $this->user();
        $saved = SecurityConfigService::save($data, (int) ($user['id'] ?? 0));
        AuditService::log('config_security_update', 'configuracion_sistema', 'seguridad', array_keys($saved));
        $this->success(SecurityConfigService::publicView(), 'Configuración de seguridad guardada.');
    }

    public function calendarShow(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $this->success(CalendarConfigService::adminView());
    }

    public function calendarUpdate(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $user = $this->user();
        $result = CalendarConfigService::save($data, (int) ($user['id'] ?? 0));
        if (!empty($result['errors'])) {
            $this->error('Datos inválidos.', 422, $result['errors']);
        }
        AuditService::log('config_calendario_update', 'configuracion_sistema', 'calendario');
        $this->success(CalendarConfigService::adminView(), 'Calendario institucional guardado.');
    }

    public function notificationsShow(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $this->success(NotificationConfigService::adminView());
    }

    public function notificationsUpdate(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $user = $this->user();
        $result = NotificationConfigService::save($data, (int) ($user['id'] ?? 0));
        if (!empty($result['errors'])) {
            $this->error('Datos inválidos.', 422, $result['errors']);
        }
        AuditService::log('config_notificaciones_update', 'configuracion_sistema', 'notificaciones');
        $this->success(NotificationConfigService::adminView(), 'Configuración de notificaciones guardada.');
    }

    public function notificationsTestEmail(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $to = trim((string) ($data['email'] ?? $this->user()['correo'] ?? ''));
        $result = MailService::sendTest($to);
        if (!$result['ok']) {
            $this->error($result['message'], 422);
        }
        $this->success($result, $result['message']);
    }

    public function modulesShow(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $this->success(ModulesConfigService::adminView());
    }

    public function modulesUpdate(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $user = $this->user();
        $result = ModulesConfigService::save($data, (int) ($user['id'] ?? 0));
        if (!empty($result['errors'])) {
            $this->error('Datos inválidos.', 422, $result['errors']);
        }
        AuditService::log('config_modulos_update', 'configuracion_sistema', 'modulos');
        $this->success($result['data'], 'Configuración de módulos guardada.');
    }
}
