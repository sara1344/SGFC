<?php
namespace App\Services;

use App\Config\App;
use App\Config\Database;
use App\Models\UnifiedPdf;
use ZipArchive;

/**
 * Empaqueta evidencias GC aprobadas en un ZIP (sin firma digital).
 */
final class ZipPackService
{
    /**
     * @return array{id_pdf:int, ruta_relativa:string, archivos:int}
     */
    public static function packGcForPeriod(int $idPeriodo, int $idContratista): array
    {
        if (!class_exists(ZipArchive::class)) {
            App::error('La extensión ZIP de PHP no está disponible en el servidor.', 500);
        }

        $db = Database::connection();

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

        $model = new UnifiedPdf();
        $existing = $model->findForPeriod($idPeriodo, $idContratista, 'GC');
        if ($existing && !empty($existing['ruta_unificado'])) {
            App::error('Ya se generó el paquete ZIP de evidencias GC para este periodo.', 400);
        }

        $sql = "SELECT a.id_asignacion, em.codigo, em.nombre,
                       (SELECT u.estado FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS estado,
                       (SELECT u.ruta_relativa FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ruta,
                       (SELECT u.nombre_original FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS nombre_original
                FROM evidencias_asignadas a
                JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
                JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
                JOIN modulos m   ON m.id_modulo = s.id_modulo
                WHERE a.id_periodo = :p AND m.codigo = 'GC'
                ORDER BY s.orden, em.orden";
        $stmt = $db->prepare($sql);
        $stmt->execute([':p' => $idPeriodo]);
        $rows = $stmt->fetchAll();

        if (!$rows) {
            App::error('No hay evidencias GC asignadas en este periodo.', 400);
        }

        $pendientes = array_filter($rows, fn($r) => ($r['estado'] ?? '') !== 'Aprobada');
        if (!empty($pendientes)) {
            $list = array_map(fn($r) => $r['codigo'] . ' (' . ($r['estado'] ?? 'sin cargar') . ')', $pendientes);
            App::error('No se puede generar el ZIP: evidencias GC pendientes. Faltan: '
                . implode(', ', array_slice($list, 0, 5)) . (count($list) > 5 ? '…' : ''), 400);
        }

        $base = App::storagePath('zip_paquetes/' . $idContratista);
        if (!is_dir($base) && !@mkdir($base, 0775, true)) {
            App::error('No se pudo crear el directorio de paquetes ZIP.', 500);
        }

        $fileName = self::generateZipFileName($idContratista, $periodo) . '.zip';
        $absPath  = $base . DIRECTORY_SEPARATOR . $fileName;
        $relPath  = 'zip_paquetes/' . $idContratista . '/' . $fileName;

        $zip = new ZipArchive();
        if ($zip->open($absPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            App::error('No se pudo crear el archivo ZIP.', 500);
        }

        $added = 0;
        foreach ($rows as $r) {
            if (empty($r['ruta'])) {
                continue;
            }
            $src = App::storagePath($r['ruta']);
            if (!is_file($src)) {
                App::logError('ZIP_PACK_FILE_NOT_FOUND', $src);
                continue;
            }
            $orig = (string) ($r['nombre_original'] ?: basename($src));
            $ext  = pathinfo($orig, PATHINFO_EXTENSION);
            $baseName = preg_replace('/[^\w\-\.]/', '_', (string) $r['codigo']) . '_' . preg_replace('/[^\w\-\. ]/', '_', pathinfo($orig, PATHINFO_FILENAME));
            $entry = $baseName . ($ext ? '.' . strtolower($ext) : '');
            $zip->addFile($src, $entry);
            $added++;
        }
        $zip->close();

        if ($added === 0) {
            @unlink($absPath);
            App::error('No se pudo incluir ningún archivo en el paquete ZIP.', 500);
        }

        $idPdf = $model->insert([
            'id_periodo'      => $idPeriodo,
            'id_persona'      => $idContratista,
            'modulo_codigo'   => 'GC',
            'tipo_entregable' => 'zip',
            'ruta_unificado'  => $relPath,
            'estado'          => 'Finalizado',
            'fecha_generado'  => date('Y-m-d H:i:s'),
        ]);

        $stmtNombre = $db->prepare("SELECT CONCAT(nombres, ' ', Apellidos) AS nombre FROM personas WHERE id_persona = :p LIMIT 1");
        $stmtNombre->execute([':p' => $idContratista]);
        $nombreContratista = (string) ($stmtNombre->fetchColumn() ?: 'Contratista');
        $periodoLabel = $periodo['nombre_periodo'] ?? ('periodo #' . $idPeriodo);

        NotificationService::notifyAdminsContractorActivity(
            $idContratista,
            $nombreContratista,
            'Paquete GC listo',
            'Evidencias GC empaquetadas en ZIP',
            "Paquete GC del {$periodoLabel} disponible para descarga.",
            '/views/administrativo-firmas.html?tab=gc-zip',
            'admin_zip_gc'
        );

        NotificationService::create(
            $idContratista,
            'Paquete GC generado',
            'ZIP de evidencias GC listo',
            "El paquete ZIP del {$periodoLabel} está disponible para descarga.",
            '/views/contratista-firmados.html?tab=gc-zip',
            'contractor_zip_gc'
        );

        AuditService::log('zip_pack_gc', 'pdfs_unificados', $idPdf, ['periodo' => $idPeriodo, 'archivos' => $added]);

        return [
            'id_pdf'        => $idPdf,
            'ruta_relativa' => $relPath,
            'archivos'      => $added,
        ];
    }

    private static function generateZipFileName(int $idPersona, array $periodo): string
    {
        $db = Database::connection();
        $stmt = $db->prepare('SELECT nombres, Apellidos FROM personas WHERE id_persona = :p LIMIT 1');
        $stmt->execute([':p' => $idPersona]);
        $person = $stmt->fetch() ?: [];
        $initials = self::initials((string) ($person['nombres'] ?? ''), (string) ($person['Apellidos'] ?? ''));

        $anio = (int) ($periodo['anio'] ?? date('Y'));
        $mes  = str_pad((string) (int) ($periodo['mes'] ?? date('n')), 2, '0', STR_PAD_LEFT);

        $stmt = $db->prepare("SELECT COUNT(*) FROM pdfs_unificados WHERE id_persona = :p AND modulo_codigo = 'GC'");
        $stmt->execute([':p' => $idPersona]);
        $seq = str_pad((string) ((int) $stmt->fetchColumn() + 1), 5, '0', STR_PAD_LEFT);

        return sprintf('%d-%s-%sGC%s', $anio, $mes, $initials, $seq);
    }

    private static function initials(string $nombres, string $apellidos): string
    {
        $parts = preg_split('/\s+/', trim($nombres . ' ' . $apellidos)) ?: [];
        $letters = '';
        foreach ($parts as $p) {
            if ($p !== '') {
                $letters .= mb_strtoupper(mb_substr($p, 0, 1));
            }
        }
        return $letters !== '' ? $letters : 'XX';
    }
}
