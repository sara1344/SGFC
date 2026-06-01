<?php
namespace App\Services;

use App\Config\App;
use App\Config\Database;

/**
 * Centraliza las reglas RLS lógico de SGFC.
 */
final class PermissionService
{
    public const STAFF_LABELS = ['Super Admin', 'Administrativo de Centro'];
    public const GLOBAL_STAFF_LABELS = ['Super Admin'];

    public static function isStaff(array $user): bool
    {
        return in_array($user['rol_label'] ?? '', self::STAFF_LABELS, true);
    }

    public static function isPrivileged(array $user): bool
    {
        return self::isStaff($user);
    }

    public static function isGlobalStaff(array $user): bool
    {
        return in_array($user['rol_label'] ?? '', self::GLOBAL_STAFF_LABELS, true);
    }

    public static function isSuperAdmin(array $user): bool
    {
        return ($user['rol_label'] ?? '') === 'Super Admin';
    }

    public static function isCenterAdmin(array $user): bool
    {
        return ($user['rol_label'] ?? '') === 'Administrativo de Centro';
    }

    public static function isContractor(array $user): bool
    {
        return ($user['rol_label'] ?? '') === 'Contratista';
    }

    public static function userCentroId(array $user): ?int
    {
        $id = (int) ($user['id_centro'] ?? 0);
        return $id > 0 ? $id : null;
    }

    public static function requireCentroId(array $user): int
    {
        $id = self::userCentroId($user);
        if ($id === null) {
            App::error('Su usuario no tiene un centro de formación asignado. Contacte al Super Admin.', 403);
        }
        return $id;
    }

    public static function personCentroId(int $personId): ?int
    {
        $db = Database::connection();
        $stmt = $db->prepare('SELECT id_centro FROM personas WHERE id_persona = :p LIMIT 1');
        $stmt->execute([':p' => $personId]);
        $id = $stmt->fetchColumn();
        return $id !== false && $id !== null ? (int) $id : null;
    }

    public static function personBelongsToCentro(int $personId, int $centroId): bool
    {
        return self::personCentroId($personId) === $centroId;
    }

    public static function contractBelongsToCentro(int $contractId, int $centroId): bool
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT 1 FROM contratos c
             JOIN personas p ON p.id_persona = c.id_persona
             WHERE c.id_contrato = :c AND p.id_centro = :cen LIMIT 1'
        );
        $stmt->execute([':c' => $contractId, ':cen' => $centroId]);
        return (bool) $stmt->fetchColumn();
    }

    public static function canAccessContract(array $user, int $idContrato): bool
    {
        if (self::isGlobalStaff($user)) {
            return true;
        }
        if (self::isCenterAdmin($user)) {
            return self::contractBelongsToCentro($idContrato, self::requireCentroId($user));
        }
        $db = Database::connection();
        $stmt = $db->prepare('SELECT 1 FROM contratos WHERE id_contrato = :c AND id_persona = :u LIMIT 1');
        $stmt->execute([':c' => $idContrato, ':u' => (int) $user['id']]);
        return (bool) $stmt->fetchColumn();
    }

    public static function canAccessPeriod(array $user, int $idPeriodo): bool
    {
        if (self::isGlobalStaff($user)) {
            return true;
        }
        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT c.id_persona, c.id_contrato FROM periodos p
             JOIN contratos c ON c.id_contrato = p.id_contrato
             WHERE p.id_periodo = :p LIMIT 1'
        );
        $stmt->execute([':p' => $idPeriodo]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }
        if (self::isCenterAdmin($user)) {
            return self::contractBelongsToCentro((int) $row['id_contrato'], self::requireCentroId($user));
        }
        return (int) $row['id_persona'] === (int) $user['id'];
    }

    public static function canAccessUpload(array $user, int $idUpload): bool
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            'SELECT u.id_persona, c.id_contrato
             FROM evidencias_uploads u
             JOIN evidencias_asignadas a ON a.id_asignacion = u.id_asignacion
             JOIN periodos pe ON pe.id_periodo = a.id_periodo
             JOIN contratos c ON c.id_contrato = pe.id_contrato
             WHERE u.id_upload = :u LIMIT 1'
        );
        $stmt->execute([':u' => $idUpload]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }
        if (self::isGlobalStaff($user)) {
            return true;
        }
        if (self::isCenterAdmin($user)) {
            return self::contractBelongsToCentro((int) $row['id_contrato'], self::requireCentroId($user));
        }
        return (int) $row['id_persona'] === (int) $user['id'];
    }

    public static function canManageUser(array $actor, array $target): bool
    {
        if (self::isSuperAdmin($actor)) {
            return true;
        }
        if (($target['nombre_perfil'] ?? '') === 'administrador') {
            return false;
        }
        if (self::isGlobalStaff($actor)) {
            return true;
        }
        if (!self::isCenterAdmin($actor)) {
            return false;
        }
        $centro = self::requireCentroId($actor);
        if (in_array($target['nombre_perfil'] ?? '', ['administrador', 'administrativo_centro'], true)) {
            return false;
        }
        return self::personBelongsToCentro((int) $target['id_persona'], $centro);
    }

    /** @param array<string,mixed> $params */
    public static function appendPersonCentroScope(string &$sql, array &$params, string $personaAlias, array $user): void
    {
        if (!self::isCenterAdmin($user)) {
            return;
        }
        $centro = self::requireCentroId($user);
        $sql .= " AND {$personaAlias}.id_centro = :__scope_centro";
        $params[':__scope_centro'] = $centro;
    }

    /** @param array<string,mixed> $params */
    public static function appendContractCentroScope(string &$sql, array &$params, array $user): void
    {
        if (!self::isCenterAdmin($user)) {
            return;
        }
        $centro = self::requireCentroId($user);
        $sql .= ' AND EXISTS (
            SELECT 1 FROM personas __p_scope
            WHERE __p_scope.id_persona = c.id_persona
              AND __p_scope.id_centro = :__scope_centro
        )';
        $params[':__scope_centro'] = $centro;
    }
}
