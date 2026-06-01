<?php
namespace App\Models;

final class Review extends Model
{
    protected string $table = 'revisiones';
    protected string $primaryKey = 'id_revision';

    public function historyByUpload(int $idUpload): array
    {
        $sql = "SELECT r.*, CONCAT(p.nombres,' ',p.Apellidos) AS revisor
                FROM revisiones r
                JOIN personas p ON p.id_persona = r.id_revisor
                WHERE r.id_upload = :u
                ORDER BY r.creado_en ASC";
        return $this->query($sql, [':u' => $idUpload]);
    }
}
