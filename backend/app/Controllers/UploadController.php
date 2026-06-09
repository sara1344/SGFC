<?php

namespace App\Controllers;



use App\Config\App;

use App\Middlewares\RlsMiddleware;

use App\Models\EvidenceUpload;

use App\Models\Period;

use App\Services\AuditService;
use App\Services\FileUploadService;
use App\Services\EvidencePreviewService;

use App\Services\ModulesConfigService;

use App\Services\NotificationService;
use App\Services\EvidenceSignatureService;
use App\Services\PeriodExtensionService;



final class UploadController extends Controller

{

    public function store(): void

    {

        if (!ModulesConfigService::featureEnabled('carga_contratista')) {

            $this->error('La carga de evidencias está deshabilitada en la configuración del sistema.', 403);

        }

        $user = $this->user();

        $asign = (int) ($_POST['id_asignacion'] ?? 0);

        if ($asign <= 0) {

            $this->error('Falta id_asignacion.', 422);

        }

        if (empty($_FILES['archivo'])) {

            $this->error('No se recibió ningún archivo (campo "archivo").', 422);

        }



        $db = \App\Config\Database::connection();

        $stmt = $db->prepare("SELECT a.id_periodo, c.id_persona, m.codigo AS modulo_codigo, em.tipo_archivo
                              FROM evidencias_asignadas a
                              JOIN periodos pe ON pe.id_periodo = a.id_periodo
                              JOIN contratos c ON c.id_contrato = pe.id_contrato
                              JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
                              JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
                              JOIN modulos m ON m.id_modulo = s.id_modulo
                              WHERE a.id_asignacion = :a LIMIT 1");

        $stmt->execute([':a' => $asign]);

        $own = $stmt->fetch();

        if (!$own) {

            $this->error('Asignación no encontrada.', 404);

        }

        if ((int) $own['id_persona'] !== (int) $user['id']) {

            $this->error('Esta evidencia no le pertenece.', 403);

        }

        PeriodExtensionService::assertCanUpload((int) $own['id_periodo']);



        $existingStmt = $db->prepare(

            'SELECT id_upload, ruta_relativa, estado FROM evidencias_uploads WHERE id_asignacion = :a'

        );

        $existingStmt->execute([':a' => $asign]);

        $existingRows = $existingStmt->fetchAll();

        $isReplace = count($existingRows) > 0;



        foreach ($existingRows as $row) {
            if (($row['estado'] ?? '') === 'Aprobada') {
                $this->error('Esta evidencia ya fue aprobada y no puede modificarse.', 403);
            }
        }

        $moduloCodigo = strtoupper((string) ($own['modulo_codigo'] ?? 'GF'));
        $expectedFormat = (string) ($own['tipo_archivo'] ?? 'pdf');
        $meta = FileUploadService::saveEvidence($_FILES['archivo'], (int) $user['id'], $asign, $moduloCodigo, $expectedFormat);



        $db->beginTransaction();

        try {

            foreach ($existingRows as $row) {

                FileUploadService::deleteRelativePath($row['ruta_relativa'] ?? null);

                (new EvidenceUpload())->delete((int) $row['id_upload']);

            }



            $idUpload = (new EvidenceUpload())->insert([

                'id_asignacion'      => $asign,

                'id_persona'         => (int) $user['id'],

                'nombre_original'    => $meta['nombre_original'],

                'nombre_almacenado'  => $meta['nombre_almacenado'],

                'ruta_relativa'      => $meta['ruta_relativa'],

                'mime_type'          => $meta['mime_type'],

                'tamano_bytes'       => $meta['tamano_bytes'],

                'version'            => 1,

                'estado'             => 'Pendiente revisión',

            ]);

            $db->commit();

        } catch (\Throwable $e) {

            $db->rollBack();

            FileUploadService::deleteRelativePath($meta['ruta_relativa'] ?? null);

            App::logError('EVIDENCE_UPLOAD_REPLACE_FAILED', $e->getMessage());

            $this->error('No se pudo guardar la evidencia.', 500);

        }



        (new Period())->updateAvance((int) $own['id_periodo']);

        AuditService::log('evidence_upload', 'evidencias_uploads', $idUpload, [

            'asign'   => $asign,

            'replace' => $isReplace,

        ]);



        $det = (new EvidenceUpload())->detail($idUpload);

        $evNombre = $det['evidencia_nombre'] ?? ('asignación #' . $asign);

        $tipoNotif = $isReplace ? 'Evidencia actualizada' : 'Evidencia cargada';

        $titulo = $isReplace ? 'Evidencia actualizada' : 'Nueva evidencia cargada';

        $mensaje = $evNombre;



        NotificationService::notifyAdminsContractorActivity(

            (int) $user['id'],

            (string) ($user['nombre'] ?? 'Contratista'),

            $tipoNotif,

            $titulo,

            $mensaje,

            '/views/administrativo-revision.html?upload=' . $idUpload

        );



        $this->success(['id_upload' => $idUpload, 'replaced' => $isReplace], 'Archivo cargado.');

    }



    public function show(int $id): void

    {

        RlsMiddleware::ownsOrReviewsUpload($id);

        $u = (new EvidenceUpload())->detail($id);

        if (!$u) { $this->error('Upload no encontrado.', 404); }

        $this->success($u);

    }



    public function viewInline(int $id): void

    {

        RlsMiddleware::ownsOrReviewsUpload($id);

        $u = (new EvidenceUpload())->find($id);

        if (!$u) { $this->error('Upload no encontrado.', 404); }

        $this->streamFile(
            FileUploadService::absolutePath($u['ruta_relativa']),
            'inline',
            $u['nombre_original'],
            (string) ($u['mime_type'] ?? 'application/octet-stream')
        );

    }

    public function previewHtml(int $id): void

    {

        RlsMiddleware::ownsOrReviewsUpload($id);

        $u = (new EvidenceUpload())->find($id);

        if (!$u) { $this->error('Upload no encontrado.', 404); }

        EvidencePreviewService::streamHtmlPreview($u);

    }



    /** GET /api/uploads/evidence/{id}/signature-meta */
    public function signatureMeta(int $id): void
    {
        RlsMiddleware::ownsOrReviewsUpload($id);
        $user = $this->user();
        $this->success(EvidenceSignatureService::signatureMeta($id, (int) $user['id']));
    }

    /** POST /api/uploads/evidence/{id}/sign */
    public function sign(int $id): void
    {
        if (!ModulesConfigService::featureEnabled('carga_contratista')) {
            $this->error('La carga de evidencias está deshabilitada.', 403);
        }
        RlsMiddleware::ownsOrReviewsUpload($id);
        $user = $this->user();
        EvidenceSignatureService::applyContractorSignature($id, (int) $user['id'], $this->input());
        $this->success(null, 'Firma aplicada al documento.');
    }

    public function download(int $id): void

    {

        RlsMiddleware::ownsOrReviewsUpload($id);

        $u = (new EvidenceUpload())->find($id);

        if (!$u) { $this->error('Upload no encontrado.', 404); }

        $this->streamFile(
            FileUploadService::absolutePath($u['ruta_relativa']),
            'attachment',
            $u['nombre_original'],
            (string) ($u['mime_type'] ?? 'application/octet-stream')
        );

    }



    private function streamFile(string $abs, string $disposition, string $name, string $mime): never
    {
        if (!is_file($abs)) {
            App::error('Archivo no disponible.', 404);
        }
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($abs));
        header(sprintf('Content-Disposition: %s; filename="%s"', $disposition, addslashes($name)));
        header('Cache-Control: private, max-age=0, no-cache');
        readfile($abs);
        exit;
    }

}


