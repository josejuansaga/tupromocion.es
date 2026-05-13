<?php
// Script de migración: genera miniaturas para imágenes existentes
// Eliminar este archivo tras ejecutarlo
declare(strict_types=1);

if (($_GET['token'] ?? '') !== 'thumb2026') {
    http_response_code(403); die('Forbidden');
}

require __DIR__ . '/_lib.php';

$assetsDir = WEBINMO_ASSETS_DIR;
$done = 0; $skipped = 0; $errors = [];

if (!is_dir($assetsDir)) { die('No existe el directorio assets'); }

foreach (new DirectoryIterator($assetsDir) as $projectDir) {
    if (!$projectDir->isDir() || $projectDir->isDot()) continue;
    foreach (new DirectoryIterator($projectDir->getPathname()) as $file) {
        if (!$file->isFile()) continue;
        $ext = strtolower($file->getExtension());
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) continue;
        if (str_ends_with($file->getBasename('.'.$ext), '-thumb')) continue; // ya es miniatura

        $src  = $file->getPathname();
        $base = $file->getBasename('.'.$ext);
        $dst  = $projectDir->getPathname() . '/' . $base . '-thumb.jpg';

        if (file_exists($dst)) { $skipped++; continue; }

        $mime = match($ext) {
            'jpg','jpeg' => 'image/jpeg',
            'png'        => 'image/png',
            'webp'       => 'image/webp',
            default      => '',
        };

        webinmo_generate_thumb($src, $dst, $mime, 480);

        if (file_exists($dst)) { $done++; }
        else { $errors[] = $file->getFilename(); }
    }
}

header('Content-Type: application/json');
echo json_encode(['ok' => true, 'generated' => $done, 'skipped' => $skipped, 'errors' => $errors]);
