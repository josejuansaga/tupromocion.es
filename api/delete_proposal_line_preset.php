<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();

$payload = webinmo_json_input();
$presetId = (string) ($payload['id'] ?? '');
$result = webinmo_delete_proposal_line_preset($presetId);

webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => true,
    'error' => $result['error'] ?? '',
    'data' => webinmo_bootstrap_payload(),
], ($result['ok'] ?? false) ? 200 : 422);
