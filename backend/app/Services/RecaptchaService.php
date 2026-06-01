<?php
namespace App\Services;

/**
 * Verificación de respuesta reCAPTCHA v2/v3 contra Google siteverify.
 */
final class RecaptchaService
{
    private const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

    public static function verify(string $secret, string $response, ?string $remoteIp = null): bool
    {
        $response = trim($response);
        if ($response === '' || $secret === '') {
            return false;
        }
        $post = http_build_query([
            'secret'   => $secret,
            'response' => $response,
            'remoteip' => $remoteIp ?? ($_SERVER['REMOTE_ADDR'] ?? ''),
        ]);
        $ctx = stream_context_create([
            'http' => [
                'method'           => 'POST',
                'header'           => "Content-Type: application/x-www-form-urlencoded\r\n",
                'content'          => $post,
                'timeout'          => 8,
                'ignore_errors'    => true,
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $raw = @file_get_contents(self::VERIFY_URL, false, $ctx);
        if ($raw === false) {
            return false;
        }
        $json = json_decode($raw, true);
        return is_array($json) && !empty($json['success']);
    }
}
