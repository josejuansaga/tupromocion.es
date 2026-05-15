<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_estimator_access();

webinmo_respond([
    'ok' => true,
    'authenticated' => true,
    'estimatorAllowed' => true,
    'data' => webinmo_bootstrap_payload(),
]);
