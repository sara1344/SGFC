<?php
namespace App\Models;

final class UnifiedPdf extends Model
{
    protected string $table = 'pdfs_unificados';
    protected string $primaryKey = 'id_pdf';

    public function findForPeriod(int $idPeriodo, int $idPersona, string $moduloCodigo = 'GF'): ?array
    {
        return $this->one(
            "SELECT * FROM pdfs_unificados WHERE id_periodo = :p AND id_persona = :u AND modulo_codigo = :m LIMIT 1",
            [':p' => $idPeriodo, ':u' => $idPersona, ':m' => $moduloCodigo]
        );
    }

    public function pendingForAdmin(): array
    {
        $sql = "SELECT pu.*, per.nombre_periodo AS periodo, c.id_contrato, c.area_aplicacion,
                       CONCAT(p.nombres,' ',p.Apellidos) AS contratista
                FROM pdfs_unificados pu
                JOIN periodos per ON per.id_periodo = pu.id_periodo
                JOIN contratos c  ON c.id_contrato = per.id_contrato
                JOIN personas p   ON p.id_persona  = pu.id_persona
                WHERE pu.estado = 'Enviado a administrativo'
                  AND pu.tipo_entregable = 'pdf'
                  AND pu.modulo_codigo = 'GF'
                ORDER BY pu.fecha_generado DESC";
        return $this->query($sql);
    }

    public function signed(): array
    {
        $sql = "SELECT pu.*, per.nombre_periodo AS periodo, c.id_contrato,
                       CONCAT(p.nombres,' ',p.Apellidos) AS contratista
                FROM pdfs_unificados pu
                JOIN periodos per ON per.id_periodo = pu.id_periodo
                JOIN contratos c  ON c.id_contrato = per.id_contrato
                JOIN personas p   ON p.id_persona  = pu.id_persona
                WHERE pu.tipo_entregable = 'pdf'
                  AND pu.modulo_codigo = 'GF'
                  AND pu.estado IN ('Firmado por administrativo','Enviado a contratista','Firmado por contratista','Finalizado')
                ORDER BY pu.fecha_firma_admin DESC";
        return $this->query($sql);
    }

    public function gcPackagesForAdmin(): array
    {
        $sql = "SELECT pu.*, per.nombre_periodo AS periodo, c.id_contrato,
                       CONCAT(p.nombres,' ',p.Apellidos) AS contratista
                FROM pdfs_unificados pu
                JOIN periodos per ON per.id_periodo = pu.id_periodo
                JOIN contratos c  ON c.id_contrato = per.id_contrato
                JOIN personas p   ON p.id_persona  = pu.id_persona
                WHERE pu.tipo_entregable = 'zip' AND pu.modulo_codigo = 'GC'
                ORDER BY pu.fecha_generado DESC";
        return $this->query($sql);
    }

    public function forContractor(int $idPersona): array
    {
        $sql = "SELECT pu.*, per.nombre_periodo AS periodo, c.id_contrato
                FROM pdfs_unificados pu
                JOIN periodos per ON per.id_periodo = pu.id_periodo
                JOIN contratos c ON c.id_contrato = per.id_contrato
                WHERE pu.id_persona = :u AND pu.tipo_entregable = 'pdf' AND pu.modulo_codigo = 'GF'
                ORDER BY pu.creado_en DESC";
        return $this->query($sql, [':u' => $idPersona]);
    }

    public function gcPackagesForContractor(int $idPersona): array
    {
        $sql = "SELECT pu.*, per.nombre_periodo AS periodo, c.id_contrato
                FROM pdfs_unificados pu
                JOIN periodos per ON per.id_periodo = pu.id_periodo
                JOIN contratos c ON c.id_contrato = per.id_contrato
                WHERE pu.id_persona = :u AND pu.tipo_entregable = 'zip' AND pu.modulo_codigo = 'GC'
                ORDER BY pu.creado_en DESC";
        return $this->query($sql, [':u' => $idPersona]);
    }
}
