<div align="center">
  <br/>

```
 ████████╗██╗   ██╗██████╗ ██╗███████╗███████╗ ██████╗
 ╚══██╔══╝██║   ██║██╔══██╗██║██╔════╝██╔════╝██╔════╝
    ██║   ██║   ██║██████╔╝██║███████╗█████╗  ██║
    ██║   ██║   ██║██╔═══╝ ██║╚════██║██╔══╝  ██║
    ██║   ╚██████╔╝██║     ██║███████║███████╗╚██████╗
    ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚══════╝╚══════╝ ╚═════╝
```

<h3>Web Security Analysis Framework</h3>
<p>Scanner de vulnerabilidades web con 33 módulos activos, dashboard visual, monitoreo SSL, alertas y exportación de reportes</p>

<br/>

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/Idod00/TUPISEC/pkgs/container/tupisec)
[![CI](https://img.shields.io/github/actions/workflow/status/Idod00/TUPISEC/docker-publish.yml?style=flat-square&label=Docker%20Build&logo=githubactions&logoColor=white)](https://github.com/Idod00/TUPISEC/actions)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

<br/>

</div>

---

## Scanner en acción

<div align="center">

![Terminal](docs/screenshots/terminal.gif)

</div>

---

## Dashboard

<div align="center">

![Demo](docs/screenshots/demo.gif)

</div>

---

## Capturas

<div align="center">

### Dashboard principal

![Dashboard](docs/screenshots/dashboard.png)

<br/>

<table>
  <tr>
    <td align="center">
      <img src="docs/screenshots/history.png" alt="Scan History" width="100%"/>
      <br/><sub><b>Historial de Scans</b></sub>
    </td>
    <td align="center">
      <img src="docs/screenshots/batch.png" alt="Batch Scan" width="100%"/>
      <br/><sub><b>Batch Scan</b></sub>
    </td>
  </tr>
</table>

### Reporte de seguridad

![Security Report](docs/screenshots/report.png)

</div>

---

## Módulos de escaneo

**33 módulos activos** organizados por categoría. Soporte para modo `--quick` (omite módulos lentos) y `--skip-modules` personalizado.

### Inyección y ejecución remota

| Módulo | Descripción | Severidad |
|--------|-------------|-----------|
| **SQL Injection** | Prueba formularios con 10 payloads reales contra inputs activos | `CRITICAL` |
| **XSS** | Inyección de scripts en parámetros GET y formularios POST | `HIGH` |
| **SSTI** | Template injection (Jinja2, Twig, Freemarker) via evaluación matemática | `CRITICAL` |
| **XXE** | Inyecta entidades XML externas para leer archivos del servidor | `CRITICAL` |
| **SSRF** | Prueba IPs internas y metadata cloud (169.254.169.254) en campos de formulario | `CRITICAL` |
| **Command Injection** | Detección output-based (`id → uid=`) y time-based (`sleep 5`) | `CRITICAL` |
| **NoSQL Injection** | Payloads `$gt/$ne` en JSON y notación bracket en parámetros URL | `CRITICAL` |
| **Path Traversal** | `../../../etc/passwd` en parámetros con nombres de archivo (file, path, doc...) | `CRITICAL` |
| **File Upload** | Intenta subir PHP/ASP/JSP con marcadores RCE; HTML/SVG para XSS almacenado | `CRITICAL` |
| **CRLF Injection** | `%0d%0a` en parámetros URL, detecta headers inyectados en respuesta | `HIGH` |
| **Prototype Pollution** | `__proto__[key]` y `constructor[prototype][key]` en parámetros URL | `HIGH` |

### Autenticación y sesión

| Módulo | Descripción | Severidad |
|--------|-------------|-----------|
| **JWT Security** | Detecta `alg:none` bypass, tokens sin expiración, payload sensible y secretos HMAC débiles | `CRITICAL` |
| **Default Credentials** | Prueba 11 pares de credenciales por defecto en 16 rutas de panel admin | `CRITICAL` |
| **Rate Limiting** | Burst de 15 requests a endpoints de auth/API — detecta ausencia de throttling | `MEDIUM` |
| **CSRF** | Detecta formularios sin token CSRF y configuración insegura de cookies | `HIGH` |

### Configuración y exposición

| Módulo | Descripción | Severidad |
|--------|-------------|-----------|
| **Security Headers** | Detecta ausencia de CSP, HSTS, X-Frame-Options y 7 headers más | `HIGH` |
| **SSL / TLS** | Analiza certificados, protocolos débiles y configuración HTTPS | `CRITICAL` |
| **HTTP Methods** | Detecta métodos peligrosos habilitados (PUT, DELETE, TRACE) | `HIGH` |
| **HTTP Request Smuggling** | CL.TE y TE.CL timing-based via sockets TCP crudos | `HIGH` |
| **Mixed Content** | Detecta recursos HTTP activos (script/iframe) y pasivos (img/link) en páginas HTTPS | `HIGH` |
| **CORS Advanced** | Origen arbitrario reflejado con/sin credenciales, null origin | `CRITICAL` |
| **Directory Traversal** | Fuerza bruta de 60+ rutas sensibles (.env, .git, phpinfo, etc.) | `HIGH` |
| **Sensitive Data Exposure** | Escanea respuestas buscando API keys, tokens, private keys, passwords y strings de BD | `CRITICAL` |
| **S3 Buckets** | Adivina nombres de bucket del dominio, detecta listado público | `CRITICAL` |
| **GraphQL** | Introspección habilitada, batch queries y field suggestions | `MEDIUM` |

### Reconocimiento y descubrimiento

| Módulo | Descripción | Severidad |
|--------|-------------|-----------|
| **Open Redirect** | Inyecta dominio externo en parámetros de redirección (url, next, return, goto...) | `HIGH` |
| **Subdomain Enumeration** | Wordlist de 80+ subdominios, detección wildcard DNS, takeover en 8 servicios | `CRITICAL` |
| **Parameter Fuzzing** | Prueba 60+ parámetros ocultos detectando cambios de status, tamaño y error disclosure | `MEDIUM` |
| **Broken Link Hijacking** | Detecta dominios externos rotos o sin registrar en links del sitio | `MEDIUM` |
| **Port Scan** | Escaneo de puertos comunes con detección de servicios via nmap o sockets | `MEDIUM` |
| **DNS / WHOIS** | Registros A, MX, NS, TXT e información de registro del dominio | `INFO` |
| **Tech Detection + CVEs** | Frameworks, CMS, servidores y librerías JS; consulta CVEs críticos en NVD API 2.0 | `INFO` |
| **Web Crawler** | Rastreo recursivo de URLs internas hasta profundidad configurable | `INFO` |
| **Screenshots** | Captura visual de las páginas objetivo via Puppeteer | `INFO` |

---

## Inicio rápido

### Opción A — Docker (recomendado)

Requiere únicamente tener [Docker](https://docs.docker.com/get-docker/) instalado.

```bash
docker run -d \
  --name tupisec \
  -p 3000:3000 \
  -v tupisec-data:/app/dashboard/data \
  --restart unless-stopped \
  ghcr.io/idod00/tupisec:latest
```

Abre [http://localhost:3000](http://localhost:3000) — listo.

Para actualizar a la última versión:

```bash
docker pull ghcr.io/idod00/tupisec:latest
docker rm -f tupisec
docker run -d \
  --name tupisec \
  -p 3000:3000 \
  -v tupisec-data:/app/dashboard/data \
  --restart unless-stopped \
  ghcr.io/idod00/tupisec:latest
```

> Los datos (base de datos y screenshots) se persisten en el volumen `tupisec-data` y **no se pierden** al actualizar.

### Variables de entorno opcionales

| Variable | Descripción | Default |
|----------|-------------|---------|
| `TUPISEC_SECRET` | Clave maestra para cifrado AES-256-GCM de API keys y firma de sesiones | `tupisec-default-key-change-me-please` |
| `TUPISEC_AUTH_ENABLED` | Activa login con contraseña (`true` / `false`) | `false` |

```bash
docker run -d \
  --name tupisec \
  -p 3000:3000 \
  -v tupisec-data:/app/dashboard/data \
  -e TUPISEC_SECRET=mi-clave-secreta-aleatoria \
  -e TUPISEC_AUTH_ENABLED=true \
  --restart unless-stopped \
  ghcr.io/idod00/tupisec:latest
```

Con `TUPISEC_AUTH_ENABLED=true`, el primer acceso a `/login` pedirá crear una contraseña.

---

### Opción B — Docker Compose

```bash
git clone https://github.com/Idod00/TUPISEC.git
cd TUPISEC
docker compose up -d
```

---

### Opción C — Instalación manual

**Requisitos:** Python `3.10+`, Node.js `18+`

```bash
git clone https://github.com/Idod00/TUPISEC.git
cd TUPISEC

# Scanner (Python)
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Dashboard (Next.js)
cd dashboard
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Uso desde CLI

```bash
# Escaneo completo (todos los módulos)
python3 scanner.py https://ejemplo.com --full

# Escaneo rápido (omite módulos lentos ~2-3 min)
python3 scanner.py https://ejemplo.com --quick

# Omitir módulos específicos
python3 scanner.py https://ejemplo.com --skip-modules subdomains,ports,cmd_injection

# Con cookies de sesión (sitios autenticados)
python3 scanner.py https://app.ejemplo.com --cookies "session=abc123; csrf=xyz"

# Guardar reporte
python3 scanner.py https://ejemplo.com --full --output reporte.txt

# Salida JSON (usado por el dashboard internamente)
python3 scanner.py https://ejemplo.com --json-stdout --quiet
```

### Integración CI/CD (API tokens)

Genera un token en **Settings → API Tokens** y úsalo en pipelines:

```bash
# Lanzar un scan desde CI/CD
curl -X POST https://tupisec.miempresa.com/api/scan \
  -H "Authorization: Bearer tupisec_api_<token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://staging.miempresa.com"}'

# Verificar estado del scan
curl https://tupisec.miempresa.com/api/scan/<id> \
  -H "Authorization: Bearer tupisec_api_<token>"
```

---

## Funcionalidades del dashboard

### Escaneo
- **Nuevo scan** — inicia el scanner desde el browser con progreso en tiempo real (33 módulos)
- **Quick / Full scan** — toggle para omitir módulos lentos en escaneos de recon rápido
- **Batch scan** — escanea múltiples URLs en paralelo
- **Escaneos programados** — re-escaneo automático diario, semanal o mensual con email de notificación

### Reportes
- **Reporte de seguridad** — findings por severidad, risk score, gráficos coloreados por severidad
- **OWASP Top 10** — cobertura mapeada a las 10 categorías OWASP 2021
- **Export** — descarga en PDF, CSV o JSON
- **Comparación de scans** — diff entre dos scans del mismo objetivo (nuevos / resueltos / persistentes)
- **Trend chart** — gráfico de evolución del risk score por dominio en el historial

### Findings y remediación
- **Notas por finding** — estado de remediación y notas internas por hallazgo
- **Filtros** — por severidad, status (open / in_progress / accepted / resolved / false_positive) y búsqueda de texto

### Integraciones
- **VirusTotal + Shodan** — enriquecimiento automático con datos de threat intelligence (API keys opcionales)
- **Webhooks / Slack / Discord / Telegram** — notificaciones al completar un scan o detectar hallazgos críticos
- **API tokens** — autenticación Bearer para pipelines CI/CD

### Infraestructura
- **SSL Monitor** — monitoreo programado de certificados SSL con alertas webhook y email
- **SMTP** — alertas por email para SSL y scans programados
- **Backup automático** — copia de seguridad diaria de la base de datos SQLite (mantiene los últimos 7)
- **API keys cifradas** — AES-256-GCM para VirusTotal, Shodan y SMTP (clave derivada de `TUPISEC_SECRET`)
- **Autenticación** — login con contraseña protegido por PBKDF2 + sesiones HMAC-SHA256

---

## Estructura del proyecto

```
TUPISEC/
├── scanner.py              # Motor principal de escaneo (33 módulos)
├── scan.sh                 # Wrapper CLI para ejecución rápida
│
├── dashboard/              # Dashboard web (Next.js 16)
│   ├── app/                # App Router
│   │   ├── api/            # API Routes (scan, batch, compare, tokens, backup...)
│   │   ├── scan/[id]/      # Vista de reporte individual
│   │   ├── history/        # Historial con trend chart
│   │   ├── batch/          # Batch scan
│   │   ├── compare/        # Comparación de scans
│   │   ├── schedules/      # Escaneos programados
│   │   ├── ssl/            # Monitor de certificados SSL
│   │   ├── settings/       # API keys, SMTP, notificaciones, tokens, backup
│   │   └── login/          # Autenticación (cuando TUPISEC_AUTH_ENABLED=true)
│   ├── components/         # Componentes UI reutilizables
│   ├── lib/                # Scanner bridge, DB, crypto, scheduler, mailer
│   └── data/               # SQLite + screenshots + backups
│
├── reports/                # Reportes exportados (.json / .txt)
├── docs/screenshots/       # Capturas del dashboard
└── configs/                # Configuraciones personalizadas
```

---

## Niveles de severidad

| Nivel | Color | Descripción |
|-------|-------|-------------|
| `CRITICAL` | 🔴 | Explotación inmediata posible sin autenticación |
| `HIGH` | 🟠 | Riesgo elevado, requiere atención urgente |
| `MEDIUM` | 🟡 | Explotable bajo ciertas condiciones |
| `LOW` | 🔵 | Debilidad menor o de bajo impacto |
| `INFO` | ⚪ | Información del sistema / contexto |

---

## Stack tecnológico

<div align="center">

| Layer | Tecnologías |
|-------|-------------|
| **Scanner** | Python 3, Requests, BeautifulSoup4, dnspython, python-whois |
| **Dashboard** | Next.js 16, TypeScript, Tailwind CSS, Shadcn UI |
| **Gráficos** | Recharts |
| **Base de datos** | SQLite via better-sqlite3 |
| **Criptografía** | Node.js crypto (AES-256-GCM, PBKDF2, HMAC-SHA256) |
| **Screenshots** | Puppeteer Core |
| **Reportes PDF** | React PDF Renderer |
| **Email** | Nodemailer (SMTP) |
| **Scheduler** | node-cron |
| **Iconos** | Lucide React |

</div>

---

> [!WARNING]
> **Aviso legal**
> Este framework fue desarrollado con fines educativos y de auditoría autorizada.
> Usarlo contra sistemas **sin permiso explícito** del propietario es ilegal.
> El autor no se hace responsable del uso indebido de esta herramienta.
> **Usar solo en entornos propios o con autorización escrita.**

---

<div align="center">
  <sub>Hecho para seguridad defensiva</sub>
</div>
