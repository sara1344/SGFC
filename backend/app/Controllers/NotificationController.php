<?php
namespace App\Controllers;

use App\Models\Notification;
use App\Models\NotificationDetail;

final class NotificationController extends Controller
{
    public function index(): void
    {
        $user = $this->user();
        $tipo = $_GET['tipo'] ?? null;
        $unread = !empty($_GET['unread']);
        $model = new Notification();
        $items = $model->forUser((int) $user['id'], $tipo, $unread);

        $this->success([
            'items'  => $items,
            'unread' => $model->unreadCount((int) $user['id']),
        ]);
    }

    public function show(int $id): void
    {
        $user = $this->user();
        $model = new Notification();
        $row = $model->findForUser($id, (int) $user['id']);
        if (!$row) {
            $this->error('Notificación no encontrada.', 404);
        }

        $details = (new NotificationDetail())->forNotification($id);
        if (!empty($details) && (int) $row['leida'] === 0) {
            $model->markRead($id, (int) $user['id']);
            $row['leida'] = 1;
        }

        $this->success([
            'notification' => $row,
            'detalles'     => $details,
        ]);
    }

    public function markRead(int $id): void
    {
        $user = $this->user();
        (new Notification())->markRead($id, (int) $user['id']);
        $this->success(null, 'Marcada como leída.');
    }

    public function markAllRead(): void
    {
        $user = $this->user();
        $n = (new Notification())->markAllRead((int) $user['id']);
        $this->success(['updated' => $n], 'Todas marcadas como leídas.');
    }
}
