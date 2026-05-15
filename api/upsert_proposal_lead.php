<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();

$payload = webinmo_json_input();
$lead = $payload['lead'] ?? null;
if (!is_array($lead)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Faltan los datos del lead.'], 422);
}

$result = webinmo_upsert_proposal_lead($lead);
webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => true,
    'error' => $result['error'] ?? '',
    'data' => webinmo_bootstrap_payload(),
], ($result['ok'] ?? false) ? 200 : 422);
