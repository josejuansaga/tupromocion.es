<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();
$input = webinmo_json_input();
$projectId = trim((string) ($input['id'] ?? ''));

if ($projectId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Promocion no valida.'], 422);
}

$result = webinmo_delete_project($projectId);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
