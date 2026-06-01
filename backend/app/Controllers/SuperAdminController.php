<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Models\AuditLog;

/**
 * Endpoints exclusivos del Super Admin.
 * El CRUD principal está repartido en UserController/ContractController/etc.
 * Aquí están solo las acciones globales.
 */
final class SuperAdminController extends Controller
{
    public function audit(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $limit = min(500, max(1, (int) ($_GET['limit'] ?? 100)));
        $filters = [
            'fecha'  => trim((string) ($_GET['fecha'] ?? '')),
            'accion' => trim((string) ($_GET['accion'] ?? '')),
            'nombre' => trim((string) ($_GET['nombre'] ?? $_GET['nombr'] ?? '')),
        ];
        $this->success((new AuditLog())->listFiltered($filters, $limit));
    }

    public function auditMeta(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $model = new AuditLog();
        $this->success([
            'acciones' => $model->distinctAcciones(),
            'resumen'  => $model->summary(),
        ]);
    }

    public function auditExport(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $filters = [
            'fecha'  => trim((string) ($_GET['fecha'] ?? '')),
            'accion' => trim((string) ($_GET['accion'] ?? '')),
            'nombre' => trim((string) ($_GET['nombre'] ?? $_GET['nombr'] ?? '')),
        ];
        $rows = (new AuditLog())->listForExport($filters, 5000);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="SGFC_auditoria_' . date('Ymd_His') . '.csv"');
        echo "\xEF\xBB\xBF";
        $f = fopen('php://output', 'w');
        fputcsv($f, ['Fecha', 'Usuario', 'Persona', 'Rol', 'Acción', 'Entidad', 'ID entidad', 'IP'], ';');
        foreach ($rows as $r) {
            fputcsv($f, [
                $r['creado_en'] ?? '',
                $r['usuario'] ?? '',
                $r['persona'] ?? '',
                $r['rol'] ?? '',
                $r['accion'] ?? '',
                $r['entidad'] ?? '',
                $r['entidad_id'] ?? '',
                $r['ip'] ?? '',
            ], ';');
        }
        fclose($f);
        exit;
    }
}
