<?php
namespace App\Services;

use App\Config\App;

/**
 * Normaliza imágenes de firma antes de guardarlas en BD (evita max_allowed_packet).
 */
final class SignatureImageService
{
    private const MAX_BYTES = 524288;
    private const MAX_WIDTH = 800;
    private const MAX_HEIGHT = 400;

    public static function normalizeForStorage(string $imagenB64): string
    {
        $decoded = self::decode($imagenB64);
        if ($decoded === null) {
            App::error('La imagen de firma no es válida. Use PNG o JPG.', 422);
        }

        [$bin, $mime] = $decoded;
        if (strlen($bin) > 2 * 1024 * 1024) {
            App::error('La imagen de firma es demasiado grande. Use una imagen de hasta 500 KB.', 422);
        }

        if (strlen($bin) <= self::MAX_BYTES && !self::needsResize($bin)) {
            return self::toDataUrl($mime, $bin);
        }

        if (!function_exists('imagecreatefromstring')) {
            if (strlen($bin) > self::MAX_BYTES) {
                App::error('La imagen de firma es demasiado grande. Use una imagen de hasta 500 KB.', 422);
            }
            return self::toDataUrl($mime, $bin);
        }

        $img = @imagecreatefromstring($bin);
        if ($img === false) {
            App::error('La imagen de firma no es válida.', 422);
        }

        $resized = self::resize($img);
        imagedestroy($img);

        ob_start();
        imagejpeg($resized, null, 88);
        $out = ob_get_clean() ?: '';
        imagedestroy($resized);

        if (strlen($out) < 32) {
            App::error('No se pudo procesar la imagen de firma.', 500);
        }

        return self::toDataUrl('image/jpeg', $out);
    }

    /** @return array{0:string,1:string}|null */
    private static function decode(string $imagenB64): ?array
    {
        $raw = trim($imagenB64);
        $mime = 'image/png';
        if (preg_match('/^data:image\/(\w+);base64,/', $raw, $m)) {
            $mime = 'image/' . strtolower($m[1]);
            $raw = substr($raw, strpos($raw, ',') + 1);
        }
        $bin = base64_decode($raw, true);
        if ($bin === false || strlen($bin) < 32) {
            return null;
        }
        return [$bin, $mime];
    }

    private static function needsResize(string $bin): bool
    {
        $info = @getimagesizefromstring($bin);
        if (!$info) {
            return false;
        }
        return ($info[0] ?? 0) > self::MAX_WIDTH || ($info[1] ?? 0) > self::MAX_HEIGHT;
    }

    private static function resize(\GdImage $img): \GdImage
    {
        $width = imagesx($img);
        $height = imagesy($img);
        $scale = min(1.0, self::MAX_WIDTH / max(1, $width), self::MAX_HEIGHT / max(1, $height));
        if ($scale >= 0.999) {
            return $img;
        }

        $newW = max(1, (int) round($width * $scale));
        $newH = max(1, (int) round($height * $scale));
        $out = imagecreatetruecolor($newW, $newH);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        $transparent = imagecolorallocatealpha($out, 0, 0, 0, 127);
        imagefilledrectangle($out, 0, 0, $newW, $newH, $transparent);
        imagecopyresampled($out, $img, 0, 0, 0, 0, $newW, $newH, $width, $height);

        return $out;
    }

    private static function toDataUrl(string $mime, string $bin): string
    {
        $normalizedMime = str_contains($mime, 'jpeg') || str_contains($mime, 'jpg')
            ? 'image/jpeg'
            : (str_contains($mime, 'png') ? 'image/png' : $mime);

        return 'data:' . $normalizedMime . ';base64,' . base64_encode($bin);
    }
}
