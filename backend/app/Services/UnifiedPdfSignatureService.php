<?php
namespace App\Services;

use App\Config\App;
use App\Models\UnifiedPdf;
use App\Models\User;

/**
 * Metadatos y validación para firmar PDFs unificados GF (admin / contratista).
 */
final class UnifiedPdfSignatureService
{
    /** @return array<string,mixed> */
    public static function signatureMeta(int $idPdf, array $user, string $expectedRole): array
    {
        $row = (new UnifiedPdf())->find($idPdf);
        if (!$row) {
            App::error('PDF no encontrado.', 404);
        }
        if (($row['tipo_entregable'] ?? 'pdf') !== 'pdf' || ($row['modulo_codigo'] ?? 'GF') !== 'GF') {
            App::error('Este documento no admite firma sobre PDF.', 400);
        }

        self::assertCanSign($row, $user, $expectedRole);

        if (empty($row['periodo'])) {
            $db = \App\Config\Database::connection();
            $stmt = $db->prepare('SELECT nombre_periodo FROM periodos WHERE id_periodo = :p LIMIT 1');
            $stmt->execute([':p' => (int) ($row['id_periodo'] ?? 0)]);
            $row['periodo'] = (string) ($stmt->fetchColumn() ?: '');
        }

        $sourceRel = self::sourceRelForRole($row, $expectedRole);
        if ($sourceRel === null || trim($sourceRel) === '') {
            App::error('Aún no hay un PDF disponible para firmar.', 404);
        }

        $abs = App::storagePath($sourceRel);
        if (!is_file($abs)) {
            App::error('Archivo PDF no disponible.', 404);
        }

        $probe = PdfMergeService::probePdfForSigning($abs);
        $users = new User();

        return [
            'id_pdf'              => $idPdf,
            'rol'                 => $expectedRole,
            'page_count'          => $probe['page_count'],
            'pdf_firmable'        => $probe['stampable'],
            'pdf_firma_aviso'     => $probe['reason'],
            'tiene_firma_usuario' => $users->getSignatureImage((int) $user['id']) !== null,
            'titulo'              => self::titleForRow($row),
            'default_page'        => $expectedRole === 'Contratista' ? $probe['page_count'] : 1,
        ];
    }

    /** @param array<string,mixed> $data @return array<string,float|int>|null */
    public static function parsePlacement(array $data, int $pageCount): ?array
    {
        if (!isset($data['pagina'], $data['x_pct'], $data['y_pct'], $data['w_pct'], $data['h_pct'])) {
            return null;
        }

        $page = max(1, (int) $data['pagina']);
        if ($page > $pageCount) {
            App::error('Página inválida para la firma.', 422);
        }

        return [
            'pagina' => $page,
            'x_pct'  => self::clampPct((float) $data['x_pct']),
            'y_pct'  => self::clampPct((float) $data['y_pct']),
            'w_pct'  => self::clampPct((float) $data['w_pct'], 3, 60),
            'h_pct'  => self::clampPct((float) $data['h_pct'], 2, 40),
        ];
    }

    /** @param array<string,mixed> $row */
    private static function assertCanSign(array $row, array $user, string $expectedRole): void
    {
        if ($expectedRole === 'Administrativo') {
            if (!PermissionService::isPrivileged($user)) {
                App::error('No autorizado.', 403);
            }
            if (($row['estado'] ?? '') !== 'Enviado a administrativo') {
                App::error('Este PDF no está pendiente de firma administrativa.', 400);
            }
            return;
        }

        if ((int) ($row['id_persona'] ?? 0) !== (int) ($user['id'] ?? 0)) {
            App::error('Este PDF no le pertenece.', 403);
        }
        if (!in_array($row['estado'] ?? '', ['Firmado por administrativo', 'Enviado a contratista'], true)) {
            App::error('El PDF aún no fue firmado por el administrativo.', 400);
        }
    }

    /** @param array<string,mixed> $row */
    private static function sourceRelForRole(array $row, string $role): ?string
    {
        return match ($role) {
            'Administrativo' => $row['ruta_unificado'] ?? null,
            'Contratista'    => $row['ruta_firmado_admin'] ?: ($row['ruta_unificado'] ?? null),
            default          => null,
        };
    }

    /** @param array<string,mixed> $row */
    private static function titleForRow(array $row): string
    {
        $periodo = trim((string) ($row['periodo'] ?? ''));
        if ($periodo !== '') {
            return 'PDF GF — ' . $periodo;
        }
        return 'PDF GF unificado';
    }

    private static function clampPct(float $value, float $min = 0, float $max = 95): float
    {
        return round(max($min, min($max, $value)), 4);
    }
}
