<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middlewares\RoleMiddleware;
use App\Services\DashboardExportService;
use App\Services\DashboardProgressService;
use App\Services\PermissionService;

final class DashboardController extends Controller
{
    public function admin(): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $db = Database::connection();
        $scopeSql = '';
        $scopeParams = [];
        $this->appendCentroScope($scopeSql, $scopeParams, $user);

        $kpis = [
            'contratistas_activos' => (int) $this->scalar(
                $db,
                "SELECT COUNT(DISTINCT c.id_persona) FROM contratos c
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE c.estado='Activo'{$scopeSql}",
                $scopeParams
            ),
            'aprobadas' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Aprobada'{$scopeSql}",
                $scopeParams
            ),
            'pendiente_revision' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Pendiente revisión'{$scopeSql}",
                $scopeParams
            ),
            'rechazadas' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Rechazada'{$scopeSql}",
                $scopeParams
            ),
            'pendiente_entrega' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_asignadas a
                 JOIN periodos per ON per.id_periodo = a.id_periodo
                 JOIN contratos c ON c.id_contrato = per.id_contrato
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE NOT EXISTS (SELECT 1 FROM evidencias_uploads u WHERE u.id_asignacion = a.id_asignacion){$scopeSql}",
                $scopeParams
            ),
            'periodos_firmados' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM periodos per
                 JOIN contratos c ON c.id_contrato = per.id_contrato
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE per.estado='Firmado'{$scopeSql}",
                $scopeParams
            ),
            'pendiente_firma' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM pdfs_unificados pdf
                 JOIN periodos per ON per.id_periodo = pdf.id_periodo
                 JOIN contratos c ON c.id_contrato = per.id_contrato
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE pdf.estado='Enviado a administrativo'{$scopeSql}",
                $scopeParams
            ),
        ];

        $checklistSql = "
            SELECT CONCAT(p.nombres,' ',p.Apellidos) AS contratista, p.id_persona,
                   c.id_contrato, c.area_aplicacion,
                   per.id_periodo, per.nombre_periodo AS periodo,
                   m.codigo AS modulo, s.codigo AS subgrupo,
                   em.codigo AS evidencia_codigo, em.nombre AS evidencia,
                   COALESCE((SELECT u.estado FROM evidencias_uploads u
                               WHERE u.id_asignacion = a.id_asignacion
                               ORDER BY u.version DESC LIMIT 1), 'Pendiente entrega') AS estado,
                   (SELECT u.creado_en FROM evidencias_uploads u
                      WHERE u.id_asignacion = a.id_asignacion
                      ORDER BY u.version DESC LIMIT 1) AS fecha_carga
            FROM evidencias_asignadas a
            JOIN periodos per ON per.id_periodo = a.id_periodo
            JOIN contratos c  ON c.id_contrato = per.id_contrato
            JOIN personas p   ON p.id_persona = c.id_persona
            JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
            JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
            JOIN modulos m   ON m.id_modulo = s.id_modulo
            WHERE 1=1{$scopeSql}
            ORDER BY p.nombres, per.anio DESC, per.mes DESC, m.orden, s.orden, em.orden
            LIMIT 500";
        $stmt = $db->prepare($checklistSql);
        $stmt->execute($scopeParams);
        $checklist = $stmt->fetchAll();

        $this->success(['kpis' => $kpis, 'checklist' => $checklist]);
    }

    public function avanceRegionales(): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $data = DashboardProgressService::avancePorRegionalCentro();
        if (PermissionService::isCenterAdmin($user)) {
            $centroId = PermissionService::requireCentroId($user);
            $data = array_values(array_filter(array_map(function (array $reg) use ($centroId) {
                $centros = array_values(array_filter(
                    $reg['centros'],
                    fn($c) => (int) $c['id_centro'] === $centroId
                ));
                if ($centros === []) {
                    return null;
                }
                $reg['centros'] = $centros;
                $reg['total'] = array_sum(array_column($centros, 'total'));
                $reg['entregadas'] = array_sum(array_column($centros, 'entregadas'));
                $reg['aprobadas'] = array_sum(array_column($centros, 'aprobadas'));
                $reg['centros_count'] = count($centros);
                $reg['porcentaje'] = $reg['total'] > 0
                    ? (int) round(($reg['entregadas'] / $reg['total']) * 100)
                    : 0;
                $reg['porcentaje_aprobacion'] = $reg['total'] > 0
                    ? (int) round(($reg['aprobadas'] / $reg['total']) * 100)
                    : 0;
                return $reg;
            }, $data)));
        }
        $this->success($data);
    }

    public function contractor(): void
    {
        $user = $this->user();
        $db = Database::connection();
        $kpis = [];
        foreach (['Aprobada' => 'aprobadas', 'Pendiente revisión' => 'pendiente_revision', 'Rechazada' => 'rechazadas'] as $est => $key) {
            $s = $db->prepare("SELECT COUNT(*) FROM evidencias_uploads WHERE id_persona = :u AND estado = :e");
            $s->execute([':u' => $user['id'], ':e' => $est]);
            $kpis[$key] = (int) $s->fetchColumn();
        }
        $s = $db->prepare(
            "SELECT COUNT(*) FROM evidencias_asignadas a
             JOIN periodos pe ON pe.id_periodo = a.id_periodo
             JOIN contratos c ON c.id_contrato = pe.id_contrato
             WHERE c.id_persona = :u
               AND NOT EXISTS (SELECT 1 FROM evidencias_uploads u WHERE u.id_asignacion = a.id_asignacion)"
        );
        $s->execute([':u' => $user['id']]);
        $kpis['pendiente_entrega'] = (int) $s->fetchColumn();

        $this->success(['kpis' => $kpis]);
    }

    public function superAdmin(): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $db = Database::connection();
        $kpis = [
            'usuarios'    => (int) $db->query("SELECT COUNT(*) FROM personas")->fetchColumn(),
            'contratos'   => (int) $db->query("SELECT COUNT(*) FROM contratos WHERE estado='Activo'")->fetchColumn(),
            'periodos'    => (int) $db->query("SELECT COUNT(*) FROM periodos")->fetchColumn(),
            'subgrupos'   => (int) $db->query("SELECT COUNT(*) FROM subgrupos")->fetchColumn(),
            'evidencias'  => (int) $db->query("SELECT COUNT(*) FROM evidencias_master")->fetchColumn(),
            'pdfs_firmados' => (int) $db->query("SELECT COUNT(*) FROM pdfs_unificados WHERE estado='Finalizado'")->fetchColumn(),
        ];
        $logs = (new \App\Models\AuditLog())->recent(20);
        $this->success(['kpis' => $kpis, 'recent' => $logs]);
    }

    public function exportExcel(): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $db = Database::connection();
        $scopeSql = '';
        $scopeParams = [];
        $this->appendCentroScope($scopeSql, $scopeParams, $user);

        $kpis = [
            'contratistas_activos' => (int) $this->scalar(
                $db,
                "SELECT COUNT(DISTINCT c.id_persona) FROM contratos c
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE c.estado='Activo'{$scopeSql}",
                $scopeParams
            ),
            'aprobadas' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Aprobada'{$scopeSql}",
                $scopeParams
            ),
            'pendiente_revision' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Pendiente revisión'{$scopeSql}",
                $scopeParams
            ),
            'rechazadas' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_uploads u
                 JOIN personas p ON p.id_persona = u.id_persona
                 WHERE u.estado='Rechazada'{$scopeSql}",
                $scopeParams
            ),
            'pendiente_entrega' => (int) $this->scalar(
                $db,
                "SELECT COUNT(*) FROM evidencias_asignadas a
                 JOIN periodos per ON per.id_periodo = a.id_periodo
                 JOIN contratos c ON c.id_contrato = per.id_contrato
                 JOIN personas p ON p.id_persona = c.id_persona
                 WHERE NOT EXISTS (SELECT 1 FROM evidencias_uploads u WHERE u.id_asignacion = a.id_asignacion){$scopeSql}",
                $scopeParams
            ),
        ];

        $sql = "
            SELECT per.nombre_periodo, CONCAT(p.nombres,' ',p.Apellidos) AS contratista,
                   c.id_contrato, m.codigo AS modulo, s.nombre AS subgrupo,
                   em.nombre AS evidencia,
                   COALESCE((SELECT u.estado FROM evidencias_uploads u WHERE u.id_asignacion = a.id_asignacion ORDER BY u.version DESC LIMIT 1), 'Pendiente entrega') AS estado,
                   (SELECT u.creado_en FROM evidencias_uploads u WHERE u.id_asignacion = a.id_asignacion ORDER BY u.version DESC LIMIT 1) AS fecha_carga,
                   (SELECT r.creado_en FROM evidencias_uploads u JOIN revisiones r ON r.id_upload = u.id_upload WHERE u.id_asignacion = a.id_asignacion ORDER BY r.id_revision DESC LIMIT 1) AS fecha_revision,
                   (SELECT r.comentario FROM evidencias_uploads u JOIN revisiones r ON r.id_upload = u.id_upload WHERE u.id_asignacion = a.id_asignacion ORDER BY r.id_revision DESC LIMIT 1) AS observaciones
            FROM evidencias_asignadas a
            JOIN periodos per ON per.id_periodo = a.id_periodo
            JOIN contratos c  ON c.id_contrato = per.id_contrato
            JOIN personas p   ON p.id_persona = c.id_persona
            JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
            JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
            JOIN modulos m   ON m.id_modulo = s.id_modulo
            WHERE 1=1{$scopeSql}
            ORDER BY per.anio DESC, per.mes DESC, p.nombres, m.orden, s.orden, em.orden";
        $stmt = $db->prepare($sql);
        $stmt->execute($scopeParams);
        $rows = $stmt->fetchAll();

        DashboardExportService::download($rows, $kpis, $user);
    }

    /** @param array<string,mixed> $params */
    private function appendCentroScope(string &$sql, array &$params, array $user): void
    {
        PermissionService::appendPersonCentroScope($sql, $params, 'p', $user);
    }

    /** @param array<string,mixed> $params */
    private function scalar(\PDO $db, string $sql, array $params): mixed
    {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchColumn();
    }
}
