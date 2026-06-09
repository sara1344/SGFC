<?php
namespace App\Models;

final class PasswordResetToken extends Model
{
    protected string $table = 'password_reset_tokens';
    protected string $primaryKey = 'id';

    public function invalidateForUser(int $personaId): void
    {
        $this->exec(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id_persona = :p AND used_at IS NULL',
            [':p' => $personaId]
        );
    }

    public function create(int $personaId, string $tokenHash, string $expiresAt): int
    {
        return $this->insert([
            'id_persona' => $personaId,
            'token_hash' => $tokenHash,
            'expires_at' => $expiresAt,
        ]);
    }

    public function findValid(string $tokenHash): ?array
    {
        return $this->one(
            'SELECT t.*, p.usuario, p.nombres, p.Apellidos, p.correo, p.activo
             FROM password_reset_tokens t
             JOIN personas p ON p.id_persona = t.id_persona
             WHERE t.token_hash = :h
               AND t.used_at IS NULL
               AND t.expires_at > NOW()
               AND COALESCE(p.activo, 1) = 1
             LIMIT 1',
            [':h' => $tokenHash]
        );
    }

    public function markUsed(int $id): void
    {
        $this->exec(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = :id',
            [':id' => $id]
        );
    }

    public function countRecentForUser(int $personaId, int $minutes = 60): int
    {
        $row = $this->one(
            'SELECT COUNT(*) AS c FROM password_reset_tokens
             WHERE id_persona = :p AND created_at > DATE_SUB(NOW(), INTERVAL :m MINUTE)',
            [':p' => $personaId, ':m' => $minutes]
        );
        return (int) ($row['c'] ?? 0);
    }
}
