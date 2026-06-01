<?php
namespace App\Controllers;

use App\Config\Env;
use App\Services\AuthService;
use App\Services\AuditService;
use App\Services\LoginAttemptService;
use App\Services\RecaptchaService;
use App\Services\SecurityConfigService;
use App\Middlewares\AuthMiddleware;
use App\Models\User;

final class AuthController extends Controller
{
    /**
     * Clave pública y si el login exige token (SITE_KEY y SECRET definidas en .env).
     */
    public function recaptchaConfig(): void
    {
        $siteKey = trim((string) Env::get('RECAPTCHA_SITE_KEY', ''));
        $secret  = trim((string) Env::get('RECAPTCHA_SECRET_KEY', ''));
        $hasSite = $siteKey !== '';
        $hasSecret = $secret !== '';
        $misconfigured = $hasSite !== $hasSecret;
        $hasKeys = $hasSite && $hasSecret;
        $required = $hasKeys && SecurityConfigService::isRecaptchaRequired();
        $this->success([
            'site_key'       => $hasKeys ? $siteKey : '',
            'required'       => $required,
            'misconfigured'  => $misconfigured,
            'enabled_in_config' => SecurityConfigService::recaptchaEnabledInConfig(),
        ]);
    }

    public function login(): void
    {
        $data = $this->input();
        $loginField = trim((string) ($data['usuario'] ?? $data['email'] ?? $data['user'] ?? ''));
        $password   = (string) ($data['password'] ?? $data['contrasena'] ?? '');

        $this->validate(['usuario' => $loginField, 'password' => $password], [
            'usuario'  => 'required|min:3',
            'password' => 'required|min:3',
        ]);

        $attempts = new LoginAttemptService();
        $blockedMsg = $attempts->checkBlocked($loginField);
        if ($blockedMsg) {
            $this->error($blockedMsg, 429);
        }

        $siteKey = trim((string) Env::get('RECAPTCHA_SITE_KEY', ''));
        $secret  = trim((string) Env::get('RECAPTCHA_SECRET_KEY', ''));
        $hasSite = $siteKey !== '';
        $hasSecret = $secret !== '';
        if ($hasSite !== $hasSecret) {
            $this->error(
                'Configuración reCAPTCHA incompleta en el servidor (defina SITE_KEY y SECRET juntas).',
                503
            );
        }

        if (SecurityConfigService::isRecaptchaRequired()) {
            $token = trim((string) ($data['recaptcha_token'] ?? $data['g-recaptcha-response'] ?? ''));
            if ($token === '') {
                $this->error('Complete la verificación reCAPTCHA.', 422);
            }
            if (!RecaptchaService::verify($secret, $token)) {
                AuditService::log('login_failed', 'personas', null, [
                    'identificador' => $loginField,
                    'reason'        => 'recaptcha_failed',
                ]);
                $this->error('Verificación de seguridad no válida. Intente de nuevo.', 403);
            }
        }

        $payload = AuthService::attemptLogin($loginField, $password);
        if (!$payload) {
            $attempts->recordFailure($loginField);
            AuditService::log('login_failed', 'personas', null, ['identificador' => $loginField]);
            $this->error('Credenciales incorrectas. Verifique usuario y contraseña.', 401);
        }

        $attempts->clear($loginField);
        AuthService::startSession($payload);
        AuditService::log('login_ok', 'personas', $payload['id']);

        $this->success([
            'user' => $payload,
        ], 'Autenticación exitosa');
    }

    public function logout(): void
    {
        $user = AuthMiddleware::user();
        if ($user) {
            AuditService::log('logout', 'personas', $user['id']);
        }
        AuthService::destroySession();
        $this->success(null, 'Sesión cerrada.');
    }

    public function me(): void
    {
        $user = AuthMiddleware::check();
        $row = (new User())->withRole((int) $user['id']);
        if ($row) {
            $user = AuthService::sessionPayload($row);
            $_SESSION['user'] = $user;
        }
        $this->success(['user' => $user]);
    }
}
