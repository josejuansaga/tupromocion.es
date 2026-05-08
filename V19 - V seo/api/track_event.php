<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$input = webinmo_json_input();
$projectId = trim((string) ($input['projectId'] ?? ''));
$type = trim((string) ($input['type'] ?? ''));

$result = webinmo_track_event($projectId, $type);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => $result['error']], 422);
}

webinmo_respond(['ok' => true, 'authenticated' => false, 'data' => $result['data'] ?? []]);
