<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$projectId = trim((string) ($_GET['id'] ?? ''));
if ($projectId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no valida.'], 422);
}

$project = webinmo_load_project($projectId);
if (!$project || !is_array($project)) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no encontrada.'], 404);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => false,
    'data' => [
        'project' => $project,
    ],
]);
