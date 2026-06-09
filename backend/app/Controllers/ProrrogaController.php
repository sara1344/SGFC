<?php
namespace App\Controllers;

use App\Middlewares\RoleMiddleware;
use App\Middlewares\RlsMiddleware;
use App\Services\PeriodExtensionService;

final class ProrrogaController extends Controller
{
    /** POST /api/periods/{id}/prorroga */
    public function request(int $periodId): void
    {
        RlsMiddleware::ownsPeriod($periodId);
        $user = $this->user();
        $row = PeriodExtensionService::request($periodId, (int) $user['id'], $this->input());
        $this->success($row, 'Solicitud de prórroga enviada al administrativo.');
    }

    /** GET /api/prorrogas/{id} */
    public function show(int $id): void
    {
        $user = $this->user();
        $row = PeriodExtensionService::detailForUser($id, $user);
        if (!$row) {
            $this->error('Solicitud no encontrada.', 404);
        }
        $this->success($row);
    }

    /** POST /api/prorrogas/{id}/approve */
    public function approve(int $id): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $row = PeriodExtensionService::approve($id, $user, $this->input());
        $this->success($row, 'Prórroga aprobada.');
    }

    /** POST /api/prorrogas/{id}/reject */
    public function reject(int $id): void
    {
        RoleMiddleware::requireStaff();
        $user = $this->user();
        $data = $this->input();
        $obs = isset($data['observacion']) ? (string) $data['observacion'] : '';
        $row = PeriodExtensionService::reject($id, $user, $obs);
        $this->success($row, 'Prórroga rechazada.');
    }
}
