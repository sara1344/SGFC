<?php
namespace App\Services;

use App\Config\Database;
use App\Models\Notification;
use App\Models\NotificationDetail;

/**
 * Helper para crear notificaciones desde cualquier controlador / service.
 */
final class NotificationService
{
    public static function create(
        int $userId,
        string $tipo,
        string $titulo,
        string $mensaje = '',
        ?string $link = null,
        ?string $eventKey = null
    ): int {
        $key = $eventKey ?? self::inferContractorEventKey($tipo);
        if ($key && !NotificationConfigService::inAppEnabled($key)) {
            return 0;
        }

        $id = (new Notification())->insert([
            'id_persona' => $userId,
            'tipo'       => $tipo,
            'titulo'     => $titulo,
            'mensaje'    => $mensaje,
            'link'       => $link,
            'leida'      => 0,
        ]);

        if ($key) {
            NotificationConfigService::maybeSendEmail($key, $userId, $titulo, $mensaje !== '' ? $mensaje : $titulo);
        }

        return $id;
    }

    public static function notifyAdmins(string $tipo, string $titulo, string $mensaje = '', ?string $link = null): void
    {
        foreach (self::adminIds() as $id) {
            self::create((int) $id, $tipo, $titulo, $mensaje, $link, 'admin_evidencia_subida');
        }
    }

    /**
     * Agrupa en una sola notificación por contratista (mientras esté sin leer)
     * las novedades dirigidas a administrativos.
     */
    public static function notifyAdminsContractorActivity(
        int $contractorId,
        string $contractorName,
        string $tipo,
        string $titulo,
        string $mensaje = '',
        ?string $link = null,
        string $eventKey = 'admin_evidencia_subida'
    ): void {
        if (!NotificationConfigService::inAppEnabled($eventKey)) {
            return;
        }

        $notifModel = new Notification();
        $detailModel = new NotificationDetail();

        foreach (self::adminIdsForContractor($contractorId) as $adminId) {
            $adminId = (int) $adminId;
            $group = $notifModel->findOpenContractorGroup($adminId, $contractorId);

            if (!$group) {
                $groupId = $notifModel->insert([
                    'id_persona'        => $adminId,
                    'id_contratista'    => $contractorId,
                    'cantidad_detalles' => 0,
                    'tipo'              => 'Actualización contratista',
                    'titulo'            => trim($contractorName) . ' realizó actualizaciones',
                    'mensaje'           => 'Nuevas actualizaciones pendientes de revisar.',
                    'leida'             => 0,
                ]);
            } else {
                $groupId = (int) $group['id_notificacion'];
            }

            $detailModel->insert([
                'id_notificacion' => $groupId,
                'tipo'            => $tipo,
                'titulo'          => $titulo,
                'mensaje'         => $mensaje,
                'link'            => $link,
            ]);

            $count = count($detailModel->forNotification($groupId));
            $notifModel->update($groupId, [
                'cantidad_detalles' => $count,
                'mensaje'           => self::summaryMessage($count),
                'fecha_creacion'    => date('Y-m-d H:i:s'),
                'leida'             => 0,
            ]);

            if (NotificationConfigService::emailEventEnabled($eventKey)) {
                $admin = (new \App\Models\User())->find($adminId);
                $to = trim((string) ($admin['correo'] ?? ''));
                if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
                    MailService::send($to, $titulo, trim($contractorName . "\n\n" . ($mensaje ?: $titulo)));
                }
            }
        }
    }

    private static function adminIdsForContractor(int $contractorId): array
    {
        $db = Database::connection();
        $stmt = $db->query("SELECT p.id_persona FROM personas p
                            JOIN perfil pe ON pe.id_Perfil = p.id_perfil
                            WHERE pe.nombre_perfil IN ('administrador')
                              AND COALESCE(p.activo, 1) = 1");
        $ids = array_map('intval', array_column($stmt->fetchAll(), 'id_persona'));

        $centroId = PermissionService::personCentroId($contractorId);
        if ($centroId !== null) {
            $stmt2 = $db->prepare("SELECT p.id_persona FROM personas p
                                   JOIN perfil pe ON pe.id_Perfil = p.id_perfil
                                     AND pe.nombre_perfil = 'administrativo_centro'
                                   WHERE COALESCE(p.activo, 1) = 1
                                     AND p.id_centro = :cen");
            $stmt2->execute([':cen' => $centroId]);
            foreach ($stmt2->fetchAll() as $row) {
                $ids[] = (int) $row['id_persona'];
            }
        }

        return array_values(array_unique($ids));
    }

    private static function adminIds(): array
    {
        $db = Database::connection();
        $stmt = $db->query("SELECT p.id_persona FROM personas p
                            JOIN perfil pe ON pe.id_Perfil = p.id_perfil
                            WHERE pe.nombre_perfil IN ('administrador')
                              AND COALESCE(p.activo, 1) = 1");
        return array_column($stmt->fetchAll(), 'id_persona');
    }

    private static function summaryMessage(int $count): string
    {
        if ($count <= 1) {
            return '1 actualización pendiente de revisar.';
        }
        return $count . ' actualizaciones pendientes de revisar.';
    }

    /** Notifica al contratista cuando se asignan evidencias a un periodo. */
    public static function notifyContractorEvidenceAssignment(int $periodId, int $count): void
    {
        if ($count <= 0) {
            return;
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT p.nombre_periodo, c.id_persona
             FROM periodos p
             JOIN contratos c ON c.id_contrato = p.id_contrato
             WHERE p.id_periodo = :id LIMIT 1'
        );
        $stmt->execute([':id' => $periodId]);
        $row = $stmt->fetch();
        if (!$row) {
            return;
        }

        $contractorId = (int) $row['id_persona'];
        if ($contractorId <= 0) {
            return;
        }

        $periodName = trim((string) ($row['nombre_periodo'] ?? 'el periodo'));
        $evWord = $count === 1 ? 'evidencia' : 'evidencias';
        $asignadas = $count === 1 ? 'asignó' : 'asignaron';
        $titulo = 'Evidencias asignadas';
        $mensaje = "Se le {$asignadas} {$count} {$evWord} para el periodo {$periodName}.";

        self::create(
            $contractorId,
            'Evidencias asignadas',
            $titulo,
            $mensaje,
            '/views/contratista-cargar-evidencias.html',
            'contractor_evidencias_asignadas'
        );
    }

    private static function inferContractorEventKey(string $tipo): ?string
    {
        $t = mb_strtolower($tipo);
        if (str_contains($t, 'rechaz')) {
            return 'contractor_rechazada';
        }
        if (str_contains($t, 'aprob')) {
            return 'contractor_aprobada';
        }
        if (str_contains($t, 'pdf') || str_contains($t, 'firm')) {
            return 'contractor_pdf_firmado';
        }
        return null;
    }
}

