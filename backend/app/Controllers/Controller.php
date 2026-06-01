<?php
namespace App\Controllers;

use App\Config\App;
use App\Middlewares\AuthMiddleware;

/**
 * Controlador base con utilidades cortas heredables.
 */
abstract class Controller
{
    protected function input(): array
    {
        return App::input();
    }

    protected function user(): array
    {
        return AuthMiddleware::check();
    }

    protected function success(mixed $data = null, string $msg = 'OK', int $status = 200): never
    {
        App::success($data, $msg, $status);
    }

    protected function error(string $msg, int $status = 400, mixed $extra = null): never
    {
        App::error($msg, $status, $extra);
    }

    protected function validate(array $data, array $rules): array
    {
        $errors = [];
        foreach ($rules as $field => $ruleStr) {
            $rules = explode('|', $ruleStr);
            $val = $data[$field] ?? null;
            foreach ($rules as $r) {
                if ($r === 'required' && ($val === null || $val === '')) {
                    $errors[$field] = "El campo '$field' es obligatorio.";
                    break;
                }
                if ($r === 'email' && $val && !filter_var($val, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = "El campo '$field' debe ser un correo válido.";
                    break;
                }
                if (str_starts_with($r, 'min:')) {
                    $n = (int) substr($r, 4);
                    if ($val !== null && strlen((string) $val) < $n) {
                        $errors[$field] = "El campo '$field' debe tener al menos $n caracteres.";
                        break;
                    }
                }
                if (str_starts_with($r, 'max:')) {
                    $n = (int) substr($r, 4);
                    if ($val !== null && strlen((string) $val) > $n) {
                        $errors[$field] = "El campo '$field' debe tener máximo $n caracteres.";
                        break;
                    }
                }
            }
        }
        if (!empty($errors)) {
            $this->error('Datos inválidos.', 422, $errors);
        }
        return $data;
    }
}
