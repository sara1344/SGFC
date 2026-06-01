<?php
namespace App\Models;

final class NotificationDetail extends Model
{
    protected string $table = 'notificacion_detalles';
    protected string $primaryKey = 'id_detalle';

    public function forNotification(int $notificationId): array
    {
        return $this->query(
            "SELECT * FROM notificacion_detalles WHERE id_notificacion = :n ORDER BY fecha_creacion DESC",
            [':n' => $notificationId]
        );
    }

    public function tiposForNotification(int $notificationId): array
    {
        $rows = $this->query(
            "SELECT DISTINCT tipo FROM notificacion_detalles WHERE id_notificacion = :n",
            [':n' => $notificationId]
        );
        return array_column($rows, 'tipo');
    }
}
