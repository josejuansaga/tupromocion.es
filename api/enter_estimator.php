<?php
declare(strict_types=1);
require __DIR__ . '/_lib.php';

webinmo_require_admin();
webinmo_grant_estimator_access();

$next = (string) ($_GET['next'] ?? '/estimator/');
if (!preg_match('#^/estimator(?:/|$)#', $next)) {
    $next = '/estimator/';
}

header('Location: ' . $next, true, 302);
exit;
