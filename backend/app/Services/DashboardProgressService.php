<?php
namespace App\Services;

use App\Config\Database;

/**
 * Avance de entrega de evidencias agrupado por regional y centro.
 *
 * Reglas:
 *   - Solo contratos activos y periodos abiertos (no Bloqueado / Firmado).
 *   - Solo contratistas con centro asignado.
 *   - Entregada = evidencia con carga (estado distinto de «Pendiente entrega»).
 *   - Porcentaje de entrega = entregadas / total × 100.
 */
final class DashboardProgressService
{
    public static function avancePorRegionalCentro(): array
    {
        $db = Database::connection();
        $rows = $db->query("
            SELECT reg.id_regional,
                   reg.nombre AS regional_nombre,
                   cen.id_centro,
                   cen.nombre AS centro_nombre,
                   COALESCE((
                       SELECT u.estado
                       FROM evidencias_uploads u
                       WHERE u.id_asignacion = a.id_asignacion
                       ORDER BY u.version DESC
                       LIMIT 1
                   ), 'Pendiente entrega') AS estado
            FROM evidencias_asignadas a
            JOIN periodos per ON per.id_periodo = a.id_periodo
            JOIN contratos c  ON c.id_contrato = per.id_contrato AND c.estado = 'Activo'
            JOIN personas p   ON p.id_persona = c.id_persona
            JOIN perfil pf    ON pf.id_Perfil = p.id_perfil AND pf.nombre_perfil = 'contratista'
            INNER JOIN centros cen ON cen.id_centro = p.id_centro AND cen.activo = 1
            INNER JOIN regionales reg ON reg.id_regional = cen.id_regional AND reg.activo = 1
            WHERE per.estado NOT IN ('Bloqueado', 'Firmado')
            ORDER BY reg.nombre ASC, cen.nombre ASC
        ")->fetchAll();

        $centrosMap = [];
        foreach ($rows as $row) {
            $idCentro = (int) $row['id_centro'];
            if (!isset($centrosMap[$idCentro])) {
                $centrosMap[$idCentro] = [
                    'id_centro'       => $idCentro,
                    'id_regional'     => (int) $row['id_regional'],
                    'nombre'          => $row['centro_nombre'],
                    'regional_nombre' => $row['regional_nombre'],
                    'total'           => 0,
                    'entregadas'      => 0,
                    'aprobadas'       => 0,
                ];
            }
            $centrosMap[$idCentro]['total']++;
            $est = (string) $row['estado'];
            if ($est !== 'Pendiente entrega') {
                $centrosMap[$idCentro]['entregadas']++;
            }
            if ($est === 'Aprobada') {
                $centrosMap[$idCentro]['aprobadas']++;
            }
        }

        $regionalesMap = [];
        foreach ($centrosMap as $centro) {
            $centro['porcentaje'] = self::pct($centro['entregadas'], $centro['total']);
            $centro['porcentaje_aprobacion'] = self::pct($centro['aprobadas'], $centro['total']);

            $idReg = $centro['id_regional'];
            if (!isset($regionalesMap[$idReg])) {
                $regionalesMap[$idReg] = [
                    'id_regional' => $idReg,
                    'nombre'      => $centro['regional_nombre'],
                    'total'       => 0,
                    'entregadas'  => 0,
                    'aprobadas'   => 0,
                    'centros'     => [],
                ];
            }
            $regionalesMap[$idReg]['total']      += $centro['total'];
            $regionalesMap[$idReg]['entregadas'] += $centro['entregadas'];
            $regionalesMap[$idReg]['aprobadas']  += $centro['aprobadas'];
            $regionalesMap[$idReg]['centros'][] = [
                'id_centro'              => $centro['id_centro'],
                'nombre'                 => $centro['nombre'],
                'total'                  => $centro['total'],
                'entregadas'             => $centro['entregadas'],
                'aprobadas'              => $centro['aprobadas'],
                'porcentaje'             => $centro['porcentaje'],
                'porcentaje_aprobacion'  => $centro['porcentaje_aprobacion'],
            ];
        }

        $out = [];
        foreach ($regionalesMap as $reg) {
            usort($reg['centros'], fn($a, $b) => strcmp($a['nombre'], $b['nombre']));
            $reg['porcentaje'] = self::pct($reg['entregadas'], $reg['total']);
            $reg['porcentaje_aprobacion'] = self::pct($reg['aprobadas'], $reg['total']);
            $reg['centros_count'] = count($reg['centros']);
            $out[] = $reg;
        }

        usort($out, fn($a, $b) => strcmp($a['nombre'], $b['nombre']));
        return $out;
    }

    private static function pct(int $num, int $den): int
    {
        if ($den <= 0) {
            return 0;
        }
        return (int) round(($num / $den) * 100);
    }
}
