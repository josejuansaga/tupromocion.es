<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();
$input = webinmo_json_input();
$type = trim((string) ($input['type'] ?? ''));
$entityId = trim((string) ($input['id'] ?? ''));
$backupId = trim((string) ($input['backupId'] ?? ''));

if ($type === '' || $entityId === '' || $backupId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Copia no valida.'], 422);
}

if ($type === 'project') {
    $project = webinmo_load_project($entityId);
    if (!$project || !webinmo_can_access_project($project)) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No tienes acceso a esta promocion.'], 403);
    }
    $backup = webinmo_find_project_backup($entityId, $backupId);
    if (!$backup || !is_array($backup['data'] ?? null)) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha encontrado la copia.'], 404);
    }
    $restored = $backup['data'];
    $restored['updatedAt'] = date(DATE_ATOM);
    $result = webinmo_upsert_project($restored);
    if (!$result['ok']) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
    }
    webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
}

if ($type === 'user') {
    $backup = webinmo_find_user_backup($entityId, $backupId);
    if (!$backup || !is_array($backup['data'] ?? null)) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha encontrado la copia.'], 404);
    }
    $result = webinmo_upsert_user($backup['data']);
    if (!$result['ok']) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
    }
    webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
}

webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Tipo de copia no valido.'], 422);
