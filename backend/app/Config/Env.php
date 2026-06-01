<?php
namespace App\Config;

/**
 * Cargador minimalista de variables de entorno desde .env (sin dependencias).
 *
 * Uso:
 *   Env::load(__DIR__ . '/../../.env');
 *   $host = Env::get('DB_HOST', 'localhost');
 */
final class Env
{
    private static array $vars = [];

    public static function load(string $path): void
    {
        if (!is_readable($path)) {
            return;
        }
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (str_starts_with(trim($line), '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key   = trim($key);
            $value = trim($value);
            // Trim de comillas envolventes
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }
            self::$vars[$key] = $value;
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
            }
            if (getenv($key) === false) {
                @putenv("$key=$value");
            }
        }
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        if (isset(self::$vars[$key])) {
            return self::cast(self::$vars[$key]);
        }
        $env = getenv($key);
        if ($env !== false) {
            return self::cast($env);
        }
        return $default;
    }

    private static function cast(string $v): mixed
    {
        $low = strtolower($v);
        return match ($low) {
            'true'  => true,
            'false' => false,
            'null'  => null,
            ''      => '',
            default => $v,
        };
    }
}
