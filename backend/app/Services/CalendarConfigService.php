<?php
namespace App\Services;

use App\Models\SystemConfig;
use DateTimeImmutable;
use DateTimeZone;

final class CalendarConfigService
{
    private const GRUPO = 'calendario';

    private const TIMEZONES = [
        'America/Bogota',
        'America/Lima',
        'America/Mexico_City',
        'America/Santiago',
        'UTC',
    ];

    /** @var array<string,mixed>|null */
    private static ?array $cache = null;

    /** @return array<string,mixed> */
    public static function defaults(): array
    {
        return [
            'zona_horaria'               => 'America/Bogota',
            'dias_habiles'               => [1, 2, 3, 4, 5],
            'hora_cierre'                => '17:00',
            'validar_fecha_limite_habil' => true,
            'fechas_especiales'          => [],
        ];
    }

    /** @return list<string> */
    public static function allowedTimezones(): array
    {
        return self::TIMEZONES;
    }

    /** @return array<string,mixed> */
    public static function get(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        try {
            $row = (new SystemConfig())->getGroup(self::GRUPO);
            $merged = array_merge(self::defaults(), $row['datos'] ?? []);
            $merged['dias_habiles'] = self::normalizeWeekdays($merged['dias_habiles'] ?? []);
            $merged['fechas_especiales'] = self::normalizeSpecialDates($merged['fechas_especiales'] ?? [], false);
            self::$cache = $merged;
        } catch (\Throwable) {
            self::$cache = self::defaults();
        }
        return self::$cache;
    }

    public static function clearCache(): void
    {
        self::$cache = null;
    }

    /** @param mixed $days @return list<int> */
    private static function normalizeWeekdays(mixed $days): array
    {
        if (!is_array($days)) {
            return self::defaults()['dias_habiles'];
        }
        $out = [];
        foreach ($days as $d) {
            $n = (int) $d;
            if ($n >= 1 && $n <= 7) {
                $out[] = $n;
            }
        }
        $out = array_values(array_unique($out));
        sort($out);
        return $out ?: self::defaults()['dias_habiles'];
    }

    /**
     * @param mixed $rows
     * @return list<array{fecha:string,nombre:string,tipo:string}>
     */
    private static function normalizeSpecialDates(mixed $rows, bool $collectErrors = true): array
    {
        if (!is_array($rows)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $fecha = trim((string) ($row['fecha'] ?? ''));
            $nombre = trim((string) ($row['nombre'] ?? ''));
            $tipo = trim((string) ($row['tipo'] ?? 'festivo'));
            if ($fecha === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
                if ($collectErrors) {
                    continue;
                }
                continue;
            }
            if ($nombre === '') {
                $nombre = 'Fecha especial';
            }
            if (!in_array($tipo, ['festivo', 'cierre', 'evento'], true)) {
                $tipo = 'festivo';
            }
            if (isset($seen[$fecha])) {
                continue;
            }
            $seen[$fecha] = true;
            $out[] = ['fecha' => $fecha, 'nombre' => mb_substr($nombre, 0, 120), 'tipo' => $tipo];
            if (count($out) >= 120) {
                break;
            }
        }
        usort($out, fn($a, $b) => strcmp($a['fecha'], $b['fecha']));
        return $out;
    }

    /** @param array<string,mixed> $input @return array{data:array<string,mixed>,errors:array<string,string>} */
    public static function normalizeInput(array $input): array
    {
        $errors = [];
        $d = self::defaults();

        $tz = trim((string) ($input['zona_horaria'] ?? $d['zona_horaria']));
        if (!in_array($tz, self::TIMEZONES, true)) {
            $errors['zona_horaria'] = 'Zona horaria no permitida.';
        }

        $dias = self::normalizeWeekdays($input['dias_habiles'] ?? $d['dias_habiles']);
        if (empty($dias)) {
            $errors['dias_habiles'] = 'Seleccione al menos un día hábil.';
        }

        $hora = trim((string) ($input['hora_cierre'] ?? $d['hora_cierre']));
        if ($hora !== '' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $hora)) {
            $errors['hora_cierre'] = 'Hora de cierre inválida (use formato HH:MM).';
        }

        $fechas = self::normalizeSpecialDates($input['fechas_especiales'] ?? []);

        $data = [
            'zona_horaria'               => $tz,
            'dias_habiles'               => $dias,
            'hora_cierre'                => $hora !== '' ? $hora : '17:00',
            'validar_fecha_limite_habil' => !empty($input['validar_fecha_limite_habil']),
            'fechas_especiales'          => $fechas,
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

    public static function timezone(): DateTimeZone
    {
        $tz = (string) (self::get()['zona_horaria'] ?? 'America/Bogota');
        try {
            return new DateTimeZone($tz);
        } catch (\Throwable) {
            return new DateTimeZone('America/Bogota');
        }
    }

    public static function isBusinessDay(string $dateYmd): bool
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateYmd)) {
            return false;
        }
        $cfg = self::get();
        try {
            $dt = new DateTimeImmutable($dateYmd, self::timezone());
        } catch (\Throwable) {
            return false;
        }

        $dow = (int) $dt->format('N');
        if (!in_array($dow, $cfg['dias_habiles'], true)) {
            return false;
        }

        foreach ($cfg['fechas_especiales'] as $sp) {
            if (($sp['fecha'] ?? '') === $dateYmd) {
                return false;
            }
        }

        return true;
    }

    public static function isAllowedDeadlineDate(string $dateYmd): bool
    {
        $cfg = self::get();
        if (empty($cfg['validar_fecha_limite_habil'])) {
            return true;
        }
        return self::isBusinessDay($dateYmd);
    }

    public static function deadlineErrorMessage(string $dateYmd): string
    {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateYmd)) {
            return 'Fecha límite inválida.';
        }
        foreach (self::get()['fechas_especiales'] as $sp) {
            if (($sp['fecha'] ?? '') === $dateYmd) {
                return 'La fecha límite cae en un día especial (' . ($sp['nombre'] ?? 'festivo') . '). Elija un día hábil.';
            }
        }
        return 'La fecha límite debe ser un día hábil según el calendario institucional.';
    }

    /** @return array<string,mixed> */
    public static function adminView(): array
    {
        $cfg = self::get();
        $labels = [1 => 'Lun', 2 => 'Mar', 3 => 'Mié', 4 => 'Jue', 5 => 'Vie', 6 => 'Sáb', 7 => 'Dom'];
        $diasLabel = implode(', ', array_map(fn($d) => $labels[$d] ?? (string) $d, $cfg['dias_habiles']));

        return [
            'config'     => $cfg,
            'timezones'  => self::TIMEZONES,
            'resumen'    => [
                'dias_habiles_label' => $diasLabel,
                'fechas_especiales'  => count($cfg['fechas_especiales']),
            ],
        ];
    }
}
