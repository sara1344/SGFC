<?php
namespace App\Models;

/**
 * Asignación de evidencias a un periodo / contrato.
 */
final class EvidenceAssignment extends Model
{
    protected string $table = 'evidencias_asignadas';
    protected string $primaryKey = 'id_asignacion';

    public function listForPeriod(int $idPeriodo): array
    {
        $sql = "SELECT a.id_asignacion, a.obligatoria AS asign_obligatoria, a.orden AS asign_orden,
                       em.id_evidencia_master, em.codigo, em.nombre, em.descripcion, em.obligatoria,
                       em.tipo_archivo, em.tamano_max_mb, em.orden AS evid_orden,
                       s.id_subgrupo, s.codigo AS subgrupo_codigo, s.nombre AS subgrupo_nombre, s.icono,
                       m.id_modulo, m.codigo AS modulo_codigo, m.nombre AS modulo_nombre, m.color_hex AS modulo_color,
                       (SELECT id_upload FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ultimo_upload_id,
                       (SELECT estado FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ultimo_estado,
                       (SELECT nombre_original FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ultimo_archivo,
                       (SELECT creado_en FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC, u.id_upload DESC LIMIT 1) AS ultimo_fecha,
                       (SELECT comentario FROM revisiones r
                          JOIN evidencias_uploads u ON u.id_upload = r.id_upload
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY r.id_revision DESC LIMIT 1) AS ultimo_comentario,
                       (SELECT version FROM evidencias_uploads u
                          WHERE u.id_asignacion = a.id_asignacion
                          ORDER BY u.version DESC LIMIT 1) AS version
                FROM evidencias_asignadas a
                JOIN evidencias_master em ON em.id_evidencia_master = a.id_evidencia_master
                JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
                JOIN modulos m   ON m.id_modulo = s.id_modulo
                WHERE a.id_periodo = :p
                ORDER BY m.orden, s.orden, em.orden";
        return $this->query($sql, [':p' => $idPeriodo]);
    }
}
