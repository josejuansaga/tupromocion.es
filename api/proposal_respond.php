<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Metodo no permitido.'], 405);
}

$input = webinmo_json_input();
$slug = (string) ($input['slug'] ?? '');
$action = (string) ($input['action'] ?? '');
$message = trim((string) ($input['message'] ?? ''));

$result = webinmo_respond_to_public_proposal($slug, $action, $message);
webinmo_respond([
    'ok' => $result['ok'] ?? false,
    'authenticated' => false,
    'alreadyResponded' => $result['alreadyResponded'] ?? false,
    'status' => $result['status'] ?? ($result['action'] ?? ''),
    'respondedAt' => $result['respondedAt'] ?? '',
    'error' => $result['error'] ?? '',
], ($result['ok'] ?? false) ? 200 : 422);
