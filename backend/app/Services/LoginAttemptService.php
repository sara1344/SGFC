<?php
namespace App\Services;

use App\Models\Model;

final class LoginAttemptService extends Model
{
    public function checkBlocked(string $identificador): ?string
    {
        $cfg = SecurityConfigService::get();
        $max = (int) $cfg['max_login_attempts'];
        if ($max <= 0) {
            return null;
        }

        $id = $this->normalizeId($identificador);
        $row = $this->one(
            'SELECT intentos, bloqueado_hasta FROM intentos_login WHERE identificador = :id LIMIT 1',
            [':id' => $id]
        );
        if (!$row || empty($row['bloqueado_hasta'])) {
            return null;
        }
        $until = strtotime((string) $row['bloqueado_hasta']);
        if ($until !== false && $until > time()) {
            $mins = max(1, (int) ceil(($until - time()) / 60));
            return "Demasiados intentos fallidos. Intente de nuevo en {$mins} minuto(s).";
        }
        return null;
    }

    public function recordFailure(string $identificador): void
    {
        $cfg = SecurityConfigService::get();
        $max = (int) $cfg['max_login_attempts'];
        if ($max <= 0) {
            return;
        }

        $id = $this->normalizeId($identificador);
        $lockMins = max(1, (int) $cfg['lockout_minutes']);
        $row = $this->one(
            'SELECT intentos, bloqueado_hasta FROM intentos_login WHERE identificador = :id LIMIT 1',
            [':id' => $id]
        );

        $intentos = (int) ($row['intentos'] ?? 0) + 1;
        $bloqueado = null;
        if ($intentos >= $max) {
            $bloqueado = date('Y-m-d H:i:s', time() + ($lockMins * 60));
            $intentos = 0;
        }

        if ($row) {
            $this->exec(
                'UPDATE intentos_login SET intentos = :i, bloqueado_hasta = :b, ultimo_intento = NOW() WHERE identificador = :id',
                [':i' => $intentos, ':b' => $bloqueado, ':id' => $id]
            );
            return;
        }

        $this->exec(
            'INSERT INTO intentos_login (identificador, intentos, bloqueado_hasta, ultimo_intento) VALUES (:id, :i, :b, NOW())',
            [':id' => $id, ':i' => $intentos, ':b' => $bloqueado]
        );
    }

    public function clear(string $identificador): void
    {
        $id = $this->normalizeId($identificador);
        $this->exec('DELETE FROM intentos_login WHERE identificador = :id', [':id' => $id]);
    }

    private function normalizeId(string $identificador): string
    {
        return substr(strtolower(trim($identificador)), 0, 120);
    }
}
