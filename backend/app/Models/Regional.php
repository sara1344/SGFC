<?php
namespace App\Models;

/**
 * Catálogo de regionales SENA y sus centros de formación.
 */
final class Regional extends Model
{
    protected string $table = 'regionales';
    protected string $primaryKey = 'id_regional';

    /** @return list<array{id_regional:int,nombre:string,centros:list<array{id_centro:int,nombre:string}>}> */
    public function tree(): array
    {
        $rows = $this->query(
            "SELECT r.id_regional, r.nombre AS regional,
                    c.id_centro, c.nombre AS centro
             FROM regionales r
             LEFT JOIN centros c ON c.id_regional = r.id_regional AND c.activo = 1
             WHERE r.activo = 1
             ORDER BY r.nombre ASC, c.nombre ASC"
        );
        $map = [];
        foreach ($rows as $row) {
            $id = (int) $row['id_regional'];
            if (!isset($map[$id])) {
                $map[$id] = [
                    'id_regional' => $id,
                    'nombre'      => $row['regional'],
                    'centros'     => [],
                ];
            }
            if (!empty($row['id_centro'])) {
                $map[$id]['centros'][] = [
                    'id_centro' => (int) $row['id_centro'],
                    'nombre'    => $row['centro'],
                ];
            }
        }
        return array_values($map);
    }

    public function centroExists(int $idCentro): bool
    {
        return $this->one(
            'SELECT id_centro FROM centros WHERE id_centro = :id AND activo = 1 LIMIT 1',
            [':id' => $idCentro]
        ) !== null;
    }

    public function centroRegionalId(int $idCentro): ?int
    {
        $row = $this->one(
            'SELECT id_regional FROM centros WHERE id_centro = :id AND activo = 1 LIMIT 1',
            [':id' => $idCentro]
        );
        return $row ? (int) $row['id_regional'] : null;
    }
}
