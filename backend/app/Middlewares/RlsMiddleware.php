<?php
namespace App\Middlewares;

use App\Config\App;
use App\Services\PermissionService;

/**
 * Row Level Security lógico para SGFC.
 *
 * Aunque MySQL no tiene RLS nativo como Postgres, este middleware centraliza la
 * validación de propiedad sobre los registros.  Por ejemplo:
 *
 *   - Un contratista solo puede ver/cargar evidencias de SUS contratos.
 *   - Un administrativo no puede ver datos del Super Admin.
 *
 * Cada controlador llama a estos métodos antes de devolver datos.
 */
final class RlsMiddleware
{
    /** Valida que el contrato pertenezca al usuario autenticado (si es contratista). */
    public static function ownsContract(int $idContrato): void
    {
        $user = AuthMiddleware::check();
        if (!PermissionService::canAccessContract($user, $idContrato)) {
            App::error('No tiene permiso para acceder a este contrato.', 403);
        }
    }

    /** Valida que el periodo pertenezca al contrato del usuario autenticado. */
    public static function ownsPeriod(int $idPeriodo): void
    {
        $user = AuthMiddleware::check();
        if (!PermissionService::canAccessPeriod($user, $idPeriodo)) {
            App::error('No tiene permiso para acceder a este periodo.', 403);
        }
    }

    /** Valida que el upload pertenezca al usuario autenticado o sea revisable por él. */
    public static function ownsOrReviewsUpload(int $idUpload): void
    {
        $user = AuthMiddleware::check();
        if (!PermissionService::canAccessUpload($user, $idUpload)) {
            App::error('No tiene permiso para acceder a este documento.', 403);
        }
    }

    /** Aplica RLS automáticamente en una consulta lista de contratos. */
    public static function buildContractFilter(array $user): array
    {
        // Retorna [sqlWhere, params] que el modelo debe usar al consultar.
        $rol = $user['rol_label'] ?? '';
        if (PermissionService::isGlobalStaff($user)) {
            return ['1=1', []];
        }
        if (PermissionService::isCenterAdmin($user)) {
            $centro = PermissionService::requireCentroId($user);
            return [
                'EXISTS (
                    SELECT 1 FROM personas __p_rls
                    WHERE __p_rls.id_persona = c.id_persona
                      AND __p_rls.id_centro = :scope_centro
                )',
                [':scope_centro' => $centro],
            ];
        }
        return ['c.id_persona = :user_id', [':user_id' => (int) $user['id']]];
    }
}
