<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$result = webinmo_submit_lead(webinmo_json_input());
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => $result['error']], 422);
}

webinmo_respond(['ok' => true, 'authenticated' => false, 'data' => $result['data'] ?? []]);
