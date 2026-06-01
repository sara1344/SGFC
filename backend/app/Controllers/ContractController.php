<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Middlewares\RlsMiddleware;
use App\Models\Contract;
use App\Models\User;
use App\Services\AuditService;
use App\Services\PermissionService;

final class ContractController extends Controller
{
    public function index(): void
    {
        $user = $this->user();
        $isStaff = PermissionService::isStaff($user);
        $idCentro = PermissionService::isCenterAdmin($user)
            ? PermissionService::requireCentroId($user)
            : null;
        $rows = (new Contract())->listForUser((int) $user['id'], $isStaff, $idCentro);
        $this->success($rows);
    }

    public function show(int $id): void
    {
        RlsMiddleware::ownsContract($id);
        $row = (new Contract())->detail($id);
        if (!$row) { $this->error('Contrato no encontrado.', 404); }
        $this->success($row);
    }

    public function store(): void
    {
        RoleMiddleware::requireRole(['Super Admin', 'Administrativo de Centro']);
        $data = $this->input();
        $this->validate($data, [
            'id_persona'      => 'required',
            'fecha_inicio'    => 'required',
            'fecha_fin'       => 'required',
            'tipo_contrato'   => 'required',
            'area_aplicacion' => 'required|min:5',
            'estado'          => 'required',
        ]);

        $personId = (int) $data['id_persona'];
        $person = (new User())->withRole($personId);
        if (!$person || ($person['nombre_perfil'] ?? '') !== 'contratista') {
            $this->error('Seleccione un contratista válido.', 422);
        }
        if ((int) ($person['activo'] ?? 0) !== 1) {
            $this->error('Solo puede crear contratos para contratistas activos.', 422);
        }
        if (PermissionService::isCenterAdmin($this->user())) {
            $centro = PermissionService::requireCentroId($this->user());
            if (!PermissionService::personBelongsToCentro($personId, $centro)) {
                $this->error('Solo puede crear contratos para contratistas de su centro de formación.', 403);
            }
        }

        $m = new Contract();
        $id = $m->insert([
            'id_persona'      => $personId,
            'fecha_inicio'    => $data['fecha_inicio'],
            'fecha_fin'       => $data['fecha_fin'],
            'tipo_contrato'   => (int) $data['tipo_contrato'],
            'estado'          => trim((string) $data['estado']),
            'area_aplicacion' => trim((string) $data['area_aplicacion']),
        ]);
        $this->autoGeneratePeriods($id, $data['fecha_inicio'], $data['fecha_fin']);

        AuditService::log('contract_create', 'contratos', $id);
        $this->success(['id' => $id], 'Contrato creado con periodos.', 201);
    }

    public function update(int $id): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        $data = $this->input();
        $this->validate($data, [
            'id_persona'      => 'required',
            'fecha_inicio'    => 'required',
            'fecha_fin'       => 'required',
            'tipo_contrato'   => 'required',
            'area_aplicacion' => 'required|min:5',
            'estado'          => 'required',
        ]);
        $m = new Contract();
        $cur = $m->find($id);
        if (!$cur) { $this->error('Contrato no encontrado.', 404); }
        $patch = [
            'id_persona'      => (int) $data['id_persona'],
            'fecha_inicio'    => $data['fecha_inicio'],
            'fecha_fin'       => $data['fecha_fin'],
            'tipo_contrato'   => (int) $data['tipo_contrato'],
            'estado'          => trim((string) $data['estado']),
            'area_aplicacion' => trim((string) $data['area_aplicacion']),
        ];
        $m->update($id, $patch);
        AuditService::log('contract_update', 'contratos', $id);
        $this->success(null, 'Contrato actualizado.');
    }

    public function destroy(int $id): void
    {
        RoleMiddleware::requireRole(['Super Admin']);
        (new Contract())->delete($id);
        AuditService::log('contract_delete', 'contratos', $id);
        $this->success(null, 'Contrato eliminado.');
    }

    private function autoGeneratePeriods(int $idContrato, string $fechaInicio, string $fechaFin): void
    {
        $start = new \DateTime($fechaInicio);
        $end   = new \DateTime($fechaFin);
        $now   = new \DateTime();
        $meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        $cur = (clone $start)->modify('first day of this month');
        $endM = (clone $end)->modify('first day of this month');
        $db = \App\Config\Database::connection();
        $stmt = $db->prepare("INSERT IGNORE INTO periodos
                              (id_contrato, mes, anio, nombre_periodo, fecha_apertura, fecha_limite, estado, avance)
                              VALUES (:c,:m,:y,:n,:a,:l,:e,0)");
        while ($cur <= $endM) {
            $mes = (int) $cur->format('n');
            $anio = (int) $cur->format('Y');
            $apert = (new \DateTime("$anio-$mes-01"))->format('Y-m-d');
            $lim   = (new \DateTime("$anio-$mes-01"))->modify('last day of this month')->format('Y-m-d');
            $estadoP = ($cur > $now) ? 'Bloqueado' : 'Activo';
            $stmt->execute([
                ':c' => $idContrato,
                ':m' => $mes,
                ':y' => $anio,
                ':n' => $meses[$mes - 1] . ' ' . $anio,
                ':a' => $apert,
                ':l' => $lim,
                ':e' => $estadoP,
            ]);
            $cur->modify('+1 month');
        }
    }
}
