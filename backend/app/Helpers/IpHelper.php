<?php
namespace App\Helpers;

/**
 * Utilidades para obtener y normalizar direcciones IPv4.
 */
final class IpHelper
{
    /** Dirección IPv4 del cliente actual, o null si no hay equivalente IPv4. */
    public static function clientAddress(): ?string
    {
        $candidates = [];
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            foreach (explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']) as $part) {
                $candidates[] = trim($part);
            }
        }
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $candidates[] = trim((string) $_SERVER['HTTP_CLIENT_IP']);
        }
        if (!empty($_SERVER['REMOTE_ADDR'])) {
            $candidates[] = trim((string) $_SERVER['REMOTE_ADDR']);
        }

        foreach ($candidates as $raw) {
            $v4 = self::toIpv4($raw);
            if ($v4 !== null) {
                return $v4;
            }
        }

        return null;
    }

    /** Convierte una IP almacenada a IPv4 cuando es posible (::1, ::ffff:x.x.x.x, etc.). */
    public static function toIpv4(?string $ip): ?string
    {
        $ip = trim((string) $ip);
        if ($ip === '') {
            return null;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return $ip;
        }

        if (str_starts_with(strtolower($ip), '::ffff:')) {
            $mapped = substr($ip, 7);
            if (filter_var($mapped, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $mapped;
            }
        }

        if ($ip === '::1') {
            return '127.0.0.1';
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $bin = inet_pton($ip);
            if ($bin !== false && strlen($bin) === 16
                && substr($bin, 0, 12) === "\0\0\0\0\0\0\0\0\0\0\xff\xff") {
                $v4 = inet_ntop(substr($bin, 12));
                if ($v4 !== false && filter_var($v4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                    return $v4;
                }
            }
        }

        return null;
    }
}
