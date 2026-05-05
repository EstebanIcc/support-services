# Proyecto Casos Abiertos

API REST en Node.js que consolida casos de correos (Jelou Gateway) con datos de base de datos (Jelou API) y entrega:

- Respuesta JSON consolidada por `supportTicketId`
- Vista HTML lista para compartir o imprimir

## Requisitos

- Node.js `>=18`
- npm

## Instalacion

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

3. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Completa las credenciales en `.env`.

## Variables de entorno

Variables obligatorias:

- `JELOU_GATEWAY_API_KEY`: API key para el gateway de reportes de correos.
- `JELOU_DATABASE_BASIC_AUTH`: token Base64 para Authorization Basic (sin prefijo `Basic `).

Variables opcionales:

- `PORT` (default: `3000`)
- `DEFAULT_COMPANY_ID` (default: `5`)
- `DEFAULT_BOT_ID` (default: `9e84df74-0dc2-4fcf-9308-cd4257f7d978`)
- `DATABASE_ID` (default: `5372`)
- `JELOU_TIMEZONE` (default: `America/Guayaquil`)

## Scripts

- `npm run dev`: inicia el servidor en modo watch.
- `npm start`: inicia el servidor normal.

## Endpoints

### Healthcheck

- `GET /health`

Respuesta:

```json
{ "ok": true }
```

### JSON consolidado

- `GET /api/casos/consolidados`

Query params soportados:

- `page`
- `limit`
- `status`
- `companyId`
- `sort`
- `botId`

Ejemplo:

```bash
http://localhost:3000/api/casos/consolidados?page=1&limit=20&status=PENDING
```

Estructura de respuesta (resumen):

```json
{
  "sourcePagination": {},
  "tickets": {
    "supportTicketId": {
      "subject": "",
      "ticket": 123,
      "status": "",
      "assignedTo": "",
      "usuario": "",
      "createdAt": "",
      "Resumen_de_Caso": "",
      "Resolucion": ""
    }
  }
}
```

### Vista HTML

- `GET /vista/casos`

Usa los mismos query params que el endpoint JSON y devuelve el reporte en HTML (modo oscuro).

## Publicar en GitHub (recomendado)

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "chore: setup initial API project"
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

Si ya tienes repo inicializado, omite `git init` y solo configura `remote`/`push`.

## Notas de seguridad

- No subas `.env` al repositorio.
- Rota credenciales si alguna vez se exponen.
- Verifica que el token de `JELOU_DATABASE_BASIC_AUTH` no tenga el prefijo `Basic ` en el archivo `.env`.
