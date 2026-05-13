# Deploy en hosting compartido (cPanel) — tupromocion.es

## Requisitos mínimos del hosting
- PHP 8.0 o superior
- mod_rewrite habilitado (casi siempre activo por defecto en cPanel)
- Directorio `storage/` con permisos de escritura (755)

---

## Paso 1 — Subir los archivos al servidor

### Opción A: ZIP + File Manager de cPanel (recomendado)

1. Comprime el proyecto excluyendo lo que no se necesita:
   ```
   # Archivos/carpetas a NO subir:
   - Dockerfile
   - docker-compose.yml
   - .dockerignore
   - arrancar-webinmo.bat
   - deploy-minimo/
   - V19 - V seo/
   - .claude/
   - .env (si existe)
   - storage/*.json  (datos locales, no subir)
   ```

2. En cPanel → **File Manager** → navega a `public_html/`
3. Sube el ZIP y extrae ahí dentro

### Opción B: FTP (FileZilla u otro)

- Host: el de tu hosting (ej. `ftp.tupromocion.es`)
- Directorio destino: `/public_html/`
- Sube todos los archivos excepto los listados arriba

---

## Paso 2 — Permisos del directorio storage

En cPanel → File Manager → clic derecho en `storage/` → **Change Permissions**:
- Marca solo: Owner rwx, Group r-x, World r-x → resultado: **755**

Si el hosting requiere 777 para que PHP pueda escribir, úsalo con precaución.

Alternativamente por SSH:
```bash
chmod 755 storage/
```

---

## Paso 3 — Verificar que PHP puede escribir en storage

Accede a: `https://tupromocion.es/api/bootstrap.php`

Debe devolver JSON (aunque sea `{"ok":true,"authenticated":false,...}`).
Si da error 500, revisa los permisos de `storage/`.

---

## Paso 4 — Primer acceso y cambiar contraseña

1. Ve a `https://tupromocion.es/admin/`
2. Usuario: `admin` / Contraseña: `admin123`
3. **Cambia la contraseña inmediatamente** desde el panel de administración

---

## Paso 5 — Configurar el dominio DNS

En el panel del registrador del dominio (ej. Nominalia, Arsys, Godaddy):

| Tipo | Nombre | Valor |
|------|--------|-------|
| A    | @      | IP de tu servidor |
| A    | www    | IP de tu servidor |

La IP del servidor la encuentras en cPanel → **Server Information** o en el email de bienvenida del hosting.

Los cambios DNS pueden tardar hasta 24-48h en propagarse.

---

## Paso 6 — SSL/HTTPS (obligatorio)

En cPanel → **SSL/TLS** → **Let's Encrypt** (o el botón "AutoSSL"):
- Activa SSL para `tupromocion.es` y `www.tupromocion.es`

Después añade esta redirección a `.htaccess` (ya incluido en el archivo):
```apache
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

---

## Estructura de archivos en public_html

```
public_html/
├── index.html          ← Portada pública
├── app.js
├── styles.css
├── site-variants.js
├── lib/
│   └── jszip.min.js
├── admin/
│   └── index.php       ← Panel de administración
├── api/
│   └── *.php           ← Endpoints backend
├── storage/            ← Datos (creado automáticamente)
│   └── .htaccess       ← Bloquea acceso web directo
└── .htaccess           ← Configuración Apache
```

---

## Actualizar la web (próximas versiones)

1. Haz un backup desde el admin panel antes de actualizar
2. Sube los archivos nuevos vía FTP/File Manager (sobrescribe)
3. **No sobreescribas** el directorio `storage/` — ahí están tus datos

---

## Resolución de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| Error 500 en `/api/` | Permisos storage o PHP < 8.0 | Revisar permisos y versión PHP |
| Página en blanco | `.htaccess` no soportado | Contactar hosting para activar mod_rewrite |
| No guarda datos | `storage/` no es escribible | `chmod 755 storage/` |
| Admin no recuerda sesión | Cookies bloqueadas | Verificar que dominio tiene SSL activo |
