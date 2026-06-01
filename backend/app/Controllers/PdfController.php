<?php
namespace App\Controllers;

use App\Config\App;
use App\Middlewares\RoleMiddleware;
use App\Middlewares\RlsMiddleware;
use App\Models\UnifiedPdf;
use App\Models\User;
use App\Services\PdfMergeService;
use App\Services\ModulesConfigService;
use App\Services\NotificationService;
use App\Services\AuditService;

final class PdfController extends Controller
{
    /** POST /api/pdf/merge   body: {id_periodo:N} */
    public function merge(): void
    {
        if (!ModulesConfigService::featureEnabled('unificar_pdf')) {
            $this->error('La unificación de PDF está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $data = $this->input();
        $idPer = (int) ($data['id_periodo'] ?? 0);
        if ($idPer <= 0) { $this->error('Falta id_periodo.', 422); }
        RlsMiddleware::ownsPeriod($idPer);

        $r = PdfMergeService::mergeForPeriod($idPer, (int) $user['id']);
        $this->success($r, 'PDF unificado generado y enviado al administrativo.');
    }

    /** GET /api/pdf/unified/{id} - vista inline */
    public function viewUnified(int $idPdf): void
    {
        $u = $this->user();
        $p = (new UnifiedPdf())->find($idPdf);
        if (!$p) { $this->error('PDF no encontrado.', 404); }
        if (!\App\Services\PermissionService::isPrivileged($u) && (int) $p['id_persona'] !== (int) $u['id']) {
            $this->error('No autorizado.', 403);
        }
        $rel = $p['ruta_firmado_final'] ?: $p['ruta_firmado_admin'] ?: $p['ruta_unificado'];
        if (!$rel) { $this->error('Aún no se ha generado el PDF.', 404); }
        $abs = App::storagePath($rel);
        if (!is_file($abs)) { $this->error('Archivo no disponible.', 404); }
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($abs));
        header('Content-Disposition: inline; filename="' . addslashes(basename($rel)) . '"');
        readfile($abs);
        exit;
    }

    /** GET /api/pdf/final/{id}/download */
    public function downloadFinal(int $idPdf): void
    {
        $u = $this->user();
        $p = (new UnifiedPdf())->find($idPdf);
        if (!$p) { $this->error('PDF no encontrado.', 404); }
        if (!\App\Services\PermissionService::isPrivileged($u) && (int) $p['id_persona'] !== (int) $u['id']) {
            $this->error('No autorizado.', 403);
        }
        $rel = $p['ruta_firmado_final'] ?: $p['ruta_firmado_admin'] ?: $p['ruta_unificado'];
        if (!$rel) { $this->error('Aún no se ha generado el PDF.', 404); }
        $abs = App::storagePath($rel);
        if (!is_file($abs)) { $this->error('Archivo no disponible.', 404); }
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($abs));
        header('Content-Disposition: attachment; filename="' . addslashes(basename($rel)) . '"');
        readfile($abs);
        exit;
    }

    /** POST /api/pdf/admin-sign   body:{id_pdf, imagen_b64?} */
    public function adminSign(): void
    {
        RoleMiddleware::requireStaff();
        if (!ModulesConfigService::featureEnabled('firma_pdf')) {
            $this->error('La firma de PDF está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $data = $this->input();
        $idPdf = (int) ($data['id_pdf'] ?? 0);
        if ($idPdf <= 0) { $this->error('Falta id_pdf.', 422); }

        $m = new UnifiedPdf();
        $pdfRow = $m->find($idPdf);
        if (!$pdfRow || ($pdfRow['tipo_entregable'] ?? 'pdf') !== 'pdf' || ($pdfRow['modulo_codigo'] ?? 'GF') !== 'GF') {
            $this->error('Este documento no requiere firma administrativa.', 400);
        }

        $imagenB64 = $this->resolveSignatureImage($data, (int) $user['id']);

        $rel = PdfMergeService::stampSignature(
            $idPdf,
            (int) $user['id'],
            'Administrativo',
            (string) ($user['rol_label'] ?? 'Administrativo'),
            (string) ($user['nombre'] ?? 'Administrativo'),
            $imagenB64
        );

        $m->update($idPdf, ['estado' => 'Enviado a contratista']);

        NotificationService::create((int) $pdfRow['id_persona'],
            'PDF firmado',
            'PDF firmado por el administrativo',
            'El PDF del periodo está firmado por el administrativo. Puedes firmarlo y descargarlo.',
            '/views/contratista-firmados.html?pdf=' . $idPdf,
            'contractor_pdf_firmado'
        );

        AuditService::log('pdf_admin_sign', 'pdfs_unificados', $idPdf);
        $this->success(['ruta' => $rel], 'PDF firmado y reenviado al contratista.');
    }

    /** POST /api/pdf/contractor-sign   body:{id_pdf, imagen_b64?} */
    public function contractorSign(): void
    {
        if (!ModulesConfigService::featureEnabled('firma_pdf')) {
            $this->error('La firma de PDF está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $data = $this->input();
        $idPdf = (int) ($data['id_pdf'] ?? 0);
        if ($idPdf <= 0) { $this->error('Falta id_pdf.', 422); }

        $m = new UnifiedPdf();
        $row = $m->find($idPdf);
        if (!$row) { $this->error('PDF no encontrado.', 404); }
        if (($row['tipo_entregable'] ?? 'pdf') !== 'pdf' || ($row['modulo_codigo'] ?? 'GF') !== 'GF') {
            $this->error('Los paquetes GC no requieren firma del contratista.', 400);
        }
        if ((int) $row['id_persona'] !== (int) $user['id']) {
            $this->error('Este PDF no le pertenece.', 403);
        }
        if (!in_array($row['estado'], ['Firmado por administrativo', 'Enviado a contratista'], true)) {
            $this->error('El PDF aún no fue firmado por el administrativo.', 400);
        }
        $imagenB64 = $this->resolveSignatureImage($data, (int) $user['id']);

        $rel = PdfMergeService::stampSignature(
            $idPdf,
            (int) $user['id'],
            'Contratista',
            (string) ($user['rol_label'] ?? 'Contratista'),
            (string) ($user['nombre'] ?? 'Contratista'),
            $imagenB64
        );
        $m->update($idPdf, ['estado' => 'Finalizado']);

        AuditService::log('pdf_contractor_sign', 'pdfs_unificados', $idPdf);
        $this->success(['ruta' => $rel], 'PDF firmado. Disponible para descargar.');
    }

    /** GET /api/pdf/pending-admin (admin) */
    public function pendingForAdmin(): void
    {
        RoleMiddleware::requireStaff();
        $this->success((new UnifiedPdf())->pendingForAdmin());
    }

    /** GET /api/pdf/signed (admin) */
    public function signed(): void
    {
        RoleMiddleware::requireStaff();
        $this->success((new UnifiedPdf())->signed());
    }

    /** GET /api/pdf/mine (contratista) */
    public function mine(): void
    {
        $user = $this->user();
        $this->success((new UnifiedPdf())->forContractor((int) $user['id']));
    }

    private function resolveSignatureImage(array $data, int $idPersona): string
    {
        $incoming = trim((string) ($data['imagen_b64'] ?? ''));
        $users = new User();

        if ($incoming !== '') {
            $users->saveSignatureImage($idPersona, $incoming);
            return $incoming;
        }

        $stored = $users->getSignatureImage($idPersona);
        if ($stored === null) {
            $this->error('Debe adjuntar una imagen de su firma (PNG o JPG). Solo se solicita la primera vez.', 422);
        }

        return $stored;
    }
}
