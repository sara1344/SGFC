<?php
namespace App\Services;

use App\Config\App;
use App\Config\Database;
use App\Helpers\IpHelper;
use App\Models\UnifiedPdf;
use setasign\Fpdi\Fpdi;

/**
 * Unión (merge) de PDFs aprobados de un periodo.
 *
 * Adaptado del script Python `unir.py` (PyPDF2 PdfMerger) — implementación PHP
 * usando FPDI + FPDF (incluidos en /backend/vendor/setasign/).
 *
 * Reglas (ver flujo del sistema):
 *   - Solo permite unificar si todas las evidencias asignadas tienen su última
 *     versión en estado 'Aprobada'.
 *   - Ordena los PDFs por: orden de módulo → orden de subgrupo → orden de evidencia.
 *   - Guarda en /backend/storage/pdf_unificados/<userId>/<periodoId>_<timestamp>.pdf
 *   - Registra el PDF en la tabla `pdfs_unificados`.
 *   - Cambia estado a 'Enviado a administrativo' y notifica.
 */
final class PdfMergeService
{
    private static function bootPdfLibraries(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        $fpdfPath = App::basePath('vendor/setasign/fpdf/fpdf.php');
        if (!is_file($fpdfPath)) {
            App::error('No se encontró FPDF en /backend/vendor/setasign/fpdf/fpdf.php', 500);
        }
        require_once $fpdfPath;
        if (!class_exists(Fpdi::class)) {
            App::error(
                'No se encontró la librería FPDI. Asegúrese de que /backend/vendor/setasign/fpdi y /backend/vendor/setasign/fpdf estén instaladas.',
                500
            );
        }
        $ready = true;
    }

    /**
     * @return array{id_pdf:int, ruta_relativa:string, paginas:int}
     */
    public static function mergeForPeriod(int $idPeriodo, int $idContratista): array
    {
        $db = Database::connection();

        // 1. Validar que el periodo pertenezca al contratista
        $stmt = $db->prepare("SELECT p.*, c.id_persona, c.id_contrato FROM periodos p
                              JOIN contratos c ON c.id_contrato = p.id_contrato
                              WHERE p.id_periodo = :p LIMIT 1");
        $stmt->execute([':p' => $idPeriodo]);
        $periodo = $stmt->fetch();
        if (!$periodo) {
            App::error('Periodo no encontrado.', 404);
        }
        if ((int) $periodo['id_persona'] !== $idContratista) {
            App::error('El periodo no corresponde a este contratista.', 403);
        }

        $existingPdf = (new UnifiedPdf())->findForPeriod($idPeriodo, $idContratista, 'GF');
        if ($existingPdf && !empty($existingPdf['ruta_unificado'])) {
            App::error('Ya se generó el PDF unificado GF para este periodo. Consulte la sección PDFs Firmados.', 400);
        }

        // 2. Recuperar últimas versiones de evidencias GF asignadas
        $sql = "SELECT a.id_asignacion, em.orden AS evid_orden, s.orden AS s_orden, m.orden AS m_orden, em.codigo, em.nombre,
                       (SELECT u.id_upload FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS upload_id,
                       (SELECT u.estado FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS estado,
                       (SELECT u.ruta_relativa FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ruta
                FROM evidencias_asignadas a
                JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
                JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
                JOIN modulos m   ON m.id_modulo = s.id_modulo
                WHERE a.id_periodo = :p AND m.codigo = 'GF'
                ORDER BY m.orden, s.orden, em.orden";
        $stmt = $db->prepare($sql);
        $stmt->execute([':p' => $idPeriodo]);
        $rows = $stmt->fetchAll();

        if (!$rows) {
            App::error('No hay evidencias GF asignadas en este periodo.', 400);
        }

        // 3. Validar que todas estén aprobadas
        $pendientes = array_filter($rows, fn($r) => $r['estado'] !== 'Aprobada');
        if (!empty($pendientes)) {
            $list = array_map(fn($r) => $r['codigo'] . ' (' . ($r['estado'] ?? 'sin cargar') . ')', $pendientes);
            App::error('No se puede unificar GF: ' . count($pendientes) . ' evidencia(s) no están aprobadas. Faltan: '
                . implode(', ', array_slice($list, 0, 5)) . (count($list) > 5 ? '…' : ''), 400);
        }

        // 4. Cargar librerías PDF (FPDF antes que FPDI)
        self::bootPdfLibraries();

        // 5. Crear directorio destino
        $base = App::storagePath('pdf_unificados/' . $idContratista);
        if (!is_dir($base) && !@mkdir($base, 0775, true)) {
            App::error('No se pudo crear el directorio de PDFs unificados.', 500);
        }
        $fileName = self::generateDocumentFileName($idContratista, $periodo) . '.pdf';
        $absPath  = $base . DIRECTORY_SEPARATOR . $fileName;
        $relPath  = 'pdf_unificados/' . $idContratista . '/' . $fileName;

        // 6. Merge usando FPDI
        $pdf = new Fpdi();
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false, 0);

        $totalPages = 0;

        foreach ($rows as $r) {
            $src = App::storagePath($r['ruta']);
            if (!is_file($src)) {
                App::logError('PDF_MERGE_FILE_NOT_FOUND', $src);
                continue;
            }
            try {
                $pageCount = $pdf->setSourceFile($src);
                for ($i = 1; $i <= $pageCount; $i++) {
                    $tpl = $pdf->importPage($i);
                    $size = $pdf->getTemplateSize($tpl);
                    $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
                    $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                    $pdf->useTemplate($tpl, 0, 0, $size['width'], $size['height']);
                    $totalPages++;
                }
            } catch (\Throwable $e) {
                App::logError('PDF_MERGE_FAILED', $e->getMessage() . ' | source=' . $src);
            }
        }

        if ($totalPages === 0) {
            App::error('No se pudo procesar ninguna página PDF de las evidencias.', 500);
        }

        $pdf->Output($absPath, 'F');

        // 7. Registrar en BD (solo primera unificación por periodo)
        $model = new UnifiedPdf();
        $idPdf = $model->insert([
            'id_periodo'      => $idPeriodo,
            'id_persona'      => $idContratista,
            'modulo_codigo'   => 'GF',
            'tipo_entregable' => 'pdf',
            'ruta_unificado'  => $relPath,
            'estado'          => 'Enviado a administrativo',
            'fecha_generado'  => date('Y-m-d H:i:s'),
        ]);

        // 8. Notificar al administrativo (agrupado por contratista)
        $stmtNombre = $db->prepare("SELECT CONCAT(nombres, ' ', Apellidos) AS nombre FROM personas WHERE id_persona = :p LIMIT 1");
        $stmtNombre->execute([':p' => $idContratista]);
        $nombreContratista = (string) ($stmtNombre->fetchColumn() ?: 'Contratista');
        $periodoLabel = $periodo['nombre_periodo'] ?? ('periodo #' . $idPeriodo);

        NotificationService::notifyAdminsContractorActivity(
            $idContratista,
            $nombreContratista,
            'PDF para firma',
            'PDF unificado listo para firma',
            "PDF GF del {$periodoLabel} enviado para firma administrativa.",
            '/views/administrativo-firmas.html?pdf=' . $idPdf,
            'admin_pdf_firma'
        );

        AuditService::log('pdf_merge', 'pdfs_unificados', $idPdf, ['periodo' => $idPeriodo, 'paginas' => $totalPages]);

        return [
            'id_pdf'        => $idPdf,
            'ruta_relativa' => $relPath,
            'paginas'       => $totalPages,
        ];
    }

    /**
     * Estampa la firma en una hoja dedicada (nunca sobre el contenido del documento).
     */
    public static function stampSignature(
        int $idPdf,
        int $idPersona,
        string $rolFirma,
        string $cargo,
        string $nombreFirmante,
        string $imagenB64
    ): string {
        $model = new UnifiedPdf();
        $row = $model->find($idPdf);
        if (!$row) {
            App::error('PDF unificado no encontrado.', 404);
        }

        $imgPath = self::decodeSignatureImage($imagenB64);
        if ($imgPath === null) {
            App::error('La imagen de firma no es válida. Use PNG o JPG.', 422);
        }

        $sourceRel = match ($rolFirma) {
            'Administrativo' => $row['ruta_unificado'],
            'Contratista'    => $row['ruta_firmado_admin'] ?: $row['ruta_unificado'],
            default          => $row['ruta_unificado'],
        };
        $sourceAbs = App::storagePath($sourceRel);
        if (!is_file($sourceAbs)) {
            @unlink($imgPath);
            App::error('No se encontró el archivo PDF a firmar.', 500);
        }

        self::bootPdfLibraries();

        $baseName = pathinfo(basename($sourceRel), PATHINFO_FILENAME);
        if (str_ends_with($baseName, '_admin')) {
            $baseName = substr($baseName, 0, -6);
        }

        $destDir = App::storagePath('pdf_firmados/' . $row['id_persona']);
        if (!is_dir($destDir)) {
            @mkdir($destDir, 0775, true);
        }
        $destName = $rolFirma === 'Administrativo'
            ? $baseName . '_admin.pdf'
            : $baseName . '.pdf';
        $destAbs  = $destDir . DIRECTORY_SEPARATOR . $destName;
        $destRel  = 'pdf_firmados/' . $row['id_persona'] . '/' . $destName;

        $stampX = $rolFirma === 'Contratista' ? 95.0 : 15.0;

        try {
            $pdf = new Fpdi();
            $pdf->SetAutoPageBreak(false, 0);
            $pageCount = $pdf->setSourceFile($sourceAbs);
            $lastPageSize = null;

            for ($i = 1; $i <= $pageCount; $i++) {
                $tpl  = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tpl);
                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($tpl, 0, 0, $size['width'], $size['height']);
                $lastPageSize = $size;

                // Contratista: la última hoja del PDF admin ya es la de firmas
                if ($rolFirma === 'Contratista' && $i === $pageCount) {
                    $sigY = self::signatureBlockY($size);
                    self::drawSignatureBlock($pdf, $cargo, $nombreFirmante, $imgPath, $stampX, $sigY);
                }
            }

            // Administrativo: agregar hoja nueva exclusiva para firmas
            if ($rolFirma === 'Administrativo') {
                $pageSize = $lastPageSize ?? ['width' => 210.0, 'height' => 297.0];
                self::appendSignaturePage($pdf, $pageSize, $cargo, $nombreFirmante, $imgPath, $stampX);
            }

            $pdf->Output($destAbs, 'F');
        } finally {
            @unlink($imgPath);
        }

        $patch = [];
        if ($rolFirma === 'Administrativo') {
            $patch['ruta_firmado_admin']  = $destRel;
            $patch['estado']              = 'Firmado por administrativo';
            $patch['id_firmante_admin']   = $idPersona;
            $patch['fecha_firma_admin']   = date('Y-m-d H:i:s');
        } else {
            $patch['ruta_firmado_final']      = $destRel;
            $patch['estado']                  = 'Firmado por contratista';
            $patch['fecha_firma_contratista'] = date('Y-m-d H:i:s');
        }
        $model->update($idPdf, $patch);

        (new \App\Models\Signature())->insert([
            'id_pdf'      => $idPdf,
            'id_persona'  => $idPersona,
            'rol_firma'   => $rolFirma,
            'imagen_b64'  => $imagenB64,
            'hash'        => hash_file('sha256', $destAbs),
            'ip'          => IpHelper::clientAddress(),
            'user_agent'  => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        ]);

        AuditService::log('pdf_sign_' . strtolower($rolFirma), 'pdfs_unificados', $idPdf);

        return $destRel;
    }

    private static function generateDocumentFileName(int $idPersona, array $periodo): string
    {
        $db = Database::connection();
        $stmt = $db->prepare('SELECT nombres, Apellidos FROM personas WHERE id_persona = :p LIMIT 1');
        $stmt->execute([':p' => $idPersona]);
        $person = $stmt->fetch() ?: [];
        $initials = self::personInitials($person['nombres'] ?? 'X', $person['Apellidos'] ?? 'X');

        $year  = (int) ($periodo['anio'] ?? date('Y'));
        $month = (int) ($periodo['mes'] ?? date('n'));
        $prefix = sprintf('%04d-%02d-%s', $year, $month, $initials);
        $like = '%/' . $prefix . '%';

        $countStmt = $db->prepare(
            "SELECT COUNT(*) FROM pdfs_unificados
             WHERE id_persona = :p
               AND (ruta_unificado LIKE :like OR ruta_firmado_admin LIKE :like2 OR ruta_firmado_final LIKE :like3)"
        );
        $countStmt->execute([':p' => $idPersona, ':like' => $like, ':like2' => $like, ':like3' => $like]);
        $seq = (int) $countStmt->fetchColumn() + 1;

        return sprintf('%04d-%02d-%s%05d', $year, $month, $initials, $seq);
    }

    private static function personInitials(string $nombres, string $apellidos): string
    {
        $firstApellido = trim(explode(' ', trim($apellidos))[0] ?? '');
        return self::firstCharUpper($nombres) . self::firstCharUpper($firstApellido);
    }

    private static function firstCharUpper(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return 'X';
        }
        return mb_strtoupper(mb_substr($value, 0, 1, 'UTF-8'), 'UTF-8');
    }

    private static function decodeSignatureImage(string $imagenB64): ?string
    {
        $raw = trim($imagenB64);
        $ext = 'png';
        if (preg_match('/^data:image\/(\w+);base64,/', $raw, $m)) {
            $ext = strtolower($m[1]);
            $raw = substr($raw, strpos($raw, ',') + 1);
        }
        if (!in_array($ext, ['png', 'jpg', 'jpeg'], true)) {
            return null;
        }
        $bin = base64_decode($raw, true);
        if ($bin === false || strlen($bin) < 32 || strlen($bin) > 2 * 1024 * 1024) {
            return null;
        }
        $dir = App::storagePath('temp');
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $fileExt = $ext === 'jpeg' ? 'jpg' : $ext;
        $path = $dir . DIRECTORY_SEPARATOR . 'sig_' . uniqid('', true) . '.' . $fileExt;
        if (@file_put_contents($path, $bin) === false) {
            return null;
        }
        return $path;
    }

    /**
     * @param array{width:float,height:float} $size
     */
    private static function appendSignaturePage(
        Fpdi $pdf,
        array $size,
        string $cargo,
        string $nombre,
        string $imgPath,
        float $stampX
    ): void {
        $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
        $pdf->AddPage($orientation, [$size['width'], $size['height']]);

        $pdf->SetFont('Helvetica', 'B', 11);
        $pdf->SetTextColor(0, 48, 77);
        $pdf->SetXY(0, 28);
        $pdf->Cell($size['width'], 7, 'FIRMAS ELECTRONICAS - SGFC SENA', 0, 1, 'C');

        $pdf->SetFont('Helvetica', '', 8);
        $pdf->SetTextColor(100, 116, 139);
        $pdf->SetX(0);
        $pdf->Cell($size['width'], 5, 'Documento firmado digitalmente mediante SGFC', 0, 1, 'C');

        $sigY = self::signatureBlockY($size);
        self::drawSignatureBlock($pdf, $cargo, $nombre, $imgPath, $stampX, $sigY);
    }

    private static function signatureBlockY(array $size): float
    {
        $boxH = 44.0;
        return max(50.0, ($size['height'] - $boxH) / 2);
    }

    private static function drawSignatureBlock(
        Fpdi $pdf,
        string $cargo,
        string $nombre,
        string $imgPath,
        float $x,
        float $y
    ): void {
        $boxW = 75.0;
        $boxH = 44.0;

        $pdf->SetDrawColor(0, 48, 77);
        $pdf->SetFillColor(240, 253, 244);
        $pdf->Rect($x, $y, $boxW, $boxH, 'DF');

        try {
            $pdf->Image($imgPath, $x + 4, $y + 3, $boxW - 8, 18);
        } catch (\Throwable $e) {
            App::logError('PDF_SIGNATURE_IMAGE_FAILED', $e->getMessage());
            App::error('No se pudo insertar la imagen de firma en el PDF.', 500);
        }

        $pdf->SetXY($x + 4, $y + 22);
        $pdf->SetFont('Helvetica', '', 7);
        $pdf->SetTextColor(0, 48, 77);
        $pdf->MultiCell($boxW - 8, 3.5, $cargo . ': ' . $nombre, 0, 'L');

        $pdf->SetX($x + 4);
        $pdf->Cell($boxW - 8, 3.5, date('d/m/Y H:i:s'), 0, 1);

        $pdf->SetX($x + 4);
        $pdf->SetFont('Helvetica', 'B', 7);
        $pdf->SetTextColor(57, 169, 0);
        $pdf->Cell($boxW - 8, 3.5, 'SGFC SENA', 0, 1);
    }
}
