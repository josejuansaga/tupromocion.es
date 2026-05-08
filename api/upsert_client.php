<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();
$input = webinmo_json_input();
$client = $input['client'] ?? null;

if (!is_array($client) || empty($client['id'])) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Cliente no valido.'], 422);
}

if (!webinmo_upsert_client($client)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha podido guardar el cliente.'], 500);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
