<?php
namespace App\Models;

use App\Helpers\IpHelper;

/**
 * Auditoría / log de accesos y acciones críticas.
 * Tabla: log_accesos (de la BD original).
 */
final class AuditLog extends Model
{
    protected string $table = 'log_accesos';
    protected string $primaryKey = 'id_log';

    public function recent(int $limit = 100): array
    {
        return $this->listFiltered([], $limit);
    }

    /**
     * @param array{fecha?:string,accion?:string,nombre?:string} $filters
     */
    public function listFiltered(array $filters, int $limit = 200): array
    {
        $sql = "SELECT a.id_log, a.id_persona, a.usuario, a.accion, a.entidad, a.entidad_id,
                       a.detalles, a.ip, a.user_agent, a.fecha AS creado_en,
                       CONCAT(p.nombres,' ',p.Apellidos) AS persona, perf.nombre_perfil AS rol
                FROM log_accesos a
                LEFT JOIN personas p   ON p.id_persona = a.id_persona
                LEFT JOIN perfil   perf ON perf.id_Perfil = p.id_perfil
                WHERE 1=1";
        $params = [];

        $fecha = trim((string) ($filters['fecha'] ?? ''));
        if ($fecha !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            $sql .= " AND DATE(a.fecha) = :fecha";
            $params[':fecha'] = $fecha;
        }

        $accion = trim((string) ($filters['accion'] ?? ''));
        if ($accion !== '') {
            $sql .= " AND a.accion = :accion";
            $params[':accion'] = $accion;
        }

        $nombre = trim((string) ($filters['nombre'] ?? ''));
        if ($nombre !== '') {
            $pattern = '%' . $nombre . '%';
            $sql .= " AND (
                p.nombres LIKE :nom1 OR p.Apellidos LIKE :nom2 OR a.usuario LIKE :nom3
                OR CONCAT(p.nombres,' ',p.Apellidos) LIKE :nom4
            )";
            $params[':nom1'] = $pattern;
            $params[':nom2'] = $pattern;
            $params[':nom3'] = $pattern;
            $params[':nom4'] = $pattern;
        }

        $sql .= " ORDER BY a.id_log DESC LIMIT " . max(1, min(500, $limit));
        $rows = $this->query($sql, $params);
        foreach ($rows as &$row) {
            $row['ip'] = IpHelper::toIpv4($row['ip'] ?? null) ?? '';
        }
        unset($row);
        return $rows;
    }

    /** @return list<string> */
    public function distinctAcciones(): array
    {
        $rows = $this->query(
            "SELECT DISTINCT accion FROM log_accesos WHERE accion IS NOT NULL AND accion != '' ORDER BY accion"
        );
        return array_column($rows, 'accion');
    }

    /** @return array{total:int,hoy:int,logins_hoy:int,fallos_hoy:int} */
    public function summary(): array
    {
        $db = \App\Config\Database::connection();
        $total = (int) $db->query('SELECT COUNT(*) FROM log_accesos')->fetchColumn();
        $hoy = (int) $db->query("SELECT COUNT(*) FROM log_accesos WHERE DATE(fecha) = CURDATE()")->fetchColumn();
        $logins = (int) $db->query("SELECT COUNT(*) FROM log_accesos WHERE DATE(fecha) = CURDATE() AND accion = 'login_ok'")->fetchColumn();
        $fallos = (int) $db->query("SELECT COUNT(*) FROM log_accesos WHERE DATE(fecha) = CURDATE() AND accion = 'login_failed'")->fetchColumn();
        return [
            'total'       => $total,
            'hoy'         => $hoy,
            'logins_hoy'  => $logins,
            'fallos_hoy'  => $fallos,
        ];
    }

    /**
     * @param array{fecha?:string,accion?:string,nombre?:string} $filters
     * @return list<array<string,mixed>>
     */
    public function listForExport(array $filters, int $limit = 5000): array
    {
        return $this->listFiltered($filters, $limit);
    }
}
