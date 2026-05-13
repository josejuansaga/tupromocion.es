<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

$projectId = trim((string) ($_GET['id'] ?? ''));
$slug      = trim((string) ($_GET['slug'] ?? ''));

// Resolve slug to project ID
if ($slug !== '' && $projectId === '') {
    $index = webinmo_load_project_index();
    foreach ($index as $meta) {
        if (($meta['slug'] ?? '') === $slug) {
            $projectId = (string) ($meta['id'] ?? '');
            break;
        }
    }
}

if ($projectId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no valida.'], 422);
}

$project = webinmo_load_project($projectId);
if (!$project || !is_array($project)) {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no encontrada.'], 404);
}

$status = (string) ($project['status'] ?? 'draft');
if ($status !== 'published' && $status !== 'unlisted') {
    webinmo_respond(['ok' => false, 'authenticated' => false, 'error' => 'Promocion no encontrada.'], 404);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => false,
    'data' => [
        'project' => $project,
    ],
]);
