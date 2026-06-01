<?php
namespace App\Models;

/**
 * Catálogo MASTER de evidencias (tipos que el contratista puede subir).
 */
final class Evidence extends Model
{
    protected string $table = 'evidencias_master';
    protected string $primaryKey = 'id_evidencia_master';

    public function tree(): array
    {
        $modulos = $this->query("SELECT * FROM modulos WHERE activo=1 ORDER BY orden");
        foreach ($modulos as &$m) {
            $m['subgrupos'] = $this->query(
                "SELECT * FROM subgrupos WHERE id_modulo = :m AND activo=1 ORDER BY orden",
                [':m' => $m['id_modulo']]
            );
            foreach ($m['subgrupos'] as &$s) {
                $s['evidencias'] = $this->query(
                    "SELECT * FROM evidencias_master WHERE id_subgrupo = :s AND activo=1 ORDER BY orden",
                    [':s' => $s['id_subgrupo']]
                );
            }
        }
        return $modulos;
    }

    public function flat(): array
    {
        return $this->query(
            "SELECT em.*, s.nombre AS subgrupo_nombre, s.codigo AS subgrupo_codigo,
                    m.codigo AS modulo_codigo, m.nombre AS modulo_nombre, m.color_hex AS modulo_color
             FROM evidencias_master em
             JOIN subgrupos s ON s.id_subgrupo = em.id_subgrupo
             JOIN modulos m   ON m.id_modulo = s.id_modulo
             WHERE em.activo=1
             ORDER BY m.orden, s.orden, em.orden"
        );
    }
}
