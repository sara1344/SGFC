<?php
namespace App\Services;

use App\Config\App;
use App\Models\EvidenceUpload;
use App\Models\User;
use setasign\Fpdi\Fpdi;

/**
 * Incrusta la firma del contratista en una evidencia individual (PDF o imagen).
 */
final class EvidenceSignatureService
{
    public static function signatureMeta(int $idUpload, int $idPersona): array
    {
        $det = (new EvidenceUpload())->detail($idUpload);
        if (!$det) {
            App::error('Upload no encontrado.', 404);
        }
        if ((int) $det['contratista_id'] !== $idPersona) {
            App::error('Esta evidencia no le pertenece.', 403);
        }

        $db = \App\Config\Database::connection();
        $stmt = $db->prepare(
            'SELECT em.requiere_firma FROM evidencias_asignadas a
             JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
             WHERE a.id_asignacion = :a LIMIT 1'
        );
        $stmt->execute([':a' => (int) $det['id_asignacion']]);
        $row = $stmt->fetch();
        if (!$row || !(int) ($row['requiere_firma'] ?? 0)) {
            App::error('Esta evidencia no requiere firma del contratista.', 400);
        }

        $upload = (new EvidenceUpload())->find($idUpload);
        if (($upload['estado'] ?? '') === 'Aprobada') {
            App::error('La evidencia ya fue aprobada y no puede modificarse.', 403);
        }

        $abs = FileUploadService::absolutePath($upload['ruta_relativa']);
        if (!is_file($abs)) {
            App::error('Archivo no disponible.', 404);
        }

        $kind = self::detectKind($upload, $det);
        if (!in_array($kind, ['pdf', 'image'], true)) {
            App::error('Solo se puede firmar evidencias en formato PDF o imagen.', 422);
        }

        $pdfProbe = $kind === 'pdf' ? self::probePdfStampable($abs) : ['stampable' => true, 'page_count' => 1, 'reason' => null];
        $users = new User();

        return [
            'id_upload'           => $idUpload,
            'kind'                => $kind,
            'page_count'          => $pdfProbe['page_count'],
            'pdf_firmable'        => $pdfProbe['stampable'],
            'pdf_firma_aviso'     => $pdfProbe['reason'],
            'firmado_contratista' => (int) ($upload['firmado_contratista'] ?? 0),
            'firma_pagina'        => $upload['firma_pagina'] ?? null,
            'firma_x_pct'         => $upload['firma_x_pct'] ?? null,
            'firma_y_pct'         => $upload['firma_y_pct'] ?? null,
            'firma_w_pct'         => $upload['firma_w_pct'] ?? null,
            'firma_h_pct'         => $upload['firma_h_pct'] ?? null,
            'tiene_firma_usuario' => $users->getSignatureImage($idPersona) !== null,
            'nombre_evidencia'    => $det['evidencia_nombre'] ?? '',
        ];
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function applyContractorSignature(int $idUpload, int $idPersona, array $data): void
    {
        $meta = self::signatureMeta($idUpload, $idPersona);
        $upload = (new EvidenceUpload())->find($idUpload);
        $det = (new EvidenceUpload())->detail($idUpload);
        if ($det && !empty($det['id_periodo'])) {
            PeriodExtensionService::assertCanUpload((int) $det['id_periodo']);
        }
        $abs = FileUploadService::absolutePath($upload['ruta_relativa']);

        $page = max(1, (int) ($data['pagina'] ?? 1));
        $xPct = self::clampPct((float) ($data['x_pct'] ?? 0));
        $yPct = self::clampPct((float) ($data['y_pct'] ?? 0));
        $wPct = self::clampPct((float) ($data['w_pct'] ?? 18), 3, 60);
        $hPct = self::clampPct((float) ($data['h_pct'] ?? 8), 2, 40);

        if ($meta['kind'] === 'pdf') {
            if (empty($meta['pdf_firmable'])) {
                App::error(
                    (string) ($meta['pdf_firma_aviso'] ?? 'Este PDF no puede firmarse en el servidor. Suba una copia sin contraseña o reexportada desde Word/LibreOffice.'),
                    422
                );
            }
            if ($page > (int) $meta['page_count']) {
                App::error('Página inválida.', 422);
            }
        }

        $imagenB64 = self::resolveSignatureImage($data, $idPersona);
        $imgPath = self::decodeSignatureImage($imagenB64);
        if ($imgPath === null) {
            App::error('La imagen de firma no es válida. Use PNG o JPG.', 422);
        }

        $tmpOut = App::storagePath('temp') . DIRECTORY_SEPARATOR . 'ev_sig_' . uniqid('', true)
            . ($meta['kind'] === 'pdf' ? '.pdf' : self::imageExtFromPath($abs));

        try {
            if ($meta['kind'] === 'pdf') {
                self::stampOnPdf($abs, $tmpOut, $imgPath, $page, $xPct, $yPct, $wPct, $hPct);
            } else {
                self::stampOnImage($abs, $tmpOut, $imgPath, $xPct, $yPct, $wPct, $hPct);
            }

            if (!is_file($tmpOut) || filesize($tmpOut) < 32) {
                App::error('No se pudo generar el documento firmado.', 500);
            }

            if (!@rename($tmpOut, $abs)) {
                if (!@copy($tmpOut, $abs)) {
                    App::error('No se pudo guardar el documento firmado.', 500);
                }
                @unlink($tmpOut);
            }

            (new EvidenceUpload())->update($idUpload, [
                'firmado_contratista'     => 1,
                'firma_pagina'            => $page,
                'firma_x_pct'             => $xPct,
                'firma_y_pct'             => $yPct,
                'firma_w_pct'             => $wPct,
                'firma_h_pct'             => $hPct,
                'fecha_firma_contratista' => date('Y-m-d H:i:s'),
                'tamano_bytes'            => filesize($abs),
            ]);

            AuditService::log('evidence_contractor_sign', 'evidencias_uploads', $idUpload, [
                'pagina' => $page,
            ]);
        } finally {
            @unlink($imgPath);
            if (is_file($tmpOut)) {
                @unlink($tmpOut);
            }
        }
    }

    /** @param array<string,mixed> $upload @param array<string,mixed> $det */
    private static function detectKind(array $upload, array $det): string
    {
        $mime = strtolower((string) ($upload['mime_type'] ?? ''));
        $name = strtolower((string) ($upload['nombre_original'] ?? ''));
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $format = EvidenceFormatService::normalize((string) ($det['tipo_archivo'] ?? 'pdf'));

        if ($format === 'pdf' || str_contains($mime, 'pdf') || $ext === 'pdf') {
            return 'pdf';
        }
        if ($format === 'imagen' || str_starts_with($mime, 'image/') || in_array($ext, ['png', 'jpg', 'jpeg', 'webp'], true)) {
            return 'image';
        }
        return 'other';
    }

    /** @return array{stampable:bool,page_count:int,reason:?string} */
    private static function probePdfStampable(string $abs): array
    {
        self::bootPdfLibraries();
        $working = null;
        try {
            $working = self::ensureFpdiCompatiblePdf($abs);
            $pdf = new Fpdi();
            $pages = max(1, $pdf->setSourceFile($working));
            return ['stampable' => true, 'page_count' => $pages, 'reason' => null];
        } catch (\Throwable $e) {
            App::logError('EVIDENCE_SIGN_PDF_PROBE', $e->getMessage() . ' | source=' . $abs);
            return [
                'stampable'  => false,
                'page_count' => 1,
                'reason'     => self::humanizePdfStampError($e->getMessage()),
            ];
        } finally {
            self::cleanupTempPdf($working, $abs);
        }
    }

    private static function humanizePdfStampError(string $raw): string
    {
        $msg = strtolower($raw);
        if (str_contains($msg, 'encrypted')) {
            return 'Este PDF está protegido o cifrado. Guarde una copia sin contraseña (Archivo → Imprimir → Guardar como PDF) y vuelva a subirla.';
        }
        if (str_contains($msg, 'compression technique')) {
            return 'Este PDF usa un formato de compresión no compatible. Reexpórtelo como PDF estándar desde Word, LibreOffice o «Imprimir a PDF» y vuelva a subirlo.';
        }
        return 'No se pudo procesar este PDF para aplicar la firma. Suba una copia reexportada sin contraseña.';
    }

    private static function stampOnPdf(
        string $sourceAbs,
        string $destAbs,
        string $imgPath,
        int $page,
        float $xPct,
        float $yPct,
        float $wPct,
        float $hPct
    ): void {
        self::bootPdfLibraries();
        $workingSource = null;
        try {
            $workingSource = self::ensureFpdiCompatiblePdf($sourceAbs);
            $pdf = new Fpdi();
            $pdf->SetAutoPageBreak(false, 0);
            $pageCount = $pdf->setSourceFile($workingSource);

            for ($i = 1; $i <= $pageCount; $i++) {
                $tpl = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tpl);
                $orientation = ($size['width'] > $size['height']) ? 'L' : 'P';
                $pdf->AddPage($orientation, [$size['width'], $size['height']]);
                $pdf->useTemplate($tpl, 0, 0, $size['width'], $size['height']);

                if ($i === $page) {
                    $imgW = ($wPct / 100) * $size['width'];
                    $imgH = ($hPct / 100) * $size['height'];
                    $imgX = ($xPct / 100) * $size['width'];
                    $imgY = ($yPct / 100) * $size['height'];
                    try {
                        $pdf->Image($imgPath, $imgX, $imgY, $imgW, $imgH);
                    } catch (\Throwable $e) {
                        App::logError('EVIDENCE_SIGN_PDF_IMAGE', $e->getMessage());
                        App::error('No se pudo insertar la firma en el PDF.', 500);
                    }
                }
            }

            $pdf->Output($destAbs, 'F');
        } catch (\Throwable $e) {
            App::logError('EVIDENCE_SIGN_PDF', $e->getMessage() . ' | source=' . $sourceAbs);
            App::error(self::humanizePdfStampError($e->getMessage()), 422);
        } finally {
            self::cleanupTempPdf($workingSource, $sourceAbs);
        }
    }

    private static function stampOnImage(
        string $sourceAbs,
        string $destAbs,
        string $imgPath,
        float $xPct,
        float $yPct,
        float $wPct,
        float $hPct
    ): void {
        if (!function_exists('imagecreatefromjpeg')) {
            App::error('La extensión GD no está disponible para firmar imágenes.', 500);
        }

        $base = self::loadImage($sourceAbs);
        if ($base === null) {
            App::error('No se pudo leer la imagen del documento.', 500);
        }

        $sig = self::loadImage($imgPath);
        if ($sig === null) {
            imagedestroy($base);
            App::error('No se pudo leer la imagen de firma.', 500);
        }

        $bw = imagesx($base);
        $bh = imagesy($base);
        $sw = imagesx($sig);
        $sh = imagesy($sig);

        $dstW = (int) round(($wPct / 100) * $bw);
        $dstH = (int) round(($hPct / 100) * $bh);
        $dstX = (int) round(($xPct / 100) * $bw);
        $dstY = (int) round(($yPct / 100) * $bh);

        imagealphablending($base, true);
        imagesavealpha($base, true);
        imagecopyresampled($base, $sig, $dstX, $dstY, 0, 0, max(1, $dstW), max(1, $dstH), $sw, $sh);

        imagedestroy($sig);

        $ext = strtolower(pathinfo($sourceAbs, PATHINFO_EXTENSION));
        $ok = match ($ext) {
            'png'  => imagepng($base, $destAbs),
            'webp' => function_exists('imagewebp') ? imagewebp($base, $destAbs) : false,
            default => imagejpeg($base, $destAbs, 92),
        };
        imagedestroy($base);

        if (!$ok) {
            App::error('No se pudo guardar la imagen firmada.', 500);
        }
    }

    private static function loadImage(string $path): ?\GdImage
    {
        $info = @getimagesize($path);
        if (!$info) {
            return null;
        }
        return match ($info[2] ?? 0) {
            IMAGETYPE_PNG  => @imagecreatefrompng($path) ?: null,
            IMAGETYPE_JPEG => @imagecreatefromjpeg($path) ?: null,
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            default        => null,
        };
    }

    private static function imageExtFromPath(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['png', 'webp'], true) ? '.' . $ext : '.jpg';
    }

    private static function bootPdfLibraries(): void
    {
        static $ready = false;
        if ($ready) {
            return;
        }
        $fpdfPath = App::basePath('vendor/setasign/fpdf/fpdf.php');
        if (!is_file($fpdfPath)) {
            App::error('No se encontró FPDF.', 500);
        }
        require_once $fpdfPath;
        if (!class_exists(Fpdi::class)) {
            App::error('No se encontró FPDI.', 500);
        }
        $ready = true;
    }

    /** @param array<string,mixed> $data */
    private static function resolveSignatureImage(array $data, int $idPersona): string
    {
        $incoming = trim((string) ($data['imagen_b64'] ?? ''));
        $users = new User();

        if ($incoming !== '') {
            $normalized = SignatureImageService::normalizeForStorage($incoming);
            $stored = $users->getSignatureImage($idPersona);
            if ($stored !== $normalized) {
                $users->saveSignatureImage($idPersona, $normalized);
            }
            return $normalized;
        }

        $stored = $users->getSignatureImage($idPersona);
        if ($stored === null) {
            App::error('Debe adjuntar una imagen de su firma (PNG o JPG).', 422);
        }

        return $stored;
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

    private static function clampPct(float $value, float $min = 0, float $max = 95): float
    {
        return round(max($min, min($max, $value)), 4);
    }

    private static function ensureFpdiCompatiblePdf(string $sourceAbs): string
    {
        self::bootPdfLibraries();
        try {
            $probe = new Fpdi();
            $probe->setSourceFile($sourceAbs);
            return $sourceAbs;
        } catch (\Throwable $e) {
            App::logError('EVIDENCE_SIGN_PDF_NORMALIZE', $e->getMessage() . ' | source=' . $sourceAbs);
        }

        $tempOut = App::storagePath('temp') . DIRECTORY_SEPARATOR . 'ev_norm_' . uniqid('', true) . '.pdf';
        if (!self::normalizePdfViaPython($sourceAbs, $tempOut)) {
            throw new \RuntimeException('No se pudo preparar el PDF para aplicar la firma.');
        }

        try {
            $probe = new Fpdi();
            $probe->setSourceFile($tempOut);
            return $tempOut;
        } catch (\Throwable $e) {
            @unlink($tempOut);
            throw $e;
        }
    }

    private static function normalizePdfViaPython(string $sourceAbs, string $destAbs): bool
    {
        $python = self::findPythonExecutable();
        $script = App::basePath('tools/normalize_pdf.py');
        if ($python === null || !is_file($script)) {
            return false;
        }

        $cmd = [$python, $script, '--output', $destAbs, $sourceAbs];
        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];
        $process = @proc_open($cmd, $descriptorSpec, $pipes);
        if (!is_resource($process)) {
            return false;
        }

        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        if ($exitCode !== 0 || !is_file($destAbs)) {
            App::logError('EVIDENCE_SIGN_PDF_PYTHON', trim($stderr !== '' ? $stderr : $stdout));
            return false;
        }

        return true;
    }

    private static function cleanupTempPdf(?string $working, string $original): void
    {
        if ($working !== null && $working !== $original && is_file($working)) {
            @unlink($working);
        }
    }

    private static function findPythonExecutable(): ?string
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached !== '' ? $cached : null;
        }

        foreach (['python', 'python3', 'py'] as $candidate) {
            $code = 1;
            @exec($candidate . ' --version 2>&1', $out, $code);
            if ($code === 0) {
                $cached = $candidate;
                return $candidate;
            }
        }

        $cached = '';
        return null;
    }
}
