<?php
namespace App\Services;

use App\Config\App;
use App\Config\Database;
use App\Models\EvidenceAssignment;
use App\Models\Period;
use App\Models\PeriodExtension;
use App\Models\User;
use App\Services\PermissionService;

final class PeriodExtensionService
{
    public const ALLOWED_DAYS = [5, 15, 20];

    /** @return array<string,mixed> */
    public static function getUploadWindow(int $periodId): array
    {
        $period = (new Period())->find($periodId);
        if (!$period) {
            return self::windowPayload(false, 'Periodo no encontrado.', null, null, null);
        }

        $deadline = trim((string) ($period['fecha_limite'] ?? ''));
        $today = (new \DateTimeImmutable('today'))->format('Y-m-d');
        $extension = self::activeApprovedExtension($periodId, $today);
        $pending = (new PeriodExtension())->pendingForPeriod($periodId);
        $latest = (new PeriodExtension())->latestForPeriod($periodId);

        $effectiveDeadline = $deadline;
        if ($extension && !empty($extension['fecha_limite_extendida'])) {
            $effectiveDeadline = (string) $extension['fecha_limite_extendida'];
        }

        $hasPendingDeliveries = self::hasPendingDeliveries($periodId);
        $deadlinePassed = $deadline !== '' && $today > $deadline;
        $withinExtension = $extension !== null && $today <= (string) $extension['fecha_limite_extendida'];
        $withinNormal = $deadline === '' || $today <= $deadline;

        $puedeSubir = $withinNormal || $withinExtension;

        $motivo = 'activa';
        $mensaje = '';
        if (!$puedeSubir) {
            if ($pending) {
                $motivo = 'prorroga_pendiente';
                $mensaje = 'Tiene una solicitud de prórroga en revisión. Espere la respuesta del administrativo.';
            } elseif ($latest && ($latest['estado'] ?? '') === 'Rechazada' && $hasPendingDeliveries) {
                $motivo = 'plazo_vencido';
                $mensaje = 'El plazo de entrega venció. Puede solicitar una nueva prórroga si aún tiene evidencias pendientes.';
            } else {
                $motivo = 'plazo_vencido';
                $mensaje = 'El plazo de entrega venció. Solicite una prórroga para continuar subiendo evidencias.';
            }
        } elseif ($withinExtension) {
            $motivo = 'prorroga_activa';
            $mensaje = 'Prórroga aprobada. Puede subir evidencias hasta el ' . self::fmtDate($effectiveDeadline) . ' (días hábiles).';
        } elseif ($latest && ($latest['estado'] ?? '') === 'Aprobada' && !empty($latest['fecha_limite_extendida'])
            && $today > (string) $latest['fecha_limite_extendida']) {
            $motivo = 'prorroga_vencida';
            $mensaje = 'Su prórroga aprobada venció el ' . self::fmtDate((string) $latest['fecha_limite_extendida'])
                . '. Puede solicitar una nueva prórroga si aún tiene evidencias pendientes.';
        }

        $puedeSolicitar = $deadlinePassed
            && $hasPendingDeliveries
            && $pending === null
            && !$withinExtension;

        return self::windowPayload(
            $puedeSubir,
            $mensaje,
            $deadline !== '' ? $deadline : null,
            $effectiveDeadline !== '' ? $effectiveDeadline : null,
            [
                'motivo'                  => $motivo,
                'puede_solicitar_prorroga' => $puedeSolicitar,
                'tiene_pendientes_entrega' => $hasPendingDeliveries,
                'fecha_limite_vencida'    => $deadlinePassed,
                'ultima_prorroga'         => $latest ? self::publicExtensionRow($latest) : null,
                'prorroga_pendiente'      => $pending ? self::publicExtensionRow($pending) : null,
                'prorroga_activa'         => $extension ? self::publicExtensionRow($extension) : null,
            ]
        );
    }

    public static function assertCanUpload(int $periodId): void
    {
        $win = self::getUploadWindow($periodId);
        if (empty($win['puede_subir'])) {
            App::error((string) ($win['mensaje'] ?: 'El plazo de entrega está cerrado.'), 403);
        }
    }

    public static function hasPendingDeliveries(int $periodId): bool
    {
        $rows = (new EvidenceAssignment())->listForPeriod($periodId);
        foreach ($rows as $row) {
            $est = trim((string) ($row['ultimo_estado'] ?? ''));
            if ($est === '' || $est === 'Pendiente entrega') {
                return true;
            }
            if ((int) ($row['requiere_firma'] ?? 0) === 1
                && $est !== 'Aprobada'
                && (int) ($row['firmado_contratista'] ?? 0) !== 1
                && !empty($row['ultimo_upload_id'])) {
                return true;
            }
        }
        return false;
    }

    /** @param array<string,mixed> $data */
    public static function request(int $periodId, int $contractorId, array $data): array
    {
        self::assertContractorOwnsPeriod($periodId, $contractorId);

        $win = self::getUploadWindow($periodId);
        if (empty($win['puede_solicitar_prorroga'])) {
            App::error('No puede solicitar prórroga en este momento.', 422);
        }

        $days = (int) ($data['dias'] ?? 0);
        if (!in_array($days, self::ALLOWED_DAYS, true)) {
            App::error('Seleccione 5, 15 o 20 días de prórroga.', 422);
        }

        $justification = trim((string) ($data['justificacion'] ?? ''));
        if (mb_strlen($justification) < 15) {
            App::error('La justificación debe tener al menos 15 caracteres.', 422);
        }
        if (mb_strlen($justification) > 2000) {
            App::error('La justificación es demasiado larga.', 422);
        }

        $model = new PeriodExtension();
        $id = $model->insert([
            'id_periodo'       => $periodId,
            'id_contratista'   => $contractorId,
            'dias_solicitados' => $days,
            'justificacion'    => $justification,
            'estado'           => 'Pendiente',
            'fecha_solicitud'  => date('Y-m-d H:i:s'),
        ]);

        $period = (new Period())->find($periodId);
        $user = (new User())->find($contractorId);
        $name = trim((string) (($user['nombres'] ?? '') . ' ' . ($user['Apellidos'] ?? '')));
        if ($name === '') {
            $name = 'Contratista';
        }
        $periodName = trim((string) ($period['nombre_periodo'] ?? 'el periodo'));

        $msg = "Periodo: {$periodName}. Solicita {$days} días hábiles.\n\nJustificación: {$justification}";

        NotificationService::notifyAdminsContractorActivity(
            $contractorId,
            $name,
            'Solicitud de prórroga',
            'Solicitud de prórroga',
            $msg,
            '/views/administrativo-notificaciones.html?prorroga=' . $id,
            'admin_prorroga'
        );

        AuditService::log('period_extension_request', 'periodo_prorrogas', $id, [
            'id_periodo' => $periodId,
            'dias'       => $days,
        ]);

        $row = $model->find($id);
        return self::publicExtensionRow($row ?: []);
    }

    /** @param array<string,mixed> $admin @param array<string,mixed> $data */
    public static function approve(int $id, array $admin, array $data = []): array
    {
        self::assertStaffCanRespond($id, $admin);
        $adminId = (int) ($admin['id'] ?? 0);
        $row = (new PeriodExtension())->detail($id);
        if (!$row || ($row['estado'] ?? '') !== 'Pendiente') {
            App::error('La solicitud no está pendiente.', 422);
        }

        $deadline = trim((string) ($row['periodo_fecha_limite'] ?? ''));
        if ($deadline === '') {
            App::error('El periodo no tiene fecha límite definida.', 422);
        }

        $daysRequested = (int) ($row['dias_solicitados'] ?? 0);
        $daysApproved = (int) ($data['dias_aprobados'] ?? $daysRequested);
        if (!in_array($daysApproved, self::ALLOWED_DAYS, true)) {
            App::error('Los días aprobados deben ser 5, 15 o 20.', 422);
        }

        $changeReason = trim((string) ($data['motivo_cambio_dias'] ?? ''));
        if ($daysApproved !== $daysRequested) {
            if (mb_strlen($changeReason) < 5) {
                App::error('Indique por qué otorga un plazo diferente al solicitado por el contratista.', 422);
            }
        }

        $today = (new \DateTimeImmutable('today'))->format('Y-m-d');
        // Si el plazo original ya venció, los días hábiles cuentan desde la fecha de aprobación.
        $baseDate = ($today > $deadline) ? $today : $deadline;
        $extendedUntil = CalendarConfigService::addBusinessDays($baseDate, $daysApproved);
        $obs = trim((string) ($data['observacion'] ?? ''));

        (new PeriodExtension())->update($id, [
            'estado'                   => 'Aprobada',
            'dias_aprobados'           => $daysApproved,
            'motivo_cambio_dias'       => $daysApproved !== $daysRequested ? $changeReason : null,
            'fecha_limite_extendida'   => $extendedUntil,
            'id_responde'              => $adminId,
            'fecha_respuesta'          => date('Y-m-d H:i:s'),
            'observacion_admin'        => $obs !== '' ? $obs : null,
        ]);

        $contractorId = (int) $row['id_contratista'];
        $periodName = trim((string) ($row['nombre_periodo'] ?? 'el periodo'));
        $msg = "Su prórroga para {$periodName} fue aprobada por {$daysApproved} días hábiles. Puede subir evidencias hasta el "
            . self::fmtDate($extendedUntil) . '.';
        if ($daysApproved !== $daysRequested) {
            $msg .= "\n\nSolicitó {$daysRequested} días; se otorgaron {$daysApproved}. Motivo: {$changeReason}";
        }
        if ($obs !== '') {
            $msg .= "\n\nObservación: {$obs}";
        }

        $periodId = (int) ($row['id_periodo'] ?? 0);
        NotificationService::create(
            $contractorId,
            'Prórroga aprobada',
            'Prórroga aprobada',
            $msg,
            '/views/contratista-cargar-evidencias.html?periodo=' . $periodId,
            'contractor_prorroga'
        );

        AuditService::log('period_extension_approve', 'periodo_prorrogas', $id);

        $updated = (new PeriodExtension())->detail($id);
        return self::publicExtensionRow($updated ?: []);
    }

    /** @param array<string,mixed> $admin */
    public static function reject(int $id, array $admin, ?string $observation = null): array
    {
        self::assertStaffCanRespond($id, $admin);
        $adminId = (int) ($admin['id'] ?? 0);
        $row = (new PeriodExtension())->detail($id);
        if (!$row || ($row['estado'] ?? '') !== 'Pendiente') {
            App::error('La solicitud no está pendiente.', 422);
        }

        $obs = trim((string) ($observation ?? ''));
        if ($obs === '') {
            App::error('Indique el motivo del rechazo.', 422);
        }

        (new PeriodExtension())->update($id, [
            'estado'            => 'Rechazada',
            'id_responde'       => $adminId,
            'fecha_respuesta'   => date('Y-m-d H:i:s'),
            'observacion_admin' => $obs,
        ]);

        $contractorId = (int) $row['id_contratista'];
        $periodName = trim((string) ($row['nombre_periodo'] ?? 'el periodo'));
        $days = (int) ($row['dias_solicitados'] ?? 0);

        $periodId = (int) ($row['id_periodo'] ?? 0);
        NotificationService::create(
            $contractorId,
            'Prórroga rechazada',
            'Prórroga rechazada',
            "Su solicitud de {$days} días hábiles para {$periodName} fue rechazada.\n\nMotivo: {$obs}",
            '/views/contratista-cargar-evidencias.html?periodo=' . $periodId,
            'contractor_prorroga'
        );

        AuditService::log('period_extension_reject', 'periodo_prorrogas', $id);

        $updated = (new PeriodExtension())->detail($id);
        return self::publicExtensionRow($updated ?: []);
    }

    /** @param array<string,mixed> $user @return array<string,mixed>|null */
    public static function detailForUser(int $id, array $user): ?array
    {
        $row = (new PeriodExtension())->detail($id);
        if (!$row) {
            return null;
        }

        $userId = (int) ($user['id'] ?? 0);

        if (PermissionService::isContractor($user)) {
            if ((int) $row['id_contratista'] !== $userId) {
                return null;
            }
            return self::publicExtensionRow($row, true);
        }

        if (!PermissionService::isStaff($user)) {
            return null;
        }

        if (PermissionService::isCenterAdmin($user)) {
            $centroContractor = PermissionService::personCentroId((int) $row['id_contratista']);
            $centroAdmin = PermissionService::userCentroId($user);
            if ($centroContractor !== null && $centroAdmin !== $centroContractor) {
                return null;
            }
        }

        return self::publicExtensionRow($row, true);
    }

    private static function activeApprovedExtension(int $periodId, string $today): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT * FROM periodo_prorrogas
             WHERE id_periodo = :p AND estado = 'Aprobada'
               AND fecha_limite_extendida IS NOT NULL
               AND fecha_limite_extendida >= :hoy
             ORDER BY fecha_respuesta DESC, id_prorroga DESC LIMIT 1"
        );
        $stmt->execute([':p' => $periodId, ':hoy' => $today]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    private static function assertContractorOwnsPeriod(int $periodId, int $contractorId): void
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT c.id_persona FROM periodos pe
             JOIN contratos c ON c.id_contrato = pe.id_contrato
             WHERE pe.id_periodo = :p LIMIT 1'
        );
        $stmt->execute([':p' => $periodId]);
        $owner = (int) ($stmt->fetchColumn() ?: 0);
        if ($owner !== $contractorId) {
            App::error('Este periodo no le pertenece.', 403);
        }
    }

    /** @param array<string,mixed> $admin */
    private static function assertStaffCanRespond(int $prorrogaId, array $admin): void
    {
        $row = (new PeriodExtension())->detail($prorrogaId);
        if (!$row) {
            App::error('Solicitud no encontrada.', 404);
        }

        if (!PermissionService::isStaff($admin)) {
            App::error('No autorizado.', 403);
        }

        if (PermissionService::isCenterAdmin($admin)) {
            $centroContractor = PermissionService::personCentroId((int) $row['id_contratista']);
            $centroAdmin = PermissionService::userCentroId($admin);
            if ($centroContractor !== null && $centroAdmin !== $centroContractor) {
                App::error('Esta solicitud no pertenece a su centro.', 403);
            }
        }
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private static function publicExtensionRow(array $row, bool $full = false): array
    {
        $out = [
            'id_prorroga'              => (int) ($row['id_prorroga'] ?? 0),
            'id_periodo'               => (int) ($row['id_periodo'] ?? 0),
            'dias_solicitados'         => (int) ($row['dias_solicitados'] ?? 0),
            'dias_aprobados'           => isset($row['dias_aprobados']) ? (int) $row['dias_aprobados'] : null,
            'motivo_cambio_dias'       => $row['motivo_cambio_dias'] ?? null,
            'estado'                   => (string) ($row['estado'] ?? ''),
            'fecha_solicitud'          => $row['fecha_solicitud'] ?? null,
            'fecha_limite_extendida'   => $row['fecha_limite_extendida'] ?? null,
            'fecha_respuesta'          => $row['fecha_respuesta'] ?? null,
        ];

        if ($full) {
            $out['justificacion']     = (string) ($row['justificacion'] ?? '');
            $out['observacion_admin'] = $row['observacion_admin'] ?? null;
            $out['nombre_periodo']    = $row['nombre_periodo'] ?? null;
            $out['periodo_fecha_limite'] = $row['periodo_fecha_limite'] ?? null;
            $out['contratista_nombre'] = $row['contratista_nombre'] ?? null;
            $out['admin_nombre']      = $row['admin_nombre'] ?? null;
        }

        return $out;
    }

    /** @param array<string,mixed>|null $extra */
    private static function windowPayload(
        bool $canUpload,
        string $message,
        ?string $deadline,
        ?string $effectiveDeadline,
        ?array $extra
    ): array {
        return array_merge([
            'puede_subir'            => $canUpload,
            'mensaje'                => $message,
            'fecha_limite'           => $deadline,
            'fecha_limite_efectiva'  => $effectiveDeadline,
        ], $extra ?? []);
    }

    private static function fmtDate(string $ymd): string
    {
        try {
            $dt = new \DateTimeImmutable($ymd);
            $months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return $dt->format('j') . ' ' . ($months[(int) $dt->format('n')] ?? $dt->format('M')) . ' ' . $dt->format('Y');
        } catch (\Throwable) {
            return $ymd;
        }
    }
}
