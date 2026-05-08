<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();
$input = webinmo_json_input();
$clientId = trim((string) ($input['id'] ?? ''));

if ($clientId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Cliente no valido.'], 422);
}

$result = webinmo_delete_client($clientId);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 409);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
