<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();
$input = webinmo_json_input();
$user = $input['user'] ?? null;

if (!is_array($user) || empty($user['id'])) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Usuario no valido.'], 422);
}

$result = webinmo_upsert_user($user);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
