<?php
namespace App\Models;

final class SystemConfig extends Model
{
    protected string $table = 'configuracion_sistema';
    protected string $primaryKey = 'grupo';

    public function getGroup(string $grupo): ?array
    {
        $row = $this->one(
            'SELECT grupo, datos, actualizado_en, actualizado_por FROM configuracion_sistema WHERE grupo = :g LIMIT 1',
            [':g' => $grupo]
        );
        if (!$row) {
            return null;
        }
        $datos = json_decode((string) $row['datos'], true);
        $row['datos'] = is_array($datos) ? $datos : [];
        return $row;
    }

    public function saveGroup(string $grupo, array $datos, ?int $userId = null): void
    {
        $json = json_encode($datos, JSON_UNESCAPED_UNICODE);
        $existing = $this->getGroup($grupo);
        if ($existing) {
            $this->exec(
                'UPDATE configuracion_sistema SET datos = :d, actualizado_por = :u WHERE grupo = :g',
                [':d' => $json, ':u' => $userId, ':g' => $grupo]
            );
            return;
        }
        $this->exec(
            'INSERT INTO configuracion_sistema (grupo, datos, actualizado_por) VALUES (:g, :d, :u)',
            [':g' => $grupo, ':d' => $json, ':u' => $userId]
        );
    }
}
