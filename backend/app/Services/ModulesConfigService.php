<?php

namespace App\Services;



use App\Config\Database;

use App\Models\Module;

use App\Models\Subgroup;

use App\Models\SystemConfig;



final class ModulesConfigService

{

    private const GRUPO = 'modulos';



    /** @var array<string,mixed>|null */

    private static ?array $cache = null;



    /** @return array<string,bool> */

    public static function featureDefaults(): array

    {

        return [

            'carga_contratista' => true,

            'revision_admin'    => true,

            'unificar_pdf'      => true,

            'firma_pdf'         => true,

        ];

    }



    /** @return array<string,bool> */

    public static function getFeatures(): array

    {

        if (self::$cache !== null) {

            return self::$cache;

        }

        try {

            $row = (new SystemConfig())->getGroup(self::GRUPO);

            $merged = array_merge(self::featureDefaults(), $row['datos'] ?? []);

            self::$cache = self::normalizeFeatures($merged);

        } catch (\Throwable) {

            self::$cache = self::featureDefaults();

        }

        return self::$cache;

    }



    public static function clearCache(): void

    {

        self::$cache = null;

    }



    public static function featureEnabled(string $key): bool

    {

        $cfg = self::getFeatures();

        return !empty($cfg[$key]);

    }



    /** @return list<array<string,mixed>> */

    public static function catalogTree(): array

    {

        $db = Database::connection();

        $modulos = $db->query(

            'SELECT id_modulo, codigo, nombre, color_hex, activo, orden FROM modulos ORDER BY orden'

        )->fetchAll();



        foreach ($modulos as &$m) {

            $m['activo'] = (int) $m['activo'];

            $stmt = $db->prepare(

                'SELECT id_subgrupo, id_modulo, codigo, nombre, activo, orden

                 FROM subgrupos WHERE id_modulo = :m ORDER BY orden'

            );

            $stmt->execute([':m' => $m['id_modulo']]);

            $subs = $stmt->fetchAll();

            foreach ($subs as &$s) {

                $s['activo'] = (int) $s['activo'];

            }

            $m['subgrupos'] = $subs;

        }



        return $modulos;

    }



    /** @return array<string,mixed> */

    public static function adminView(): array

    {

        $modulos = self::catalogTree();

        $activosMod = count(array_filter($modulos, fn ($m) => !empty($m['activo'])));

        $activosSub = 0;

        foreach ($modulos as $m) {

            $activosSub += count(array_filter($m['subgrupos'] ?? [], fn ($s) => !empty($s['activo'])));

        }



        return [

            'config'  => self::getFeatures(),

            'modulos' => $modulos,

            'resumen' => [

                'modulos_activos'   => $activosMod,

                'modulos_total'     => count($modulos),

                'subgrupos_activos' => $activosSub,

            ],

        ];

    }



    /** @param array<string,mixed> $input @return array{data:array<string,mixed>,errors:array<string,string>} */

    public static function save(array $input, ?int $userId = null): array

    {

        $errors = [];

        $features = self::normalizeFeatures(array_merge(

            self::featureDefaults(),

            array_intersect_key($input, self::featureDefaults())

        ));



        $modInput = $input['modulos'] ?? null;

        if (!is_array($modInput)) {

            $errors['modulos'] = 'Estructura de módulos inválida.';

            return ['data' => [], 'errors' => $errors];

        }



        $existing = self::catalogTree();

        $byMod = [];

        foreach ($existing as $m) {

            $byMod[(int) $m['id_modulo']] = $m;

        }



        $moduleModel = new Module();

        $subgroupModel = new Subgroup();



        foreach ($modInput as $row) {

            if (!is_array($row)) {

                continue;

            }

            $idMod = (int) ($row['id_modulo'] ?? 0);

            if ($idMod <= 0 || !isset($byMod[$idMod])) {

                $errors['modulos'] = 'Módulo no válido.';

                break;

            }



            $activoMod = !empty($row['activo']) ? 1 : 0;

            $moduleModel->update($idMod, ['activo' => $activoMod]);



            $subsById = [];

            foreach ($byMod[$idMod]['subgrupos'] ?? [] as $s) {

                $subsById[(int) $s['id_subgrupo']] = $s;

            }



            foreach ($row['subgrupos'] ?? [] as $sub) {

                if (!is_array($sub)) {

                    continue;

                }

                $idSub = (int) ($sub['id_subgrupo'] ?? 0);

                if ($idSub <= 0 || !isset($subsById[$idSub])) {

                    $errors['subgrupos'] = 'Subgrupo no válido.';

                    break 2;

                }

                $activoSub = !empty($sub['activo']) ? 1 : 0;

                $subgroupModel->update($idSub, ['activo' => $activoSub]);

            }

        }



        if (!empty($errors)) {

            return ['data' => [], 'errors' => $errors];

        }



        (new SystemConfig())->saveGroup(self::GRUPO, $features, $userId);

        self::$cache = $features;



        return ['data' => self::adminView(), 'errors' => []];

    }



    /** @param array<string,mixed> $raw @return array<string,bool> */

    private static function normalizeFeatures(array $raw): array

    {

        $out = self::featureDefaults();

        foreach ($out as $key => $_) {

            $out[$key] = !empty($raw[$key]);

        }

        return $out;

    }

}

