<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_estimator_access();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    webinmo_respond([
        'ok' => true,
        'authenticated' => true,
        'data' => [
            'catalog' => webinmo_load_estimator_catalog(),
        ],
    ]);
}

$payload = webinmo_json_input();
$catalog = $payload['catalog'] ?? null;
if (!is_array($catalog)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'Catálogo no válido.'], 422);
}

if (!webinmo_save_estimator_catalog($catalog)) {
    webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha podido guardar el catálogo.'], 500);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'data' => [
        'catalog' => webinmo_load_estimator_catalog(),
    ],
]);
