<?php
/**
 * Recalcula fecha_limite_extendida de prórrogas aprobadas con el criterio corregido.
 * Ejecutar: php backend/scripts/recalc_prorroga_fechas.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../app/Helpers/Autoloader.php';
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\App;
use App\Config\Database;
use App\Services\CalendarConfigService;

App::boot(__DIR__ . '/../.env');

$db = Database::connection();
$stmt = $db->query(
    "SELECT pr.id_prorroga, pr.dias_solicitados, pr.dias_aprobados, pr.fecha_respuesta,
            pr.fecha_limite_extendida, pe.fecha_limite
     FROM periodo_prorrogas pr
     JOIN periodos pe ON pe.id_periodo = pr.id_periodo
     WHERE pr.estado = 'Aprobada' AND pr.fecha_respuesta IS NOT NULL"
);

$upd = $db->prepare('UPDATE periodo_prorrogas SET fecha_limite_extendida = :f WHERE id_prorroga = :id');
$fixed = 0;

foreach ($stmt->fetchAll() as $row) {
    $deadline = substr((string) $row['fecha_limite'], 0, 10);
    $respDate = substr((string) $row['fecha_respuesta'], 0, 10);
    $days = (int) ($row['dias_aprobados'] ?? $row['dias_solicitados'] ?? 0);
    if ($days <= 0 || $deadline === '') {
        continue;
    }
    $baseDate = ($respDate > $deadline) ? $respDate : $deadline;
    $newEnd = CalendarConfigService::addBusinessDays($baseDate, $days);
    $oldEnd = (string) ($row['fecha_limite_extendida'] ?? '');
    if ($newEnd !== $oldEnd) {
        $upd->execute([':f' => $newEnd, ':id' => (int) $row['id_prorroga']]);
        echo "Prórroga #{$row['id_prorroga']}: {$oldEnd} → {$newEnd}\n";
        $fixed++;
    }
}

echo $fixed > 0 ? "Listo: {$fixed} registro(s) actualizado(s).\n" : "Sin cambios necesarios.\n";
