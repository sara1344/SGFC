<?php
namespace App\Models;

final class Contract extends Model
{
    protected string $table = 'contratos';
    protected string $primaryKey = 'id_contrato';

    public function listForUser(?int $contratistaId = null, bool $isStaff = false, ?int $idCentro = null): array
    {
        $sql = "SELECT c.*, p.nombres, p.Apellidos, p.correo, tc.nombre_contrato AS tipo_nombre
                FROM contratos c
                LEFT JOIN personas p     ON p.id_persona = c.id_persona
                LEFT JOIN tipos_contrato tc ON tc.id_tipo_contrato = c.tipo_contrato
                WHERE 1=1";
        $params = [];
        if (!$isStaff && $contratistaId !== null) {
            $sql .= ' AND c.id_persona = :uid';
            $params[':uid'] = $contratistaId;
        }
        if ($idCentro !== null && $idCentro > 0) {
            $sql .= ' AND p.id_centro = :id_centro';
            $params[':id_centro'] = $idCentro;
        }
        $sql .= ' ORDER BY c.fecha_inicio DESC';
        return $this->query($sql, $params);
    }

    public function detail(int $id): ?array
    {
        $sql = "SELECT c.*, p.nombres, p.Apellidos, p.correo, tc.nombre_contrato AS tipo_nombre
                FROM contratos c
                LEFT JOIN personas p     ON p.id_persona = c.id_persona
                LEFT JOIN tipos_contrato tc ON tc.id_tipo_contrato = c.tipo_contrato
                WHERE c.id_contrato = :id";
        return $this->one($sql, [':id' => $id]);
    }

    public function activeContractOf(int $personaId): ?array
    {
        $sql = "SELECT * FROM contratos WHERE id_persona = :id AND estado = 'Activo'
                ORDER BY fecha_inicio DESC LIMIT 1";
        return $this->one($sql, [':id' => $personaId]);
    }
}
