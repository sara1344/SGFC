<?php
namespace App\Models;

final class Signature extends Model
{
    protected string $table = 'firmas';
    protected string $primaryKey = 'id_firma';

    public function listForPdf(int $idPdf): array
    {
        return $this->query("SELECT * FROM firmas WHERE id_pdf = :p ORDER BY creado_en ASC", [':p' => $idPdf]);
    }
}
