<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();

$projectId = '';
$hint = 'asset';
$result = ['ok' => false, 'error' => 'Archivo no valido.'];

if (!empty($_FILES['file'])) {
    $projectId = trim((string) ($_POST['projectId'] ?? ''));
    $hint = trim((string) ($_POST['hint'] ?? 'asset'));
    if ($projectId === '') {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Archivo no valido.'], 422);
    }
    $result = webinmo_store_uploaded_asset($projectId, $hint, $_FILES['file']);
} else {
    $input = webinmo_json_input();
    $projectId = trim((string) ($input['projectId'] ?? ''));
    $hint = trim((string) ($input['hint'] ?? 'asset'));
    $dataUrl = (string) ($input['dataUrl'] ?? '');

    if ($projectId === '' || $dataUrl === '') {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Archivo no valido.'], 422);
    }

    $result = webinmo_store_asset($projectId, $hint, $dataUrl);
}

if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => ['path' => $result['path']]]);
