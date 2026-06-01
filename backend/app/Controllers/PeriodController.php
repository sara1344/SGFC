<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Middlewares\RlsMiddleware;
use App\Models\Period;
use App\Models\EvidenceAssignment;
use App\Models\UnifiedPdf;
use App\Services\AuditService;
use App\Services\CalendarConfigService;
use App\Services\NotificationService;

final class PeriodController extends Controller
{
    public function index(): void
    {
        $idContrato = (int) ($_GET['contrato'] ?? 0);
        if ($idContrato <= 0) {
            $this->error('Falta parámetro ?contrato=ID.', 400);
        }
        RlsMiddleware::ownsContract($idContrato);
        $rows = (new Period())->listByContract($idContrato);
        $this->success($rows);
    }

    public function show(int $id): void
    {
        RlsMiddleware::ownsPeriod($id);
        $p = (new Period())->find($id);
        if (!$p) { $this->error('Periodo no encontrado.', 404); }
        $assign = (new EvidenceAssignment())->listForPeriod($id);
        $periodModel = new Period();
        $locked = $periodModel->isAssignmentLocked($id);
        $editWindow = $periodModel->getEvidenceEditWindow($id);
        $hasAssignment = count($assign) > 0 || $periodModel->hasEvidenceAssignment($id);
        $pdfUnified = null;
        $zipGc = null;
        $db = \App\Config\Database::connection();
        $ownerStmt = $db->prepare(
            'SELECT c.id_persona FROM periodos pe
             JOIN contratos c ON c.id_contrato = pe.id_contrato
             WHERE pe.id_periodo = :p LIMIT 1'
        );
        $ownerStmt->execute([':p' => $id]);
        $ownerId = (int) ($ownerStmt->fetchColumn() ?: 0);
        if ($ownerId > 0) {
            $existingGf = (new UnifiedPdf())->findForPeriod($id, $ownerId, 'GF');
            if ($existingGf && !empty($existingGf['ruta_unificado'])) {
                $pdfUnified = [
                    'id_pdf'         => (int) $existingGf['id_pdf'],
                    'estado'         => $existingGf['estado'],
                    'fecha_generado' => $existingGf['fecha_generado'],
                    'modulo_codigo'  => 'GF',
                ];
            }
            $existingGc = (new UnifiedPdf())->findForPeriod($id, $ownerId, 'GC');
            if ($existingGc && !empty($existingGc['ruta_unificado'])) {
                $zipGc = [
                    'id_pdf'         => (int) $existingGc['id_pdf'],
                    'estado'         => $existingGc['estado'],
                    'fecha_generado' => $existingGc['fecha_generado'],
                    'modulo_codigo'  => 'GC',
                ];
            }
        }
        $zipGc = $zipGc ?? null;
        $this->success([
            'periodo'               => $p,
            'evidencias'            => $assign,
            'pdf_unificado'         => $pdfUnified,
            'zip_gc'                => $zipGc,
            'evidencias_bloqueadas' => $locked,
            'tiene_asignacion'      => $hasAssignment,
            'puede_editar_evidencias'=> !$locked && $editWindow['activa'],
            'ventana_edicion'       => $editWindow,
        ]);
    }

    public function update(int $id): void
    {
        RoleMiddleware::requireStaff();
        RlsMiddleware::ownsPeriod($id);
        $data = $this->input();
        $m = new Period();
        $cur = $m->find($id);
        if (!$cur) { $this->error('Periodo no encontrado.', 404); }
        if ($m->isAssignmentLocked($id)) {
            $this->error('Este periodo ya fue firmado por ambas partes. La configuración no puede modificarse.', 403);
        }
        $patch = array_intersect_key($data, array_flip(['fecha_apertura','fecha_limite','estado','observacion','avance']));
        if (!empty($patch['fecha_limite'])) {
            $fechaLim = trim((string) $patch['fecha_limite']);
            if ($fechaLim !== '' && !CalendarConfigService::isAllowedDeadlineDate($fechaLim)) {
                $this->error(CalendarConfigService::deadlineErrorMessage($fechaLim), 422);
            }
        }
        $m->update($id, $patch);
        AuditService::log('period_update', 'periodos', $id);
        $this->success(null, 'Periodo actualizado.');
    }

    public function assignEvidences(int $idPeriodo): void
    {
        RoleMiddleware::requireStaff();
        RlsMiddleware::ownsPeriod($idPeriodo);
        if ((new Period())->isAssignmentLocked($idPeriodo)) {
            $this->error('Este periodo ya fue firmado por ambas partes. Las evidencias no pueden modificarse.', 403);
        }
        $periodModel = new Period();
        if ($periodModel->hasEvidenceAssignment($idPeriodo) && !$periodModel->isWithinEvidenceEditWindow($idPeriodo)) {
            $win = $periodModel->getEvidenceEditWindow($idPeriodo);
            if ($win['sin_fecha_limite']) {
                $this->error('Defina una fecha límite antes de modificar las evidencias asignadas.', 422);
            }
            $this->error(
                'Solo puede modificar las evidencias hasta 5 días antes de la fecha límite de entrega.',
                403
            );
        }
        $data = $this->input();
        $ids = $data['evidencias'] ?? [];
        if (!is_array($ids)) { $this->error('evidencias debe ser un arreglo.', 422); }

        $db = \App\Config\Database::connection();
        $db->beginTransaction();
        try {
            $db->prepare("DELETE FROM evidencias_asignadas WHERE id_periodo = :p")
               ->execute([':p' => $idPeriodo]);
            $ins = $db->prepare("INSERT INTO evidencias_asignadas (id_periodo, id_evidencia_master, obligatoria, orden)
                                 SELECT :p, em.id_evidencia_master, em.obligatoria, em.orden
                                 FROM evidencias_master em WHERE em.id_evidencia_master = :e");
            foreach ($ids as $eid) {
                $ins->execute([':p' => $idPeriodo, ':e' => (int) $eid]);
            }
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            \App\Config\App::logError('PERIOD_ASSIGN_FAILED', $e->getMessage());
            $this->error('No se pudieron asignar las evidencias.', 500);
        }
        AuditService::log('period_assign', 'periodos', $idPeriodo, ['count' => count($ids)]);
        NotificationService::notifyContractorEvidenceAssignment($idPeriodo, count($ids));
        $this->success(null, 'Evidencias asignadas al periodo.');
    }
}
