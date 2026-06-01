<?php
namespace App\Controllers;

use PDOException;
use App\Middlewares\RoleMiddleware;
use App\Models\User;
use App\Models\Regional;
use App\Services\AuditService;
use App\Services\PermissionService;
use App\Services\SecurityConfigService;

/**
 * CRUD de usuarios (personas).
 */
final class UserController extends Controller
{
    public function index(): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $isSuper = PermissionService::isSuperAdmin($user);
        $idCentro = PermissionService::isCenterAdmin($user)
            ? PermissionService::requireCentroId($user)
            : null;

        $rows = (new User())->listAll(
            $_GET['q']      ?? null,
            $_GET['rol']    ?? null,
            $_GET['estado'] ?? null,
            $idCentro
        );

        if (!$isSuper) {
            $rows = array_values(array_filter($rows, fn($r) => $r['nombre_perfil'] !== 'administrador'));
        }
        if (PermissionService::isCenterAdmin($user)) {
            $rows = array_values(array_filter($rows, fn($r) => $r['nombre_perfil'] === 'contratista'));
        }

        $this->success($rows);
    }

    public function show(int $id): void
    {
        RoleMiddleware::requireStaff();
        $u = (new User())->withRole($id);
        if (!$u) {
            $this->error('Usuario no encontrado.', 404);
        }
        if (!PermissionService::canManageUser($this->user(), $u)) {
            $this->error('No tiene permiso para ver este usuario.', 403);
        }
        unset($u['contrasena']);
        $this->success($u);
    }

    public function store(): void
    {
        RoleMiddleware::requireStaff();
        $data = $this->input();
        $this->validate($data, [
            'nombres'    => 'required|min:2|max:100',
            'apellidos'  => 'required|min:2|max:100',
            'cedula'     => 'required|min:5|max:45',
            'correo'     => 'required|email|max:100',
            'id_perfil'  => 'required',
            'id_genero'  => 'required',
            'id_centro'  => 'required',
        ]);

        $creator = $this->user();
        $idCentro = (int) $data['id_centro'];
        $idRegionalForm = $data['id_regional'] ?? null;
        if (PermissionService::isCenterAdmin($creator)) {
            $idCentro = PermissionService::requireCentroId($creator);
            $idRegionalForm = null;
        }
        if (!$this->centroValido($idCentro, $idRegionalForm)) {
            $this->error('Seleccione una regional y un centro válidos.', 422);
        }

        $idPerfil = (int) $data['id_perfil'];
        if (PermissionService::isCenterAdmin($creator) && $idPerfil !== 1) {
            $this->error('Como administrativo de centro solo puedes crear contratistas.', 403);
        }
        if (!PermissionService::isSuperAdmin($creator) && in_array($idPerfil, [2, 4], true)) {
            $this->error('No tiene permiso para crear usuarios con ese rol.', 403);
        }

        $usuario = self::generateUsername($data['nombres'], $data['apellidos'], $data['cedula']);
        $passwordPlano = !empty($data['password']) ? (string) $data['password'] : (string) $data['cedula'];
        if ($pwdErr = SecurityConfigService::validatePassword($passwordPlano)) {
            $this->error($pwdErr, 422);
        }

        $m = new User();
        if ($m->emailExists($data['correo']))    { $this->error('El correo ya está registrado.', 409); }
        if ($m->usernameExists($usuario))        { $this->error('Ya existe un usuario con la combinación nombre+cédula generada (' . $usuario . ').', 409); }

        $id = null;
        try {
            $id = $m->insert([
                'nombres'    => trim($data['nombres']),
                'Apellidos'  => trim($data['apellidos']),
                'cedula'     => trim((string) $data['cedula']),
                'correo'     => trim($data['correo']),
                'usuario'    => $usuario,
                'contrasena' => password_hash($passwordPlano, PASSWORD_BCRYPT, ['cost' => 10]),
                'id_perfil'  => $idPerfil,
                'id_genero'  => (int) $data['id_genero'],
                'id_centro'  => $idCentro,
                'activo'     => 1,
            ]);
        } catch (PDOException $e) {
            $code = $e->errorInfo[1] ?? null;
            if ($code === 1062 || str_contains($e->getMessage(), 'Duplicate')) {
                $this->error('Ya existe un usuario con esa cédula, correo o nombre de usuario generado.', 409);
            }
            throw $e;
        }
        AuditService::log('user_create', 'personas', $id, ['usuario' => $usuario]);
        $this->success(
            ['id' => $id, 'usuario' => $usuario, 'password_inicial' => $passwordPlano],
            'Usuario creado. Usuario: ' . $usuario . ' / Contraseña inicial: ' . $passwordPlano,
            201
        );
    }

    public function update(int $id): void
    {
        RoleMiddleware::requireStaff();
        $data = $this->input();
        $creator = $this->user();
        $m = new User();
        $current = $m->withRole($id);
        if (!$current) { $this->error('Usuario no encontrado.', 404); }
        if (!PermissionService::canManageUser($creator, $current)) {
            $this->error('No tiene permiso para modificar este usuario.', 403);
        }

        $patch = [];
        foreach (['nombres','apellidos','cedula','correo','id_perfil','id_genero','id_centro','activo'] as $f) {
            if (array_key_exists($f, $data)) {
                $colMap = ['apellidos' => 'Apellidos'];
                $patch[$colMap[$f] ?? $f] = is_string($data[$f]) ? trim($data[$f]) : $data[$f];
            }
        }
        if (array_key_exists('id_centro', $patch)) {
            $idCentro = (int) $patch['id_centro'];
            $idRegionalForm = $data['id_regional'] ?? null;
            if (PermissionService::isCenterAdmin($creator)) {
                $idCentro = PermissionService::requireCentroId($creator);
                $idRegionalForm = null;
            }
            if (!$this->centroValido($idCentro, $idRegionalForm)) {
                $this->error('Seleccione una regional y un centro válidos.', 422);
            }
            $patch['id_centro'] = $idCentro;
        }
        if (isset($patch['id_perfil'])) {
            $idPerfil = (int) $patch['id_perfil'];
            if (PermissionService::isCenterAdmin($creator) && $idPerfil !== 1) {
                $this->error('Solo puede asignar rol contratista.', 403);
            }
            if (!PermissionService::isSuperAdmin($creator) && in_array($idPerfil, [2, 4], true)) {
                $this->error('No tiene permiso para asignar ese rol.', 403);
            }
        }
        if (isset($patch['nombres']) || isset($patch['Apellidos']) || isset($patch['cedula'])) {
            $nuevo = self::generateUsername(
                $patch['nombres']   ?? $current['nombres'],
                $patch['Apellidos'] ?? $current['Apellidos'],
                $patch['cedula']    ?? $current['cedula']
            );
            $patch['usuario'] = $nuevo;
        }
        if (!empty($data['password'])) {
            if ($pwdErr = SecurityConfigService::validatePassword((string) $data['password'])) {
                $this->error($pwdErr, 422);
            }
            $patch['contrasena'] = password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 10]);
        }
        if (isset($patch['correo']) && $m->emailExists($patch['correo'], $id)) {
            $this->error('El correo ya está registrado por otro usuario.', 409);
        }
        if (isset($patch['usuario']) && $m->usernameExists($patch['usuario'], $id)) {
            $this->error('Ya existe un usuario con esa combinación nombre+cédula.', 409);
        }
        $m->update($id, $patch);
        AuditService::log('user_update', 'personas', $id, array_keys($patch));
        $this->success(null, 'Usuario actualizado.');
    }

    public function destroy(int $id): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $m = new User();
        $m->update($id, ['activo' => 0]);
        AuditService::log('user_disable', 'personas', $id);
        $this->success(null, 'Usuario desactivado.');
    }

    private static function generateUsername(string $nombres, string $apellidos, string $cedula): string
    {
        $n = mb_strtolower(mb_substr(trim($nombres),   0, 1));
        $a = mb_strtolower(mb_substr(trim($apellidos), 0, 1));
        $c = substr(preg_replace('/\D/', '', $cedula), -5);
        return $n . $a . $c;
    }

    private function centroValido(int $idCentro, mixed $idRegional = null): bool
    {
        if ($idCentro <= 0) {
            return false;
        }
        $m = new Regional();
        if (!$m->centroExists($idCentro)) {
            return false;
        }
        if ($idRegional !== null && $idRegional !== '') {
            $reg = $m->centroRegionalId($idCentro);
            return $reg !== null && $reg === (int) $idRegional;
        }
        return true;
    }
}
