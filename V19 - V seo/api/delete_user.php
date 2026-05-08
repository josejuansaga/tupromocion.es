<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();
$input = webinmo_json_input();
$userId = trim((string) ($input['id'] ?? ''));

if ($userId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Usuario no valido.'], 422);
}

$result = webinmo_delete_user($userId);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 409);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
