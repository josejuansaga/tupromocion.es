<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_ensure_storage();

if (!webinmo_is_authenticated()) {
    webinmo_respond([
        'ok' => true,
        'authenticated' => false,
        'data' => [
            'clients' => [],
            'users' => [],
            'projects' => [],
        ],
    ]);
}

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'data' => webinmo_bootstrap_payload(),
]);
