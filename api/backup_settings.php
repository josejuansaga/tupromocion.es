<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = webinmo_json_input();
    $settings = $input['settings'] ?? [];
    if (!is_array($settings) || !webinmo_save_backup_settings($settings)) {
        webinmo_respond(['ok' => false, 'authenticated' => true, 'error' => 'No se ha podido guardar la configuracion de copias.'], 500);
    }

    webinmo_respond([
        'ok' => true,
        'authenticated' => true,
        'data' => webinmo_bootstrap_payload(),
    ]);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'data' => [
        'settings' => webinmo_load_backup_settings(),
    ],
]);
