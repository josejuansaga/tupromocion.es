<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_ensure_storage();

$slug = trim((string) ($_GET['slug'] ?? ''));
if ($slug === '') {
    webinmo_respond(['ok' => false, 'error' => 'Falta el enlace del presupuesto.'], 404);
}

$proposal = webinmo_find_public_proposal($slug);
if (!$proposal) {
    webinmo_respond(['ok' => false, 'error' => 'Presupuesto no encontrado.'], 404);
}

webinmo_respond([
    'ok' => true,
    'data' => [
        'proposal' => $proposal,
    ],
]);
