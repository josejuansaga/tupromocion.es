<?php
declare(strict_types=1);

$html = file_get_contents(__DIR__ . '/../index.html');
if ($html === false) {
    http_response_code(500);
    echo 'No se ha podido cargar el panel.';
    exit;
}

$html = str_replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' . PHP_EOL . '    <base href="../" />',
    $html
);

echo $html;
