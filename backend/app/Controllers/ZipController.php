<?php
namespace App\Controllers;

use App\Config\App;
use App\Middlewares\RoleMiddleware;
use App\Middlewares\RlsMiddleware;
use App\Models\UnifiedPdf;
use App\Services\ModulesConfigService;
use App\Services\ZipPackService;

final class ZipController extends Controller
{
    /** POST /api/zip/pack-gc  body: { id_periodo } */
    public function packGc(): void
    {
        if (!ModulesConfigService::featureEnabled('unificar_pdf')) {
            $this->error('La generación de paquetes está deshabilitada en la configuración del sistema.', 403);
        }
        $user = $this->user();
        $data = $this->input();
        $idPer = (int) ($data['id_periodo'] ?? 0);
        if ($idPer <= 0) {
            $this->error('Falta id_periodo.', 422);
        }
        RlsMiddleware::ownsPeriod($idPer);

        $r = ZipPackService::packGcForPeriod($idPer, (int) $user['id']);
        $this->success($r, 'Paquete ZIP GC generado y disponible para descarga.');
    }

    /** GET /api/zip/mine (contratista) */
    public function mine(): void
    {
        $user = $this->user();
        $this->success((new UnifiedPdf())->gcPackagesForContractor((int) $user['id']));
    }

    /** GET /api/zip/admin */
    public function adminList(): void
    {
        RoleMiddleware::requireStaff();
        $this->success((new UnifiedPdf())->gcPackagesForAdmin());
    }

    /** GET /api/zip/{id}/download */
    public function download(int $idPdf): void
    {
        $u = $this->user();
        $p = (new UnifiedPdf())->find($idPdf);
        if (!$p || ($p['tipo_entregable'] ?? '') !== 'zip') {
            $this->error('Paquete ZIP no encontrado.', 404);
        }
        if (!\App\Services\PermissionService::isPrivileged($u) && (int) $p['id_persona'] !== (int) $u['id']) {
            $this->error('No autorizado.', 403);
        }
        $rel = $p['ruta_unificado'] ?? null;
        if (!$rel) {
            $this->error('Aún no se ha generado el paquete.', 404);
        }
        $abs = App::storagePath($rel);
        if (!is_file($abs)) {
            $this->error('Archivo no disponible.', 404);
        }
        $name = basename($rel);
        header('Content-Type: application/zip');
        header('Content-Length: ' . filesize($abs));
        header('Content-Disposition: attachment; filename="' . addslashes($name) . '"');
        readfile($abs);
        exit;
    }
}
