<?php
namespace App\Controllers;

use App\Models\Regional;
use App\Services\PermissionService;

/**
 * Catálogos de apoyo para formularios (regionales, centros, etc.).
 */
final class CatalogController extends Controller
{
    public function regionalesCentros(): void
    {
        $tree = (new Regional())->tree();
        $user = $this->user();
        if (PermissionService::isCenterAdmin($user)) {
            $centroId = PermissionService::requireCentroId($user);
            $tree = array_values(array_filter(array_map(function (array $reg) use ($centroId) {
                $centros = array_values(array_filter(
                    $reg['centros'],
                    fn($c) => (int) $c['id_centro'] === $centroId
                ));
                if ($centros === []) {
                    return null;
                }
                $reg['centros'] = $centros;
                return $reg;
            }, $tree)));
        }
        $this->success($tree);
    }
}
