<?php
namespace App\Models;

final class EvidenceUpload extends Model
{
    protected string $table = 'evidencias_uploads';
    protected string $primaryKey = 'id_upload';

    public function detail(int $id): ?array
    {
        $sql = "SELECT u.*, a.id_periodo,
                       em.codigo AS evidencia_codigo, em.nombre AS evidencia_nombre,
                       s.nombre AS subgrupo_nombre, m.codigo AS modulo_codigo,
                       per.id_contrato, per.nombre_periodo,
                       p.nombres, p.Apellidos, p.correo, p.id_persona AS contratista_id
                FROM evidencias_uploads u
                JOIN evidencias_asignadas a ON a.id_asignacion = u.id_asignacion
                JOIN evidencias_master em   ON em.id_evidencia_master = a.id_evidencia_master
                JOIN subgrupos s   ON s.id_subgrupo = em.id_subgrupo
                JOIN modulos m     ON m.id_modulo = s.id_modulo
                JOIN periodos per  ON per.id_periodo = a.id_periodo
                JOIN personas p    ON p.id_persona = u.id_persona
                WHERE u.id_upload = :id";
        return $this->one($sql, [':id' => $id]);
    }

    public function listByEstado(string $estado, ?int $contratoId = null, ?int $contratistaId = null, ?string $modulo = null, ?int $idCentro = null): array
    {
        $sql = "SELECT u.id_upload, u.estado, u.creado_en AS fecha, u.version,
                       u.mime_type, u.nombre_original, em.tipo_archivo,
                       em.codigo AS evidencia_codigo, em.nombre AS evidencia_nombre,
                       s.nombre AS subgrupo_nombre, m.codigo AS modulo_codigo, m.nombre AS modulo_nombre,
                       per.id_periodo, per.nombre_periodo AS periodo, per.avance AS periodo_avance,
                       p.id_persona, CONCAT(p.nombres,' ',p.Apellidos) AS contratista,
                       c.id_contrato, c.area_aplicacion
                FROM evidencias_uploads u
                JOIN evidencias_asignadas a ON a.id_asignacion = u.id_asignacion
                JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
                JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
                JOIN modulos m   ON m.id_modulo = s.id_modulo
                JOIN periodos per ON per.id_periodo = a.id_periodo
                JOIN contratos c ON c.id_contrato = per.id_contrato
                JOIN personas p ON p.id_persona = u.id_persona
                WHERE u.estado = :e
                  AND u.id_upload = (
                      SELECT u2.id_upload FROM evidencias_uploads u2
                      WHERE u2.id_asignacion = a.id_asignacion
                      ORDER BY u2.id_upload DESC
                      LIMIT 1
                  )";
        $params = [':e' => $estado];
        if ($contratoId)   { $sql .= " AND c.id_contrato = :ct"; $params[':ct'] = $contratoId; }
        if ($contratistaId){ $sql .= " AND p.id_persona = :p";   $params[':p']  = $contratistaId; }
        if ($modulo)       { $sql .= " AND m.codigo = :mo";       $params[':mo'] = $modulo; }
        if ($idCentro !== null && $idCentro > 0) {
            $sql .= ' AND p.id_centro = :id_centro';
            $params[':id_centro'] = $idCentro;
        }
        $sql .= " ORDER BY u.creado_en DESC";
        return $this->query($sql, $params);
    }
}
