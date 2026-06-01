<?php
namespace App\Models;

/**
 * Notificaciones de SGFC.
 *
 * Tabla: notificaciones
 *   - id_persona      → destinatario
 *   - id_contratista  → contratista que originó la actividad (agrupadas)
 *   - fecha_creacion  → timestamp
 */
final class Notification extends Model
{
    protected string $table = 'notificaciones';
    protected string $primaryKey = 'id_notificacion';

    public function forUser(int $userId, ?string $tipo = null, bool $onlyUnread = false): array
    {
        $sql = "SELECT n.*,
                       CONCAT(pc.nombres, ' ', pc.Apellidos) AS contratista_nombre
                FROM notificaciones n
                LEFT JOIN personas pc ON pc.id_persona = n.id_contratista
                WHERE n.id_persona = :u";
        $params = [':u' => $userId];

        if ($tipo && $tipo !== 'No leídas') {
            if ($tipo === 'Actualización contratista') {
                $sql .= " AND n.tipo = :t";
                $params[':t'] = $tipo;
            } else {
                $sql .= " AND (
                    n.tipo = :t
                    OR EXISTS (
                        SELECT 1 FROM notificacion_detalles d
                        WHERE d.id_notificacion = n.id_notificacion AND d.tipo = :t2
                    )
                )";
                $params[':t'] = $tipo;
                $params[':t2'] = $tipo;
            }
        }

        if ($onlyUnread) {
            $sql .= " AND n.leida = 0";
        }

        $sql .= " ORDER BY n.fecha_creacion DESC LIMIT 200";
        return $this->query($sql, $params);
    }

    public function findForUser(int $id, int $userId): ?array
    {
        $sql = "SELECT n.*,
                       CONCAT(pc.nombres, ' ', pc.Apellidos) AS contratista_nombre
                FROM notificaciones n
                LEFT JOIN personas pc ON pc.id_persona = n.id_contratista
                WHERE n.id_notificacion = :id AND n.id_persona = :u
                LIMIT 1";
        return $this->one($sql, [':id' => $id, ':u' => $userId]);
    }

    public function findOpenContractorGroup(int $userId, int $contractorId): ?array
    {
        $sql = "SELECT * FROM notificaciones
                WHERE id_persona = :u AND id_contratista = :c AND leida = 0
                  AND tipo = 'Actualización contratista'
                ORDER BY fecha_creacion DESC
                LIMIT 1";
        return $this->one($sql, [':u' => $userId, ':c' => $contractorId]);
    }

    public function markRead(int $id, int $userId): bool
    {
        return $this->exec(
            "UPDATE notificaciones SET leida = 1 WHERE id_notificacion = :id AND id_persona = :u",
            [':id' => $id, ':u' => $userId]
        ) > 0;
    }

    public function markAllRead(int $userId): int
    {
        return $this->exec(
            "UPDATE notificaciones SET leida = 1 WHERE id_persona = :u AND leida = 0",
            [':u' => $userId]
        );
    }

    public function unreadCount(int $userId): int
    {
        $r = $this->one("SELECT COUNT(*) AS c FROM notificaciones WHERE id_persona = :u AND leida = 0", [':u' => $userId]);
        return (int) ($r['c'] ?? 0);
    }
}
