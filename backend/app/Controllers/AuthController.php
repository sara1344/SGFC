<?php
namespace App\Controllers;

use App\Config\Env;
use App\Services\AuthService;
use App\Services\AuditService;
use App\Services\LoginAttemptService;
use App\Services\PasswordResetService;
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

        $this->enforceRecaptchaIfRequired($data, $loginField, 'login_failed');

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

    /** GET /api/auth/signature — imagen de firma guardada del usuario actual */
    public function signature(): void
    {
        $user = AuthMiddleware::check();
        $img = (new User())->getSignatureImage((int) $user['id']);
        if ($img === null) {
            $this->error('No tiene una firma registrada.', 404);
        }
        $this->success(['imagen_b64' => $img]);
    }

    public function forgotPassword(): void
    {
        $data = $this->input();
        $usuario = trim((string) ($data['usuario'] ?? ''));
        $correo = trim((string) ($data['correo'] ?? ''));

        $this->validate(
            ['usuario' => $usuario, 'correo' => $correo],
            ['usuario' => 'required|min:3', 'correo' => 'required|email']
        );

        $this->enforceRecaptchaIfRequired($data, $usuario . '|' . $correo, 'password_reset_recaptcha_failed');

        $result = PasswordResetService::requestReset($usuario, $correo);
        if (!$result['ok']) {
            $this->error($result['message'], 422);
        }
        $this->success(['sent' => $result['sent'] ?? null], $result['message']);
    }

    public function validateResetToken(): void
    {
        $token = trim((string) ($_GET['token'] ?? $this->input()['token'] ?? ''));
        $result = PasswordResetService::validateToken($token);
        if (!$result['ok']) {
            $this->error($result['message'], 400);
        }
        $this->success(['user' => $result['user'] ?? null], $result['message']);
    }

    public function resetPassword(): void
    {
        $data = $this->input();
        $token = trim((string) ($data['token'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $confirm = (string) ($data['password_confirm'] ?? '');

        $this->validate(
            ['token' => $token, 'password' => $password],
            ['token' => 'required|min:32', 'password' => 'required|min:4']
        );

        $result = PasswordResetService::resetPassword($token, $password, $confirm);
        if (!$result['ok']) {
            $this->error($result['message'], 422);
        }
        $this->success(null, $result['message']);
    }

    /** @param array<string,mixed> $data */
    private function enforceRecaptchaIfRequired(array $data, ?string $auditIdent = null, string $auditEvent = 'recaptcha_failed'): void
    {
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

        if (!SecurityConfigService::isRecaptchaRequired()) {
            return;
        }

        $token = trim((string) ($data['recaptcha_token'] ?? $data['g-recaptcha-response'] ?? ''));
        if ($token === '') {
            $this->error('Complete la verificación reCAPTCHA.', 422);
        }
        if (!RecaptchaService::verify($secret, $token)) {
            if ($auditIdent !== null && $auditIdent !== '') {
                AuditService::log($auditEvent, 'personas', null, [
                    'identificador' => $auditIdent,
                    'reason'        => 'recaptcha_failed',
                ]);
            }
            $this->error('Verificación de seguridad no válida. Intente de nuevo.', 403);
        }
    }
}
