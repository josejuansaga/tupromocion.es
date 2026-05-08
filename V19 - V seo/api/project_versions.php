<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();
$projectId = trim((string) ($_GET['projectId'] ?? ''));
if ($projectId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Promocion no valida.'], 422);
}

$project = webinmo_load_project($projectId);
if (!$project || !webinmo_can_access_project($project)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No tienes acceso a esta promocion.'], 403);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'data' => [
        'versions' => webinmo_project_version_summaries($projectId),
    ],
]);
