<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();

$type = trim((string) ($_GET['type'] ?? ''));
$entityId = trim((string) ($_GET['id'] ?? ''));

if ($type === '' || $entityId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Copia no valida.'], 422);
}

if ($type === 'project') {
    $project = webinmo_load_project($entityId);
    if (!$project || !webinmo_can_access_project($project)) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No tienes acceso a esta promocion.'], 403);
    }
    webinmo_respond([
        'ok' => true,
        'authenticated' => true,
        'data' => [
            'backups' => webinmo_project_backup_summaries($entityId),
        ],
    ]);
}

if ($type === 'user') {
    $user = null;
    foreach (webinmo_load_users() as $entry) {
        if ((string) ($entry['id'] ?? '') === $entityId) {
            $user = $entry;
            break;
        }
    }
    if (!$user) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Usuario no encontrado.'], 404);
    }
    webinmo_respond([
        'ok' => true,
        'authenticated' => true,
        'data' => [
            'backups' => webinmo_user_backup_summaries($entityId),
        ],
    ]);
}

webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Tipo de copia no valido.'], 422);
