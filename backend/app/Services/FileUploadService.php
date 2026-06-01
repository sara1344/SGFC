<?php
namespace App\Services;

use App\Config\App;
use App\Config\Env;
use App\Services\SecurityConfigService;

/**
 * Subida segura de evidencias a /backend/storage/evidencias/.
 * GF: solo PDF. GC: PDF, Word, Excel e imágenes.
 */
final class FileUploadService
{
    private const GF_EXTENSIONS = ['pdf'];

    private const GC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'gif'];

    private const GC_MIMES = [
        'application/pdf',
        'application/x-pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
    ];

    public static function saveEvidence(array $file, int $userId, int $asignacionId, string $moduloCodigo = 'GF', string $expectedFormat = 'pdf'): array
    {
        $modulo = strtoupper(trim($moduloCodigo));
        self::validateEvidenceFile($file, $modulo, $expectedFormat);

        $base = App::storagePath('evidencias');
        $sub  = $base . DIRECTORY_SEPARATOR . $userId;
        if (!is_dir($sub) && !@mkdir($sub, 0775, true)) {
            App::error('No se pudo crear el directorio de almacenamiento.', 500);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeName = self::generateName($userId, $asignacionId, $ext);
        $finalPath = $sub . DIRECTORY_SEPARATOR . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $finalPath)) {
            App::error('Falló el guardado del archivo en el servidor.', 500);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($finalPath) ?: ($file['type'] ?: 'application/octet-stream');

        return [
            'nombre_original'   => $file['name'],
            'nombre_almacenado' => $safeName,
            'ruta_relativa'     => 'evidencias/' . $userId . '/' . $safeName,
            'mime_type'         => $detected,
            'tamano_bytes'      => (int) $file['size'],
        ];
    }

    public static function validateEvidenceFile(array $file, string $moduloCodigo = 'GF', ?string $expectedFormat = null): void
    {
        if ($expectedFormat !== null && trim($expectedFormat) !== '') {
            EvidenceFormatService::validateFile($file, $expectedFormat, $moduloCodigo);
            return;
        }

        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            App::error('No se recibió un archivo válido.', 400);
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            App::error('Error al subir el archivo (código ' . $file['error'] . ').', 400);
        }

        $max = SecurityConfigService::maxUploadBytes();
        if ((int) $file['size'] > $max) {
            App::error('El archivo excede el tamaño máximo permitido (' . round($max / 1048576, 1) . ' MB).', 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $modulo = strtoupper(trim($moduloCodigo));
        $allowed = $modulo === 'GC' ? self::GC_EXTENSIONS : self::GF_EXTENSIONS;

        if (!in_array($ext, $allowed, true)) {
            if ($modulo === 'GC') {
                App::error('Formato no permitido. GC acepta PDF, Word, Excel e imágenes (PNG, JPG, WEBP, GIF).', 400);
            }
            App::error('Solo se aceptan archivos PDF para evidencias GF.', 400);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($file['tmp_name']) ?: '';

        if ($modulo === 'GF') {
            if (!in_array($detected, ['application/pdf', 'application/x-pdf'], true)) {
                App::error('El archivo no parece ser un PDF válido.', 400);
            }
            $head = @file_get_contents($file['tmp_name'], false, null, 0, 5);
            if ($head === false || strncmp($head, '%PDF-', 5) !== 0) {
                App::error('El archivo no tiene cabecera PDF válida.', 400);
            }
            return;
        }

        if ($detected !== '' && !in_array($detected, self::GC_MIMES, true)) {
            App::error('El tipo de archivo no está permitido para evidencias GC.', 400);
        }

        if ($ext === 'pdf') {
            $head = @file_get_contents($file['tmp_name'], false, null, 0, 5);
            if ($head === false || strncmp($head, '%PDF-', 5) !== 0) {
                App::error('El PDF no tiene cabecera válida.', 400);
            }
        }
    }

    /** @deprecated use validateEvidenceFile */
    public static function validatePdf(array $file): void
    {
        self::validateEvidenceFile($file, 'GF');
    }

    public static function allowedExtensionsForModule(string $moduloCodigo): array
    {
        return strtoupper(trim($moduloCodigo)) === 'GC' ? self::GC_EXTENSIONS : self::GF_EXTENSIONS;
    }

    public static function acceptAttributeForFormat(string $format): string
    {
        return EvidenceFormatService::acceptAttribute($format);
    }

    /** @deprecated use acceptAttributeForFormat */
    public static function acceptAttributeForModule(string $moduloCodigo): string
    {
        if (strtoupper(trim($moduloCodigo)) === 'GC') {
            return '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*';
        }
        return 'application/pdf,.pdf';
    }

    private static function generateName(int $userId, int $asignacionId, string $ext): string
    {
        $rand = bin2hex(random_bytes(8));
        $safeExt = preg_replace('/[^a-z0-9]/', '', strtolower($ext)) ?: 'bin';
        return sprintf('u%d-a%d-%s-%s.%s', $userId, $asignacionId, date('Ymd_His'), $rand, $safeExt);
    }

    public static function absolutePath(string $relative): string
    {
        return App::storagePath(ltrim($relative, '/\\'));
    }

    public static function deleteRelativePath(?string $relative): void
    {
        if ($relative === null || trim($relative) === '') {
            return;
        }
        $abs = self::absolutePath($relative);
        if (is_file($abs)) {
            @unlink($abs);
        }
    }
}
