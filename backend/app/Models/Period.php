<?php
namespace App\Models;

use App\Config\Database;

final class Period extends Model
{
    protected string $table = 'periodos';
    protected string $primaryKey = 'id_periodo';

    public function listByContract(int $idContrato): array
    {
        $sql = "SELECT p.* FROM periodos p
                WHERE p.id_contrato = :c
                ORDER BY p.anio ASC, p.mes ASC";
        return $this->query($sql, [':c' => $idContrato]);
    }

    public function currentForContract(int $idContrato): ?array
    {
        $mes = (int) date('n');
        $anio = (int) date('Y');
        $row = $this->one("SELECT * FROM periodos WHERE id_contrato = :c AND mes = :m AND anio = :y LIMIT 1",
            [':c' => $idContrato, ':m' => $mes, ':y' => $anio]);
        if ($row) {
            return $row;
        }
        // Fallback: el periodo más reciente NO bloqueado
        return $this->one("SELECT * FROM periodos WHERE id_contrato = :c AND estado <> 'Bloqueado'
                           ORDER BY anio DESC, mes DESC LIMIT 1", [':c' => $idContrato]);
    }

    public function updateAvance(int $idPeriodo): void
    {
        $sql = "UPDATE periodos p
                SET p.avance = (
                  SELECT COALESCE(ROUND(SUM(CASE WHEN u.estado='Aprobada' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.id_asignacion),0)),0)
                  FROM evidencias_asignadas a
                  LEFT JOIN evidencias_uploads u
                    ON u.id_asignacion = a.id_asignacion
                   AND u.id_upload = (SELECT MAX(id_upload) FROM evidencias_uploads WHERE id_asignacion = a.id_asignacion)
                  WHERE a.id_periodo = p.id_periodo
                )
                WHERE p.id_periodo = :id";
        $this->exec($sql, [':id' => $idPeriodo]);
    }

    /** Periodo con firmas de administrativo y contratista: evidencias no editables. */
    public function isAssignmentLocked(int $idPeriodo): bool
    {
        $period = $this->find($idPeriodo);
        if (!$period) {
            return false;
        }
        if (($period['estado'] ?? '') === 'Firmado') {
            return true;
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT c.id_persona FROM periodos pe
             JOIN contratos c ON c.id_contrato = pe.id_contrato
             WHERE pe.id_periodo = :p LIMIT 1'
        );
        $stmt->execute([':p' => $idPeriodo]);
        $ownerId = (int) ($stmt->fetchColumn() ?: 0);
        if ($ownerId <= 0) {
            return false;
        }

        $pdf = (new UnifiedPdf())->findForPeriod($idPeriodo, $ownerId, 'GF');
        if (!$pdf) {
            return false;
        }

        if (in_array($pdf['estado'] ?? '', ['Finalizado', 'Firmado por contratista'], true)) {
            return true;
        }

        return !empty($pdf['ruta_firmado_admin']) && !empty($pdf['ruta_firmado_final']);
    }

    public function hasEvidenceAssignment(int $idPeriodo): bool
    {
        $row = $this->one(
            'SELECT COUNT(*) AS c FROM evidencias_asignadas WHERE id_periodo = :p',
            [':p' => $idPeriodo]
        );
        return ((int) ($row['c'] ?? 0)) > 0;
    }

    /** Ventana de edición: desde fecha_apertura hasta 5 días antes de fecha_limite (exclusive los últimos 5 días). */
    public function getEvidenceEditWindow(int $idPeriodo): array
    {
        $period = $this->find($idPeriodo);
        if (!$period || empty($period['fecha_limite'])) {
            return [
                'activa'           => false,
                'desde'            => null,
                'hasta'            => null,
                'fecha_limite'     => null,
                'bloqueado_desde'  => null,
                'motivo'           => 'sin_fecha_limite',
                'sin_fecha_limite' => empty($period['fecha_limite'] ?? null),
            ];
        }

        $deadline = new \DateTimeImmutable(substr((string) $period['fecha_limite'], 0, 10));
        $ultimoDiaEditable = $deadline->modify('-5 days');

        if (!empty($period['fecha_apertura'])) {
            $inicio = new \DateTimeImmutable(substr((string) $period['fecha_apertura'], 0, 10));
        } else {
            $inicio = \DateTimeImmutable::createFromFormat(
                'Y-n-j',
                sprintf('%d-%d-1', (int) $period['anio'], (int) $period['mes'])
            ) ?: $ultimoDiaEditable;
        }

        $today = new \DateTimeImmutable('today');
        $activa = false;
        $motivo = 'cerrada';

        if ($today < $inicio) {
            $motivo = 'antes_apertura';
        } elseif ($today > $ultimoDiaEditable) {
            $motivo = 'ultimos_cinco_dias';
        } else {
            $activa = true;
            $motivo = 'activa';
        }

        return [
            'activa'           => $activa,
            'desde'            => $inicio->format('Y-m-d'),
            'hasta'            => $ultimoDiaEditable->format('Y-m-d'),
            'fecha_limite'     => $deadline->format('Y-m-d'),
            'bloqueado_desde'  => $ultimoDiaEditable->modify('+1 day')->format('Y-m-d'),
            'motivo'           => $motivo,
            'sin_fecha_limite' => false,
        ];
    }

    public function isWithinEvidenceEditWindow(int $idPeriodo): bool
    {
        return $this->getEvidenceEditWindow($idPeriodo)['activa'];
    }
}
