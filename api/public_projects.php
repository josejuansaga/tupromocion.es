<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_respond([
    'ok' => true,
    'authenticated' => false,
    'data' => [
        'projects' => webinmo_public_projects(),
    ],
]);
