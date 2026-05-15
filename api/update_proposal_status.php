<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();

$input = webinmo_json_input();
$proposalId = (string) ($input['id'] ?? '');
$status = (string) ($input['status'] ?? '');

$result = webinmo_update_proposal_status($proposalId, $status);
webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => true,
    'error' => $result['error'] ?? '',
    'data' => webinmo_bootstrap_payload(),
], ($result['ok'] ?? false) ? 200 : 422);
