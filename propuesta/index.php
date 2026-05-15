<?php
declare(strict_types=1);

$slug = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) ($_GET['slug'] ?? ''));
$canonical = 'https://tupromocion.es/propuesta/' . $slug;

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, no-cache');
?>
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260515b" />
    <title>Propuesta comercial | TuPromocion.es</title>
    <meta name="description" content="Propuesta visual 3D online con presupuesto, ejemplos, fases y condiciones." />
    <meta name="robots" content="noindex, nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="<?php echo htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8'); ?>" />
    <meta property="og:title" content="Propuesta comercial | TuPromocion.es" />
    <meta property="og:description" content="Revisa tu propuesta personalizada de Tu Casa en 3D." />
    <meta property="og:image" content="https://tupromocion.es/img/tupromocion-logo.png" />
    <meta property="og:site_name" content="TuPromocion.es" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css?v=20260515b" />
  </head>
  <body>
    <script>window.PROPOSAL_PUBLIC_SLUG = <?php echo json_encode($slug, JSON_UNESCAPED_SLASHES); ?>;</script>
    <div id="proposal-root">
      <main class="proposal-page">
        <section class="proposal-section">
          <div class="proposal-section__inner">
            <div class="proposal-card" style="text-align:center;padding:3rem 1.5rem;">
              <p style="color:#888;font-size:.9rem;">Cargando propuesta...</p>
            </div>
          </div>
        </section>
      </main>
    </div>
    <script src="/proposal-template.js?v=20260515b"></script>
  </body>
</html>
