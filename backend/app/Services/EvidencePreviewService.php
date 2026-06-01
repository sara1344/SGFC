<?php
namespace App\Services;

use App\Config\App;
use PhpOffice\PhpSpreadsheet\IOFactory as SpreadsheetIOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Html as SpreadsheetHtmlWriter;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;

/**
 * Convierte evidencias Office a HTML para vista previa en el navegador.
 */
final class EvidencePreviewService
{
    public static function streamHtmlPreview(array $upload): never
    {
        $path = FileUploadService::absolutePath((string) ($upload['ruta_relativa'] ?? ''));
        if (!is_file($path)) {
            App::error('Archivo no disponible.', 404);
        }

        $name = (string) ($upload['nombre_original'] ?? basename($path));
        $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        try {
            $body = match (true) {
                in_array($ext, ['xls', 'xlsx'], true) => self::excelToHtml($path),
                $ext === 'docx' => self::wordToHtml($path),
                $ext === 'doc'  => self::legacyDocMessage($name),
                default         => self::unsupportedMessage($name),
            };
        } catch (\Throwable $e) {
            App::logError('EVIDENCE_PREVIEW', $e->getMessage());
            $body = self::errorMessage($name, 'No se pudo generar la vista previa de este archivo.');
        }

        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: private, max-age=0, no-cache');
        header('X-Frame-Options: SAMEORIGIN');
        echo self::wrapHtml($body, $name);
        exit;
    }

    private static function excelToHtml(string $path): string
    {
        $spreadsheet = SpreadsheetIOFactory::load($path);
        $writer = new SpreadsheetHtmlWriter($spreadsheet);
        $writer->setEmbedImages(true);
        $writer->setUseInlineCss(true);

        ob_start();
        $writer->save('php://output');
        $tableHtml = ob_get_clean();

        $sheetCount = $spreadsheet->getSheetCount();
        $title = htmlspecialchars($spreadsheet->getActiveSheet()->getTitle(), ENT_QUOTES, 'UTF-8');
        $meta = $sheetCount > 1
            ? "<p class=\"meta\">Hoja activa: <strong>{$title}</strong> ({$sheetCount} hojas en el libro)</p>"
            : '';

        return $meta . '<div class="sheet-wrap">' . $tableHtml . '</div>';
    }

    private static function wordToHtml(string $path): string
    {
        $phpWord = WordIOFactory::load($path);
        $writer = WordIOFactory::createWriter($phpWord, 'HTML');

        ob_start();
        $writer->save('php://output');
        return ob_get_clean();
    }

    private static function legacyDocMessage(string $name): string
    {
        $safe = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        return '<div class="notice"><strong>Formato .doc</strong><p>La vista previa en línea solo está disponible para archivos .docx. Descargue <em>' . $safe . '</em> para abrirlo en Word.</p></div>';
    }

    private static function unsupportedMessage(string $name): string
    {
        $safe = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        return '<div class="notice"><strong>Vista previa no disponible</strong><p>No hay conversión para <em>' . $safe . '</em>. Utilice el botón Descargar.</p></div>';
    }

    private static function errorMessage(string $name, string $msg): string
    {
        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        $safeMsg  = htmlspecialchars($msg, ENT_QUOTES, 'UTF-8');
        return '<div class="notice error"><strong>Error</strong><p>' . $safeMsg . '</p><p class="file">' . $safeName . '</p></div>';
    }

    private static function wrapHtml(string $body, string $title): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>Vista previa — ' . $safeTitle . '</title>'
            . '<style>'
            . 'body{margin:0;padding:16px 18px 24px;font-family:"Work Sans",Calibri,system-ui,sans-serif;font-size:13px;color:#334155;background:#fff;}'
            . '.meta{margin:0 0 12px;font-size:12px;color:#64748b;}'
            . '.sheet-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#f8fafc;}'
            . 'table{border-collapse:collapse;width:100%;background:#fff;}'
            . 'td,th{border:1px solid #e2e8f0;padding:6px 8px;font-size:12px;vertical-align:top;}'
            . 'th{background:#eff6ff;color:#00304d;font-weight:700;}'
            . '.notice{padding:20px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;}'
            . '.notice.error{background:#fef2f2;border-color:#fecaca;color:#991b1b;}'
            . '.notice p{margin:8px 0 0;color:#64748b;line-height:1.5;}'
            . '.notice .file{font-size:11px;color:#94a3b8;}'
            . 'img{max-width:100%;height:auto;}'
            . '</style></head><body>' . $body . '</body></html>';
    }
}
