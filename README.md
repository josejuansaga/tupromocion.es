# Generador de promociones urbanisticas

Panel para crear y gestionar promociones inmobiliarias con clientes, login y backend compartido entre varios ordenadores.

## Docker

1. Instala Docker Desktop.
2. Abre una terminal en esta carpeta.
3. Ejecuta:

```bash
docker compose up --build
```

4. Abre:

```text
http://localhost:8090
```

5. Entra con:
   - usuario: `admin`
   - contrasena: `admin123`

## Donde se guarda

- `storage/users.json`
- `storage/clients.json`
- `storage/project-index.json`
- `storage/projects/*.json`

Asi los datos quedan separados y no dependen del navegador de cada ordenador.

## Importante

- Si abres el `index.html` suelto desde el disco, el backend no funcionara.
- En Docker, la carpeta `storage` queda persistida en el volumen `webinmo_storage`.
- Si quieres usar otro puerto, crea un archivo `.env` en la raiz con algo como:

```text
WEBINMO_PORT=8091
```

- Para parar el entorno:

```bash
docker compose down
```
