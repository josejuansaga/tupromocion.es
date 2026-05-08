<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_auth();
$input = webinmo_json_input();
$projectId = trim((string) ($input['projectId'] ?? ''));
$versionId = trim((string) ($input['versionId'] ?? ''));

if ($projectId === '' || $versionId === '') {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Version no valida.'], 422);
}

$project = webinmo_load_project($projectId);
if (!$project || !webinmo_can_access_project($project)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No tienes acceso a esta promocion.'], 403);
}

$versions = webinmo_load_project_versions($projectId);
$selected = null;
foreach ($versions as $version) {
    if ((string) ($version['id'] ?? '') === $versionId) {
        $selected = $version;
        break;
    }
}

if (!$selected || !is_array($selected['state'] ?? null)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha encontrado la version.'], 404);
}

$restored = $project;
$restored['updatedAt'] = date(DATE_ATOM);
$restored['state'] = $selected['state'];
$restored['name'] = (string) ($selected['name'] ?? ($project['name'] ?? 'Proyecto sin titulo'));
$result = webinmo_upsert_project($restored);
if (!$result['ok']) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => $result['error']], 500);
}

webinmo_respond(['ok' => true, 'authenticated' => true, 'data' => webinmo_bootstrap_payload()]);
