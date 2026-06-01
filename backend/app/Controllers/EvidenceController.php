<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Models\Evidence;
use App\Models\Subgroup;
use App\Services\AuditService;
use App\Services\EvidenceFormatService;

final class EvidenceController extends Controller
{
    public function tree(): void
    {
        $this->success((new Evidence())->tree());
    }

    public function index(): void
    {
        $this->success((new Evidence())->flat());
    }

    public function store(): void
    {
        RoleMiddleware::requireStaff();
        $data = $this->input();
        $this->validate($data, [
            'id_subgrupo' => 'required',
            'codigo'      => 'required|max:20',
            'nombre'      => 'required|max:180',
            'tipo_archivo'=> 'required',
        ]);
        $format = $this->resolveEvidenceFormat($data);
        $id = (new Evidence())->insert([
            'id_subgrupo'    => (int) $data['id_subgrupo'],
            'codigo'         => $data['codigo'],
            'nombre'         => $data['nombre'],
            'descripcion'    => $data['descripcion']  ?? null,
            'obligatoria'    => (int) ($data['obligatoria'] ?? 1),
            'orden'          => (int) ($data['orden'] ?? 0),
            'tipo_archivo'   => $format,
            'tamano_max_mb'  => (int) ($data['tamano_max_mb'] ?? 10),
        ]);
        AuditService::log('evidence_create', 'evidencias_master', $id);
        $this->success(['id' => $id], 'Evidencia creada.', 201);
    }

    public function update(int $id): void
    {
        RoleMiddleware::requireStaff();
        $data = $this->input();
        $m = new Evidence();
        if (!$m->find($id)) { $this->error('Evidencia no encontrada.', 404); }
        $patch = array_intersect_key($data, array_flip(['id_subgrupo','codigo','nombre','descripcion','obligatoria','orden','activo','tipo_archivo','tamano_max_mb']));
        if (isset($patch['tipo_archivo']) || isset($patch['id_subgrupo'])) {
            $patch['tipo_archivo'] = $this->resolveEvidenceFormat(array_merge($m->find($id) ?: [], $patch));
        }
        $m->update($id, $patch);
        AuditService::log('evidence_update', 'evidencias_master', $id);
        $this->success(null, 'Evidencia actualizada.');
    }

    public function destroy(int $id): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        (new Evidence())->delete($id);
        AuditService::log('evidence_delete', 'evidencias_master', $id);
        $this->success(null, 'Evidencia eliminada.');
    }

    public function createSubgroup(): void
    {
        RoleMiddleware::requireStaff();
        $data = $this->input();
        $this->validate($data, ['id_modulo' => 'required', 'codigo' => 'required', 'nombre' => 'required']);
        $id = (new Subgroup())->insert([
            'id_modulo' => (int) $data['id_modulo'],
            'codigo'    => $data['codigo'],
            'nombre'    => $data['nombre'],
            'icono'     => $data['icono'] ?? null,
            'orden'     => (int) ($data['orden'] ?? 0),
            'activo'    => 1,
        ]);
        AuditService::log('subgroup_create', 'subgrupos', $id);
        $this->success(['id' => $id], 'Subgrupo creado.', 201);
    }

    /** @param array<string,mixed> $data */
    private function resolveEvidenceFormat(array $data): string
    {
        $subId = (int) ($data['id_subgrupo'] ?? 0);
        if ($subId <= 0) {
            $this->error('Subgrupo inválido.', 422);
        }

        $db = \App\Config\Database::connection();
        $stmt = $db->prepare(
            'SELECT m.codigo AS modulo_codigo
             FROM subgrupos s
             JOIN modulos m ON m.id_modulo = s.id_modulo
             WHERE s.id_subgrupo = :s LIMIT 1'
        );
        $stmt->execute([':s' => $subId]);
        $row = $stmt->fetch();
        if (!$row) {
            $this->error('Subgrupo no encontrado.', 404);
        }

        $format = EvidenceFormatService::normalize((string) ($data['tipo_archivo'] ?? ''));
        $modulo = (string) ($row['modulo_codigo'] ?? 'GF');
        if (!EvidenceFormatService::isAllowedForModule($format, $modulo)) {
            $this->error(
                'El formato seleccionado no está permitido para evidencias del módulo ' . $modulo . '.',
                422
            );
        }

        return $format;
    }
}
