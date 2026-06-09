<?php
namespace App\Services;

use App\Models\Regional;
use App\Models\SystemConfig;

final class InstitutionalConfigService
{
    private const GRUPO = 'institucional';

    /** @var array<string,mixed>|null */
    private static ?array $cache = null;

    /** @return array<string,mixed> */
    public static function defaults(): array
    {
        return [
            'nombre_regional'  => 'Regional Caldas',
            'nombre_centro'    => 'Centro de Procesos Industriales',
            'codigo_sena'      => '',
            'correo_contacto'  => '',
            'telefono'         => '',
            'direccion'        => '',
            'id_regional'      => 7,
            'id_centro'        => 36,
        ];
    }

    /** @return array<string,mixed> */
    public static function get(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        try {
            $row = (new SystemConfig())->getGroup(self::GRUPO);
            self::$cache = array_merge(self::defaults(), $row['datos'] ?? []);
        } catch (\Throwable) {
            self::$cache = self::defaults();
        }
        return self::$cache;
    }

    public static function clearCache(): void
    {
        self::$cache = null;
    }

    /** @param array<string,mixed> $input @return array{data:array<string,mixed>,errors:array<string,string>} */
    public static function normalizeInput(array $input): array
    {
        $errors = [];
        $d = self::defaults();

        $nombreRegional = trim((string) ($input['nombre_regional'] ?? $d['nombre_regional']));
        $nombreCentro = trim((string) ($input['nombre_centro'] ?? $d['nombre_centro']));
        $codigoSena = trim((string) ($input['codigo_sena'] ?? ''));
        $correo = trim((string) ($input['correo_contacto'] ?? ''));
        $telefono = trim((string) ($input['telefono'] ?? ''));
        $direccion = trim((string) ($input['direccion'] ?? ''));

        if (mb_strlen($nombreRegional) < 3) {
            $errors['nombre_regional'] = 'Indique el nombre de la regional (mínimo 3 caracteres).';
        }
        if (mb_strlen($nombreCentro) < 3) {
            $errors['nombre_centro'] = 'Indique el nombre del centro (mínimo 3 caracteres).';
        }
        if ($codigoSena !== '' && !preg_match('/^[A-Za-z0-9\-]{1,12}$/', $codigoSena)) {
            $errors['codigo_sena'] = 'Código SENA inválido (máx. 12 caracteres alfanuméricos).';
        }
        if ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            $errors['correo_contacto'] = 'Correo de contacto inválido.';
        }
        if (mb_strlen($telefono) > 30) {
            $errors['telefono'] = 'Teléfono demasiado largo.';
        }
        if (mb_strlen($direccion) > 255) {
            $errors['direccion'] = 'Dirección demasiado larga (máx. 255).';
        }

        $idRegional = (int) ($input['id_regional'] ?? 0);
        $idCentro = (int) ($input['id_centro'] ?? 0);
        $idRegional = $idRegional > 0 ? $idRegional : null;
        $idCentro = $idCentro > 0 ? $idCentro : null;

        $regionalModel = new Regional();
        if ($idRegional !== null) {
            $exists = $regionalModel->one(
                'SELECT id_regional FROM regionales WHERE id_regional = :id AND activo = 1 LIMIT 1',
                [':id' => $idRegional]
            );
            if (!$exists) {
                $errors['id_regional'] = 'La regional seleccionada no es válida.';
            }
        }
        if ($idCentro !== null) {
            if (!$regionalModel->centroExists($idCentro)) {
                $errors['id_centro'] = 'El centro seleccionado no es válido.';
            } elseif ($idRegional !== null) {
                $regCentro = $regionalModel->centroRegionalId($idCentro);
                if ($regCentro !== $idRegional) {
                    $errors['id_centro'] = 'El centro no pertenece a la regional seleccionada.';
                }
            }
        }

        $data = [
            'nombre_regional' => $nombreRegional,
            'nombre_centro'   => $nombreCentro,
            'codigo_sena'     => $codigoSena,
            'correo_contacto' => $correo,
            'telefono'        => $telefono,
            'direccion'       => $direccion,
            'id_regional'     => $idRegional,
            'id_centro'       => $idCentro,
        ];

        return ['data' => $data, 'errors' => $errors];
    }

    /** @param array<string,mixed> $datos */
    public static function save(array $datos, ?int $userId = null): array
    {
        $normalized = self::normalizeInput($datos);
        if (!empty($normalized['errors'])) {
            return $normalized;
        }
        (new SystemConfig())->saveGroup(self::GRUPO, $normalized['data'], $userId);
        self::$cache = $normalized['data'];
        return ['data' => $normalized['data'], 'errors' => []];
    }

    /** @return array<string,mixed> */
    public static function publicBranding(): array
    {
        $cfg = self::get();
        $regional = trim((string) $cfg['nombre_regional']);
        $centro = trim((string) $cfg['nombre_centro']);
        $pie = $centro !== '' ? "SENA {$regional} — {$centro}" : "SENA {$regional}";

        return [
            'nombre_regional'   => $regional,
            'nombre_centro'     => $centro,
            'codigo_sena'       => trim((string) ($cfg['codigo_sena'] ?? '')),
            'correo_contacto'   => trim((string) ($cfg['correo_contacto'] ?? '')),
            'telefono'          => trim((string) ($cfg['telefono'] ?? '')),
            'direccion'         => trim((string) ($cfg['direccion'] ?? '')),
            'pie_pagina'        => $pie,
            'descripcion_login' => "Plataforma institucional para la gestión, validación y seguimiento documental de contratistas del SENA {$regional}.",
        ];
    }

    /** @return array<string,mixed> */
    public static function adminView(): array
    {
        $cfg = self::get();
        $catalogCount = ['regionales' => 0, 'centros' => 0];
        try {
            $tree = (new Regional())->tree();
            $catalogCount['regionales'] = count($tree);
            $catalogCount['centros'] = array_sum(array_map(fn($r) => count($r['centros'] ?? []), $tree));
        } catch (\Throwable) {
            // Catálogo aún no migrado
        }

        return [
            'config'  => $cfg,
            'branding' => self::publicBranding(),
            'catalogo' => $catalogCount,
        ];
    }
}
