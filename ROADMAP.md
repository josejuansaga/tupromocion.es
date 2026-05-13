# Roadmap WebInmobiliaria

## Estado actual (2026-05-13)

- Hecho: portada publica con promociones publicadas.
- Hecho: acceso privado en `/admin` (oculto de la portada pública).
- Hecho: panel separado en `Panel de control`, `Clientes / Promotoras`, `Promociones` y `Contactos`.
- Hecho: estado `Borrador / Publicado` para mostrar o esconder promociones en portada.
- Hecho: backups cronologicos de proyectos y usuarios por separado.
- Hecho: buscador por empresa en clientes y promociones dentro del admin.
- Hecho: deploy en tupromocion.es con Plesk + FTPS.
- Hecho: SSL, permisos y protección de storage.
- Hecho: Google Analytics (G-M28N9NPCG2) con consentimiento de cookies RGPD.
- Hecho: miniaturas automáticas en subida de imágenes (480px, lazy loading).
- Hecho: marca de agua con logo de cada promoción en esquina inferior derecha.
- Hecho: tour virtual por tipología (campo URL + cover por planta).
- Hecho: portada minimalista con filtro inline y crédito tucasaen3d.es.

## 1. Publicacion online ✓

- ~~Subir esta version definitiva al hosting.~~
- ~~Apuntar `tupromocion.es` a la web publica.~~
- ~~Dejar `/admin` funcionando con login real.~~
- ~~Comprobar SSL, permisos y guardado en servidor.~~

## 2. Revision multiusuario

- Revisar que varias personas puedan trabajar sin pisarse.
- Confirmar que el guardado en servidor responde bien.
- Probar crear, editar, publicar y borrar desde navegadores distintos.
- Revisar que no quede ninguna dependencia real de trabajo local.

## 3. Seguridad y accesos

- Cambiar la contrasena por defecto.
- Revisar usuarios y permisos.
- Definir si habra mas roles o solo administrador.
- Revisar restauracion de copias desde el admin.

## 4. Clientes y promociones

- Hecho: entrar a la empresa con un clic desde `Clientes / Promotoras`.
- Hecho: listado rapido de promociones dentro de cada empresa.
- Hecho: boton directo para crear una promocion desde la ficha de empresa.
- Revisar orden, nombres y limpieza de clientes duplicados.
- Añadir mas datos utiles de empresa si hacen falta.
- Seguir puliendo la gestion de promociones desde admin.

## 5. Contactos y seguimiento

- Hecho: listado de mensajes dentro del admin.
- Hecho: filtro por promocion.
- Hecho: exportacion simple de contactos a CSV.
- Siguiente: valorar filtro por fecha o estado de respuesta.

## 6. Portada y presentacion

- Hecho: portada mas limpia.
- Hecho: bloque destacado para la promocion principal.
- Mejorar imagenes, copies y jerarquia visual.
- Revisar version movil en detalle.

## 7. Siguiente fase

- SEO basico por promocion (título, descripción, og:image por proyecto).
- Analitica mas clara (eventos GA: visita ficha, clic whatsapp, descarga PDF).
- Formularios mejorados (más campos, respuesta automática al interesado).
- Posible soporte multiidioma (inglés/ruso para costa).
- Preparar una version mas cerrada para publicar de forma estable.

## 8. Mejoras técnicas sugeridas

- **URL amigable por promoción** — slug personalizable, ej: `tupromocion.es/maringo`. Mejora SEO y compartición.
- **Notificación por email al llegar un contacto** — aviso inmediato sin tener que entrar al panel.
- **Orden manual de imágenes** — drag & drop para reordenar fotos dentro de cada tipología.
- **Estadísticas por promoción** — cuántas visitas, clics en whatsapp y descargas de PDF tiene cada una.
- **Imagen webp automática** — convertir subidas a webp en el servidor para reducir tamaño un 30-50%.
- **Preview antes de publicar** — botón "ver como visitante" desde el admin sin tener que publicar.
- **Marca de agua automática en nuevas subidas** — ya genera miniatura al subir; añadir la marca al mismo flujo para no tener que lanzar script manual.
- **Exportar ficha PDF desde admin** — generar un PDF descargable con renders, planos y calidades para enviar a compradores.
- **Página de error 404 personalizada** — con branding y enlace a la portada.
- **Banner "próximamente"** — estado intermedio entre borrador y publicado, visible en portada pero sin detalles.

## Siguiente paso recomendado

- Probar flujo completo con nuevo proyecto: `cliente > promocion > subir imágenes > publicar > contacto`.
- Rematar seguridad y revisión multiusuario.
- Valorar URL amigable y notificación por email como próximas mejoras de mayor impacto.
