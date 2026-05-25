# Documento de continuidad - TuPromocion.es

Fecha: 2026-05-25  
Proyecto: TuPromocion.es / Estimator Tu Casa en 3D  
Repositorio: https://github.com/josejuansaga/tupromocion.es.git  
Rama principal: `master`  
Ultimo commit subido a GitHub: `c483e19 - Completa fase uno de presupuestos y backup storage`

## Resumen rapido

TuPromocion.es es una web comercial vinculada a los servicios 3D de Tu Casa en 3D. No debe plantearse como un portal barato de anuncios, sino como una herramienta para convertir renders, planos, videos, tours y fichas digitales en enlaces comerciales compartibles.

En las ultimas modificaciones se ha trabajado sobre todo en:

- Estimator / presupuestos online.
- Vista publica de propuestas.
- Tracking de visitas.
- Estados de propuestas.
- Backup automatico de `/storage/`.
- Correcciones de imagenes, rutas amigables y administracion.

## Estado actual

La web esta desplegada en produccion:

- Home: `https://tupromocion.es/`
- Admin: `https://tupromocion.es/admin/`
- Estimator: `https://tupromocion.es/estimator/`
- Ejemplo de propuesta: `https://tupromocion.es/propuesta/presupuesto-5eag0u`

El acceso al Estimator esta bloqueado para que solo se pueda entrar desde el Admin.

## Cambios recientes importantes

### 1. Presupuestos / Propuestas

Se completo la Fase 1 de presupuestos.

Cambios aplicados:

- Tracking de visitas a propuestas.
- Cada vez que un cliente abre una propuesta se guarda:
  - `viewCount`
  - `firstViewedAt`
  - `lastViewedAt`
  - `recentViews`
- Boton "Marcar como enviada" en dashboard y editor.
- Estado nuevo `rejected` / `Rechazada`.
- Filtro y busqueda en la lista de presupuestos.
- Columna de visitas en el dashboard del Estimator.
- Desglose de IVA/IRPF en la pagina publica de propuesta.
- Botones publicos para aceptar o rechazar propuesta.
- Al aceptar/rechazar:
  - Se actualiza el estado de la propuesta.
  - Se guarda `respondedAt`.
  - Se guarda posible mensaje de rechazo.
  - Se intenta enviar email al admin/emisor si el hosting permite `mail()`.
  - Queda aviso interno mediante campos tipo `adminNotificationUnread`.

Archivos principales:

- `api/_lib.php`
- `api/public_proposal.php`
- `api/proposal_respond.php`
- `api/update_proposal_status.php`
- `estimator/dashboard.js`
- `estimator/form.js`
- `estimator/common.js`
- `proposal-template.js`
- `propuesta/index.php`

### 2. Selector de emisor del presupuesto

Se anadio la opcion de elegir quien prepara el presupuesto.

Opciones actuales:

- Jose Juan, por defecto.
- Noelia.
- Manual.

Los datos del emisor aparecen en la vista publica del cliente y tambien se usan para el email/telefono de contacto.

Archivos:

- `estimator/common.js`
- `estimator/form.html`
- `estimator/form.js`

### 3. Backup automatico de storage

Se anadio un sistema de backup para `/storage/`.

Funcionamiento:

- Crea ZIPs de la carpeta `/storage/`.
- Excluye la propia carpeta de backups para evitar backups infinitos.
- Guarda las copias en `storage/backups/storage/`.
- Tiene retencion configurable.
- Se puede lanzar manualmente desde `Estimator > Centro de control`.
- Tambien puede lanzarse con cron mediante endpoint protegido por token.

Ruta del endpoint:

`/api/run_storage_backup.php?token=TOKEN`

Importante:

No poner el token en documentos publicos. El token se consulta desde `Estimator > Centro de control`, en el bloque "Backup diario de storage".

Archivos:

- `api/_lib.php`
- `api/run_storage_backup.php`
- `estimator/command-center.html`
- `estimator/command-center.js`
- `estimator/common.js`

### 4. Propuestas publicas

La ruta publica de propuestas es:

`/propuesta/{slug}`

Ejemplo:

`https://tupromocion.es/propuesta/presupuesto-5eag0u`

La pagina publica carga:

- Datos desde `/api/public_proposal.php?slug=...`
- Plantilla visual desde `proposal-template.js`
- Estilos desde `styles.css`

Se simplifico `propuesta/index.php` para evitar errores 500 y dejar la carga principal en JS.

### 5. Correcciones previas relevantes

Tambien se corrigio anteriormente:

- Rutas de imagenes en admin y fichas.
- Imagenes rotas dentro de promociones.
- URLs amigables para promociones.
- Diferencia entre enlaces del dashboard y de la portada.
- Ocultacion de "biblioteca de archivos" en configuracion de promociones.
- Etiqueta exterior editable, para que no siempre salga "Obra nueva".
- Optimizacion y marca de agua automatica en subidas de imagenes de promociones.
- Favicon usando el icono del logotipo.
- Home y textos comerciales para reforzar servicios 3D.

## Commits recientes

Ultimos commits importantes:

- `c483e19` - Completa fase uno de presupuestos y backup storage
- `f4ddd4a` - Anade responsable en presupuestos del estimator
- `1c09abf` - Corrige rutas de imagenes en admin y fichas
- `28020a0` - Mejoras comerciales y panel de promociones
- `de339bc` - URLs amigables /promocion/{slug} + deploy automatico
- `9ac7401` - Formulario inline de mensaje al rechazar propuesta
- `8c355ab` - Sistema de aceptacion/rechazo de propuestas
- `85ed293` - SEO, SSR home y propuesta/index.php con noindex

## Archivos clave

### Frontend publico

- `index.html`
- `styles.css`
- `app.js`
- `proposal-template.js`
- `promocion/index.php`
- `propuesta/index.php`

### Admin

- `admin/index.html`
- `app.js`

### Estimator

- `estimator/index.html`
- `estimator/dashboard.js`
- `estimator/form.html`
- `estimator/form.js`
- `estimator/common.js`
- `estimator/command-center.html`
- `estimator/command-center.js`
- `estimator/products.html`
- `estimator/products.js`
- `estimator/styles.css`

### API

- `api/_lib.php`
- `api/bootstrap.php`
- `api/estimator_bootstrap.php`
- `api/public_proposal.php`
- `api/proposal_respond.php`
- `api/update_proposal_status.php`
- `api/run_storage_backup.php`
- `api/upsert_proposal.php`
- `api/upload_asset.php`

### Datos

No sobrescribir nunca `storage/` en produccion.

Datos importantes dentro de `storage/`:

- `storage/proposals.json`
- `storage/project-index.json`
- `storage/projects/`
- `storage/assets/`
- `storage/backup-settings.json`
- `storage/backups/`

## Como continuar en otro ordenador

1. Clonar el repo:

```bash
git clone https://github.com/josejuansaga/tupromocion.es.git
cd tupromocion.es
```

2. Comprobar rama:

```bash
git checkout master
git pull origin master
git log --oneline -5
```

3. Verificar que el ultimo commit es:

```bash
c483e19 Completa fase uno de presupuestos y backup storage
```

4. No copiar encima de produccion la carpeta `storage/` local.

5. Para desplegar cambios, subir solo archivos modificados al hosting. No subir credenciales a GitHub.

## Deploy

Se estaba desplegando por FTP a:

`/httpdocs/`

Formato usado:

```powershell
curl.exe -sS -k --ssl-reqd --user "USUARIO:CONTRASENA" --upload-file "archivo-local" "ftp://tupromocion.es/httpdocs/ruta-remota"
```

Importante:

- No escribir credenciales en commits.
- Consultar accesos en el documento privado de accesos.
- Despues de subir JS/CSS/HTML, actualizar version de cache si procede, por ejemplo `?v=20260515b`.

## Validaciones usadas

Para JS:

```bash
node --check estimator/common.js
node --check estimator/dashboard.js
node --check estimator/form.js
node --check estimator/command-center.js
node --check proposal-template.js
```

Para PHP:

En este ordenador no estaba disponible `php`, por lo que no se pudo ejecutar `php -l` localmente. Se valido con peticiones reales contra produccion.

Rutas comprobadas:

- `https://tupromocion.es/propuesta/presupuesto-5eag0u`
- `https://tupromocion.es/api/public_proposal.php?slug=presupuesto-5eag0u`
- `https://tupromocion.es/estimator/index.html`
- `https://tupromocion.es/estimator/command-center.html`

## Pendientes recomendados

### Pipeline / CRM

- Vista kanban de promociones por estado.
- Historial de actividad por cliente/promocion.
- Panel dedicado por cliente.
- Indicador de "no leida" para contactos/propuestas pendientes.

### Web publica / SEO

- `sitemap.xml` dinamico con promociones publicadas.
- Pagina `/ficha-demo` profesional.
- Landing pages por servicio:
  - renders
  - tours virtuales
  - planos comerciales
  - videos

### Admin / UX

- Preferencias de marca por cliente.
- Exportar ficha publica a PDF.
- Plantillas de promocion.
- Onboarding para primera entrada de cliente.

## Avisos

Hay elementos temporales sin seguimiento en el repo local:

- `__landing_from_branch.html`
- `__styles_from_branch.css`
- `__tmp_migration/`

No forman parte del ultimo commit ni de produccion. Revisar antes de borrar, pero en principio son temporales.

## Criterio de producto

Mantener siempre este enfoque:

TuPromocion.es no es un portal inmobiliario barato. Es una herramienta comercial para convertir renders, planos, videos, tours y material visual en fichas digitales y propuestas online listas para compartir.

Evitar mensajes tipo:

- "web barata"
- "mantenimiento barato"
- "te hacemos todo por 10 euros"
- promesas absolutas de ventas, leads o posicionamiento

Usar mensajes tipo:

- "herramienta comercial"
- "ficha digital"
- "propuesta online"
- "bonus incluido con servicios 3D"
- "material visual profesional"
- "enlace listo para compartir"
