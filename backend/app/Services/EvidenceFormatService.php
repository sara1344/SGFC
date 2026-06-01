<?php
namespace App\Services;

use App\Config\App;

/**
 * Formatos permitidos por evidencia master (tipo_archivo).
 */
final class EvidenceFormatService
{
    public const PDF    = 'pdf';
    public const EXCEL  = 'excel';
    public const WORD   = 'word';
    public const IMAGEN = 'imagen';

    /** @var list<string> */
    public const ALL = [self::PDF, self::EXCEL, self::WORD, self::IMAGEN];

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            self::PDF    => 'PDF',
            self::EXCEL  => 'Excel',
            self::WORD   => 'Word',
            self::IMAGEN => 'Imagen',
        ];
    }

    public static function label(string $format): string
    {
        $f = self::normalize($format);
        return self::labels()[$f] ?? 'PDF';
    }

    public static function normalize(?string $value): string
    {
        $v = strtolower(trim((string) $value));
        $aliases = [
            'application/pdf' => self::PDF,
            'application/vnd.ms-excel' => self::EXCEL,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => self::EXCEL,
            'application/msword' => self::WORD,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => self::WORD,
            'image/png' => self::IMAGEN,
            'image/jpeg' => self::IMAGEN,
            'image/jpg' => self::IMAGEN,
            'image/webp' => self::IMAGEN,
            'image/gif' => self::IMAGEN,
        ];
        if (isset($aliases[$v])) {
            return $aliases[$v];
        }
        return in_array($v, self::ALL, true) ? $v : self::PDF;
    }

    /** @return list<string> */
    public static function allowedForModule(string $moduloCodigo): array
    {
        return self::isFinancialModule($moduloCodigo)
            ? [self::PDF]
            : self::ALL;
    }

    public static function isFinancialModule(string $moduloCodigo): bool
    {
        $c = strtoupper(trim($moduloCodigo));
        if ($c === 'GC' || str_contains($c, 'CONTRACTUAL')) {
            return false;
        }
        return $c === 'GF' || str_contains($c, 'FINANCIERA') || $c === '';
    }

    public static function normalizeModuleCode(string $moduloCodigo): string
    {
        return self::isFinancialModule($moduloCodigo) ? 'GF' : 'GC';
    }

    public static function isAllowedForModule(string $format, string $moduloCodigo): bool
    {
        $f = self::normalize($format);
        return in_array($f, self::allowedForModule($moduloCodigo), true);
    }

    /** @return list<string> */
    public static function extensions(string $format): array
    {
        return match (self::normalize($format)) {
            self::EXCEL  => ['xls', 'xlsx'],
            self::WORD   => ['doc', 'docx'],
            self::IMAGEN => ['png', 'jpg', 'jpeg', 'webp', 'gif'],
            default      => ['pdf'],
        };
    }

    /** @return list<string> */
    public static function mimeTypes(string $format): array
    {
        return match (self::normalize($format)) {
            self::EXCEL => [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
            self::WORD => [
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ],
            self::IMAGEN => [
                'image/png',
                'image/jpeg',
                'image/jpg',
                'image/webp',
                'image/gif',
            ],
            default => ['application/pdf', 'application/x-pdf'],
        };
    }

    public static function acceptAttribute(string $format): string
    {
        return match (self::normalize($format)) {
            self::EXCEL  => '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            self::WORD   => '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            self::IMAGEN => '.png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif',
            default      => 'application/pdf,.pdf',
        };
    }

    public static function validateFile(array $file, string $format, string $moduloCodigo = 'GF'): void
    {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            App::error('No se recibió un archivo válido.', 400);
        }
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            App::error('Error al subir el archivo (código ' . $file['error'] . ').', 400);
        }

        $normalized = self::normalize($format);
        $modulo = strtoupper(trim($moduloCodigo));
        if (!self::isAllowedForModule($normalized, $modulo)) {
            App::error('El formato configurado no es válido para evidencias ' . $modulo . '.', 400);
        }

        $max = SecurityConfigService::maxUploadBytes();
        if ((int) $file['size'] > $max) {
            App::error('El archivo excede el tamaño máximo permitido (' . round($max / 1048576, 1) . ' MB).', 400);
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowedExt = self::extensions($normalized);
        if (!in_array($ext, $allowedExt, true)) {
            App::error(
                'Formato incorrecto. Se espera un archivo ' . self::label($normalized) . '.',
                400
            );
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($file['tmp_name']) ?: '';
        $allowedMimes = self::mimeTypes($normalized);
        if ($detected !== '' && !in_array($detected, $allowedMimes, true)) {
            App::error('El tipo de archivo no coincide con el formato ' . self::label($normalized) . '.', 400);
        }

        if ($normalized === self::PDF) {
            $head = @file_get_contents($file['tmp_name'], false, null, 0, 5);
            if ($head === false || strncmp($head, '%PDF-', 5) !== 0) {
                App::error('El archivo no tiene cabecera PDF válida.', 400);
            }
        }
    }
}
