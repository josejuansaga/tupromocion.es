<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();

$payload = webinmo_json_input();
$proposalId = trim((string) ($payload['id'] ?? ''));
if ($proposalId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Falta el identificador del presupuesto.'], 422);
}

$result = webinmo_delete_proposal($proposalId);
webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => true,
    'error' => $result['error'] ?? '',
    'data' => webinmo_bootstrap_payload(),
], ($result['ok'] ?? false) ? 200 : 422);
