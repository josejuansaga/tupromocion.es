<?php
/**
 * index.php — Home pública de tupromocion.es
 *
 * Sirve el HTML público con los proyectos publicados renderizados en servidor (SSR)
 * para que Google, WhatsApp y redes sociales lean contenido real desde el primer byte.
 *
 * El panel privado (/admin/) sigue sirviendo su propio HTML completo a través de
 * admin/index.php — aquí nunca se incluyen secciones del panel.
 */
declare(strict_types=1);

// ---------------------------------------------------------------------------
// 1. Leer proyectos publicados desde storage (sin incluir _lib.php)
// ---------------------------------------------------------------------------

$storageRoot  = __DIR__ . '/storage';
$indexFile    = $storageRoot . '/project-index.json';
$projectsDir  = $storageRoot . '/projects';

/**
 * Lee un archivo JSON y devuelve un array, o null si no existe / es inválido.
 */
function wp_read_json(string $path): ?array {
    if (!file_exists($path)) {
        return null;
    }
    $content = file_get_contents($path);
    if ($content === false || $content === '') {
        return null;
    }
    $decoded = json_decode($content, true);
    return is_array($decoded) ? $decoded : null;
}

/** Escapa una cadena para usarla de forma segura en HTML. */
function wp_esc(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

// Cargar índice y filtrar solo publicados
$projectIndex = wp_read_json($indexFile) ?? [];
$projects     = [];

foreach ($projectIndex as $meta) {
    if (!is_array($meta) || empty($meta['id'])) {
        continue;
    }
    if ((string) ($meta['status'] ?? 'draft') !== 'published') {
        continue;
    }
    $safeId      = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $meta['id']);
    $projectFile = $projectsDir . '/' . $safeId . '.json';
    $full        = wp_read_json($projectFile);
    if (!$full) {
        continue;
    }
    $projects[] = array_merge($meta, $full);
}

// Ordenar por updatedAt descendente (más recientes primero)
usort($projects, static function (array $a, array $b): int {
    return strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? ''));
});

$count     = count($projects);
$countText = $count === 1 ? '1 proyecto' : "$count proyectos";

// ---------------------------------------------------------------------------
// 2. Construir tarjetas de proyecto SSR (misma estructura que el JS)
// ---------------------------------------------------------------------------

function wp_build_project_card(array $project, int $index): string {
    $state       = is_array($project['state'] ?? null) ? $project['state'] : [];
    $id          = wp_esc(preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($project['id'] ?? '')));
    $name        = wp_esc((string) ($state['projectName'] ?? $project['name'] ?? 'Promoción'));
    $headline    = wp_esc(trim((string) ($state['headline'] ?? '')) ?: 'Promoción inmobiliaria publicada');
    $companyName = wp_esc(trim((string) ($project['clientName'] ?? $state['companyName'] ?? '')));
    $city        = trim((string) ($state['city'] ?? ''));
    $province    = trim((string) ($state['province'] ?? ''));
    $location    = wp_esc(implode(', ', array_filter([$city, $province])));
    $address     = wp_esc(trim((string) ($state['locationName'] ?? '')));
    $cover       = wp_esc(trim((string) ($state['cover'] ?? ($state['logo'] ?? ''))));
    $priceFrom   = wp_esc(trim((string) ($state['priceFrom'] ?? '')));
    $cardLabel   = wp_esc(trim((string) ($state['cardLabel'] ?? '')) ?: 'Obra nueva');
    $floors      = is_array($state['floors'] ?? null) ? count($state['floors']) : 0;
    $href        = wp_esc('/?promo=' . $id);
    $num         = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);

    $coverHtml       = $cover
        ? "<img src=\"$cover\" alt=\"$name\" loading=\"" . ($index < 2 ? 'eager' : 'lazy') . "\" />"
        : "<div class=\"public-project-card__placeholder\">$num</div>";
    $priceHtml       = $priceFrom ? "<span class=\"public-project-card__price\">$priceFrom</span>" : '';
    $locationTopHtml = $location ? "<span class=\"public-project-card__location\">$location</span>" : '';
    $companyHtml     = $companyName ? "<span>$companyName</span>" : '';
    $locationMetaHtml = $location ? "<span>$location</span>" : '';
    $addressHtml     = $address ? "<span>$address</span>" : '';
    $typologyStr     = $floors > 0
        ? "<span>$floors " . ($floors === 1 ? 'tipología' : 'tipologías') . '</span>'
        : '';
    $footerLabel     = wp_esc($city ?: ($province ?: ($companyName ?: 'TuPromoción.es')));

    return <<<HTML
<article class="public-project-card">
  <a class="public-project-card__media" href="$href">
    $coverHtml
    <div class="public-project-card__topline">
      <span class="public-project-card__tag">$cardLabel</span>
      $priceHtml
    </div>
    <div class="public-project-card__overlay">
      $locationTopHtml
    </div>
  </a>
  <div class="public-project-card__body">
    <h3>$name</h3>
    <p>$headline</p>
    <div class="public-project-card__meta">
      $companyHtml
      $locationMetaHtml
      $addressHtml
      $typologyStr
    </div>
    <div class="public-project-card__footer">
      <strong>$footerLabel</strong>
      <a class="primary-btn primary-btn--compact" href="$href">Ver ficha completa</a>
    </div>
  </div>
</article>
HTML;
}

$ssrCards = '';
foreach ($projects as $i => $project) {
    $ssrCards .= wp_build_project_card($project, $i);
}
if ($ssrCards === '') {
    $ssrCards = '<div class="public-empty-state">Todavía no hay promociones publicadas.</div>';
}

// ---------------------------------------------------------------------------
// 3. Cargar index.html y aplicar parches de SSR
// ---------------------------------------------------------------------------

$htmlFile = __DIR__ . '/index.html';
$html     = file_get_contents($htmlFile);

if ($html === false) {
    http_response_code(500);
    echo '<!DOCTYPE html><html><body>Error cargando la página.</body></html>';
    exit;
}

// 3a. Mostrar publicWorkspace sin hidden (el JS también lo controla, pero para
//     crawlers y usuarios sin JS el contenido debe ser visible desde el inicio)
$html = str_replace(
    '<section id="publicWorkspace" class="public-shell" hidden>',
    '<section id="publicWorkspace" class="public-shell">',
    $html
);

// 3b. Sustituir el contador estático "0 proyectos" por el real
$html = str_replace(
    '>0 proyectos</p>',
    '>' . wp_esc($countText) . '</p>',
    $html
);

// 3c. Inyectar las tarjetas SSR en la cuadrícula vacía
$html = str_replace(
    '<section id="publicProjectsGrid" class="public-projects-grid"></section>',
    '<section id="publicProjectsGrid" class="public-projects-grid">' . $ssrCards . '</section>',
    $html
);

// ---------------------------------------------------------------------------
// 4. Enviar respuesta
// ---------------------------------------------------------------------------

header('Content-Type: text/html; charset=utf-8');
// Sin caché agresiva: los proyectos pueden cambiar
header('Cache-Control: public, max-age=300, stale-while-revalidate=600');
echo $html;
