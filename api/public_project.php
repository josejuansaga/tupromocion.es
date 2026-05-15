<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$projectId = trim((string) ($_GET['id'] ?? ''));
$projectSlug = trim((string) ($_GET['slug'] ?? ''));
if ($projectId === '' && $projectSlug === '') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no valida.'], 422);
}

$project = $projectId !== '' ? webinmo_load_project($projectId) : webinmo_find_public_project_by_slug($projectSlug);
if (!$project || !is_array($project)) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no encontrada.'], 404);
}

if ((string) ($project['status'] ?? 'draft') !== 'published') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no encontrada.'], 404);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => false,
    'data' => [
        'project' => $project,
    ],
]);
