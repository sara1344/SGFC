<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Models\EvidenceUpload;
use App\Models\Review;
use App\Models\Period;
use App\Services\AuditService;
use App\Services\ModulesConfigService;
use App\Services\NotificationService;
use App\Services\PermissionService;
use App\Middlewares\RlsMiddleware;

final class ReviewController extends Controller
{
    public function index(): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $idCentro = PermissionService::isCenterAdmin($user)
            ? PermissionService::requireCentroId($user)
            : null;

        if (!empty($_GET['counts'])) {
            $this->success((new EvidenceUpload())->revisionTabCounts($idCentro));
            return;
        }

        $estado = $_GET['estado'] ?? 'Pendiente revisión';
        $rows = (new EvidenceUpload())->listByEstado(
            $estado,
            isset($_GET['contrato'])    ? (int) $_GET['contrato']    : null,
            isset($_GET['contratista']) ? (int) $_GET['contratista'] : null,
            $_GET['modulo'] ?? null,
            $idCentro
        );
        $this->success($rows);
    }

    public function approve(int $idUpload): void
    {
        RoleMiddleware::requireStaff();
        RlsMiddleware::ownsOrReviewsUpload($idUpload);
        if (!ModulesConfigService::featureEnabled('revision_admin')) {
            $this->error('La revisión administrativa está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $um = new EvidenceUpload();
        $upload = $um->find($idUpload);
        if (!$upload) { $this->error('Upload no encontrado.', 404); }
        $um->update($idUpload, ['estado' => 'Aprobada']);

        (new Review())->insert([
            'id_upload'   => $idUpload,
            'id_revisor'  => (int) $user['id'],
            'accion'      => 'Aprobada',
            'comentario'  => $this->input()['comentario'] ?? null,
        ]);
        // Notificar al contratista
        NotificationService::create(
            (int) $upload['id_persona'],
            'Aprobada',
            'Evidencia aprobada',
            'Su evidencia fue aprobada por el administrativo.',
            '/views/contratista-cargar-evidencias.html?upload=' . $idUpload,
            'contractor_aprobada'
        );
        // Actualizar avance
        $det = $um->detail($idUpload);
        if ($det && !empty($det['id_periodo'])) {
            (new Period())->updateAvance((int) $det['id_periodo']);
        }
        AuditService::log('review_approve', 'evidencias_uploads', $idUpload);
        $this->success(null, 'Evidencia aprobada.');
    }

    public function reject(int $idUpload): void
    {
        RoleMiddleware::requireStaff();
        RlsMiddleware::ownsOrReviewsUpload($idUpload);
        if (!ModulesConfigService::featureEnabled('revision_admin')) {
            $this->error('La revisión administrativa está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $data = $this->input();
        $comentario = trim((string) ($data['comentario'] ?? ''));
        if ($comentario === '') {
            $this->error('Debe ingresar un comentario explicando el motivo del rechazo.', 422);
        }

        $um = new EvidenceUpload();
        $upload = $um->find($idUpload);
        if (!$upload) { $this->error('Upload no encontrado.', 404); }
        $um->update($idUpload, ['estado' => 'Rechazada']);

        (new Review())->insert([
            'id_upload'   => $idUpload,
            'id_revisor'  => (int) $user['id'],
            'accion'      => 'Rechazada',
            'comentario'  => $comentario,
        ]);

        NotificationService::create(
            (int) $upload['id_persona'],
            'Rechazada',
            'Evidencia rechazada',
            $comentario,
            '/views/contratista-cargar-evidencias.html?upload=' . $idUpload,
            'contractor_rechazada'
        );

        $det = $um->detail($idUpload);
        if ($det && !empty($det['id_periodo'])) {
            (new Period())->updateAvance((int) $det['id_periodo']);
        }
        AuditService::log('review_reject', 'evidencias_uploads', $idUpload, ['comentario' => $comentario]);
        $this->success(null, 'Evidencia rechazada.');
    }

    public function history(int $idUpload): void
    {
        $this->success((new Review())->historyByUpload($idUpload));
    }
}
