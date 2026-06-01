<?php
namespace App\Models;

/**
 * Modelo de usuarios (tabla `personas` + join con `perfil`, `genero`).
 */
final class User extends Model
{
    protected string $table = 'personas';
    protected string $primaryKey = 'id_persona';

    public function findByLogin(string $usuario): ?array
    {
        $sql = "SELECT p.*, perf.nombre_perfil, perf.tipo_perfil,
                       cen.nombre AS centro_nombre, reg.id_regional, reg.nombre AS regional_nombre
                FROM personas p
                JOIN perfil perf ON perf.id_Perfil = p.id_perfil
                LEFT JOIN centros cen ON cen.id_centro = p.id_centro
                LEFT JOIN regionales reg ON reg.id_regional = cen.id_regional
                WHERE p.usuario = :u AND COALESCE(p.activo,1) = 1
                LIMIT 1";
        return $this->one($sql, [':u' => $usuario]);
    }

    public function listAll(?string $search = null, ?string $role = null, ?string $estado = null, ?int $idCentro = null): array
    {
        $sql = "SELECT p.id_persona, p.cedula, p.nombres, p.Apellidos, p.correo, p.usuario, p.activo,
                       p.id_centro, p.id_perfil, p.id_genero,
                       perf.nombre_perfil, perf.tipo_perfil,
                       cen.nombre AS centro_nombre,
                       reg.id_regional, reg.nombre AS regional_nombre,
                       (SELECT id_contrato FROM contratos c WHERE c.id_persona = p.id_persona AND c.estado='Activo' LIMIT 1) AS contrato_activo
                FROM personas p
                JOIN perfil perf ON perf.id_Perfil = p.id_perfil
                LEFT JOIN centros cen ON cen.id_centro = p.id_centro
                LEFT JOIN regionales reg ON reg.id_regional = cen.id_regional
                WHERE 1=1";
        $params = [];
        if ($idCentro !== null && $idCentro > 0) {
            $sql .= ' AND p.id_centro = :id_centro';
            $params[':id_centro'] = $idCentro;
        }
        if ($search) {
            $sql .= " AND (p.nombres LIKE :q OR p.Apellidos LIKE :q OR p.correo LIKE :q OR p.cedula LIKE :q OR p.usuario LIKE :q OR cen.nombre LIKE :q OR reg.nombre LIKE :q)";
            $params[':q'] = "%{$search}%";
        }
        if ($role) {
            $sql .= " AND perf.nombre_perfil = :rol";
            $params[':rol'] = $role;
        }
        if ($estado !== null && $estado !== '') {
            $sql .= " AND p.activo = :a";
            $params[':a'] = (int) $estado;
        }
        $sql .= " ORDER BY p.nombres ASC";
        return $this->query($sql, $params);
    }

    public function withRole(int $id): ?array
    {
        $sql = "SELECT p.*, perf.nombre_perfil, perf.tipo_perfil,
                       cen.nombre AS centro_nombre, reg.id_regional, reg.nombre AS regional_nombre
                FROM personas p
                JOIN perfil perf ON perf.id_Perfil = p.id_perfil
                LEFT JOIN centros cen ON cen.id_centro = p.id_centro
                LEFT JOIN regionales reg ON reg.id_regional = cen.id_regional
                WHERE p.id_persona = :id LIMIT 1";
        return $this->one($sql, [':id' => $id]);
    }

    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        $sql = "SELECT id_persona FROM personas WHERE correo = :e";
        $params = [':e' => $email];
        if ($excludeId) {
            $sql .= " AND id_persona <> :id";
            $params[':id'] = $excludeId;
        }
        return $this->one($sql, $params) !== null;
    }

    public function usernameExists(string $u, ?int $excludeId = null): bool
    {
        $sql = "SELECT id_persona FROM personas WHERE usuario = :u";
        $params = [':u' => $u];
        if ($excludeId) {
            $sql .= " AND id_persona <> :id";
            $params[':id'] = $excludeId;
        }
        return $this->one($sql, $params) !== null;
    }

    public function getSignatureImage(int $id): ?string
    {
        $row = $this->find($id);
        if (!$row) {
            return null;
        }
        $b64 = trim((string) ($row['firma_imagen_b64'] ?? ''));
        return $b64 !== '' ? $b64 : null;
    }

    public function saveSignatureImage(int $id, string $imagenB64): void
    {
        $this->update($id, ['firma_imagen_b64' => $imagenB64]);
    }
}
