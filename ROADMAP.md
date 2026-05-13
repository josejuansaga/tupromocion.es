# Roadmap WebInmobiliaria

## Estado actual

- Hecho: portada publica con promociones publicadas.
- Hecho: acceso privado en `/admin`.
- Hecho: panel separado en `Panel de control`, `Clientes / Promotoras`, `Promociones` y `Contactos`.
- Hecho: estado `Borrador / Publicado` para mostrar o esconder promociones en portada.
- Hecho: backups cronologicos de proyectos y usuarios por separado.
- Hecho: buscador por empresa en clientes y promociones dentro del admin.

## 1. Publicacion online

- Subir esta version definitiva al hosting.
- Apuntar `tupromocion.es` a la web publica.
- Dejar `/admin` funcionando con login real.
- Comprobar SSL, permisos y guardado en servidor.

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

- SEO basico por promocion.
- Analitica mas clara.
- Formularios mejorados.
- Posible soporte multiidioma.
- Preparar una version mas cerrada para publicar de forma estable.

## Siguiente paso recomendado

- Publicar esta version en el hosting.
- Probar flujo completo de `cliente > promocion > publicar > contacto`.
- Despues rematar seguridad y revision multiusuario.
