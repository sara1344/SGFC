<?php
namespace App\Models;

final class PeriodExtension extends Model
{
    protected string $table = 'periodo_prorrogas';
    protected string $primaryKey = 'id_prorroga';

    public function latestForPeriod(int $periodId): ?array
    {
        return $this->one(
            'SELECT * FROM periodo_prorrogas WHERE id_periodo = :p ORDER BY fecha_solicitud DESC, id_prorroga DESC LIMIT 1',
            [':p' => $periodId]
        );
    }

    public function pendingForPeriod(int $periodId): ?array
    {
        return $this->one(
            "SELECT * FROM periodo_prorrogas WHERE id_periodo = :p AND estado = 'Pendiente' ORDER BY fecha_solicitud DESC LIMIT 1",
            [':p' => $periodId]
        );
    }

    public function detail(int $id): ?array
    {
        return $this->one(
            'SELECT pr.*, pe.nombre_periodo, pe.fecha_limite AS periodo_fecha_limite,
                    CONCAT(pc.nombres, \' \', pc.Apellidos) AS contratista_nombre,
                    CONCAT(pa.nombres, \' \', pa.Apellidos) AS admin_nombre
             FROM periodo_prorrogas pr
             JOIN periodos pe ON pe.id_periodo = pr.id_periodo
             JOIN personas pc ON pc.id_persona = pr.id_contratista
             LEFT JOIN personas pa ON pa.id_persona = pr.id_responde
             WHERE pr.id_prorroga = :id LIMIT 1',
            [':id' => $id]
        );
    }
}
