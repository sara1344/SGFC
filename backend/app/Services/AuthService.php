<?php
namespace App\Services;

use App\Models\User;
use App\Middlewares\RoleMiddleware;

/**
 * Lógica de autenticación y construcción del payload de sesión.
 */
final class AuthService
{
    public static function attemptLogin(string $usuario, string $password): ?array
    {
        $userModel = new User();
        $row = $userModel->findByLogin($usuario);
        if (!$row) {
            return null;
        }
        if (!password_verify($password, $row['contrasena'])) {
            return null;
        }

        // Si el hash es antiguo, podríamos refrescarlo:
        if (password_needs_rehash($row['contrasena'], PASSWORD_BCRYPT, ['cost' => 10])) {
            $userModel->update((int) $row['id_persona'], [
                'contrasena' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]),
            ]);
        }

        return self::sessionPayload($row);
    }

    public static function hasStoredSignature(array $row): bool
    {
        return !empty(trim((string) ($row['firma_imagen_b64'] ?? '')));
    }

    public static function sessionPayload(array $row): array
    {
        $perfil = $row['nombre_perfil'] ?? '';
        $label = RoleMiddleware::LABELS[$perfil] ?? ucfirst($perfil);
        return [
            'id'              => (int) $row['id_persona'],
            'nombre'          => trim($row['nombres'] . ' ' . ($row['Apellidos'] ?? '')),
            'cedula'          => $row['cedula'] ?? null,
            'correo'          => $row['correo'] ?? null,
            'usuario'         => $row['usuario'] ?? null,
            'rol_id'          => (int) ($row['id_perfil'] ?? 0),
            'rol'             => $perfil,
            'rol_label'       => $label,
            'id_centro'       => isset($row['id_centro']) ? (int) $row['id_centro'] : null,
            'centro_nombre'   => $row['centro_nombre'] ?? null,
            'id_regional'     => isset($row['id_regional']) ? (int) $row['id_regional'] : null,
            'regional_nombre' => $row['regional_nombre'] ?? null,
            'tiene_firma'     => self::hasStoredSignature($row),
        ];
    }

    public static function startSession(array $payload): void
    {
        $_SESSION['user'] = $payload;
        $_SESSION['last_activity'] = time();
        session_regenerate_id(true);
    }

    public static function destroySession(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }
}
