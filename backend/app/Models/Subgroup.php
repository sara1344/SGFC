<?php
namespace App\Models;

final class Subgroup extends Model
{
    protected string $table = 'subgrupos';
    protected string $primaryKey = 'id_subgrupo';

    public function ofModule(int $idModulo): array
    {
        return $this->query(
            "SELECT * FROM subgrupos WHERE id_modulo = :m AND activo = 1 ORDER BY orden",
            [':m' => $idModulo]
        );
    }
}
