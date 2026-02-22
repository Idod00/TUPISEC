<div align="center">

```
████████╗██╗   ██╗██████╗ ██╗███████╗███████╗ ██████╗
╚══██╔══╝██║   ██║██╔══██╗██║██╔════╝██╔════╝██╔════╝
   ██║   ██║   ██║██████╔╝██║███████╗█████╗  ██║
   ██║   ██║   ██║██╔═══╝ ██║╚════██║██╔══╝  ██║
   ██║   ╚██████╔╝██║     ██║███████║███████╗╚██████╗
   ╚═╝    ╚═════╝ ╚═╝     ╚═╝╚══════╝╚══════╝ ╚═════╝
```

**Web Security Analysis Framework**

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

*Escaneo de vulnerabilidades web con dashboard visual, historial de scans y exportación de reportes PDF.*

</div>

---

## Caracteristicas

| Modulo | Descripcion |
|--------|-------------|
| **Headers de Seguridad** | Detecta ausencia de CSP, HSTS, X-Frame-Options y otros 10 headers criticos |
| **SSL/TLS** | Analiza certificados, protocolos debiles y configuracion HTTPS |
| **SQL Injection** | Prueba formularios con payloads reales contra inputs activos |
| **XSS** | Inyeccion de scripts en parametros GET y formularios POST |
| **Directory Traversal** | Fuerza bruta de 60+ rutas sensibles (`.env`, `.git`, `phpinfo`, etc.) |
| **Deteccion de Tecnologia** | Identifica frameworks, CMS, servidores y librerias JS |
| **Port Scan** | Escaneo de puertos comunes con deteccion de servicios |
| **HTTP Methods** | Detecta metodos peligrosos habilitados (PUT, DELETE, TRACE) |
| **Web Crawling** | Rastreo recursivo de URLs internas hasta profundidad configurable |
| **Screenshots** | Captura visual de las paginas objetivo via Puppeteer |

---

## Arquitectura

```
TUPISEC/
├── scanner.py          # Motor de escaneo principal (Python)
├── scan.sh             # Wrapper CLI para ejecucion rapida
├── reports/            # Reportes generados (.json / .txt)
│   └── <target>/
├── dashboard/          # Dashboard web (Next.js 15)
│   ├── app/            # App Router + API Routes
│   ├── components/     # Componentes UI (Shadcn + Recharts)
│   ├── lib/            # Scanner bridge, DB, scoring, tipos
│   └── data/           # Base de datos SQLite local
├── configs/            # Configuraciones personalizadas
├── scripts/            # Scripts auxiliares
└── tools/              # Herramientas adicionales
```

---

## Inicio Rapido

### Requisitos

- Python 3.10+
- Node.js 18+
- pip / npm

### Instalacion del Scanner (Python)

```bash
# Clonar el repositorio
git clone https://github.com/Idod00/TUPISEC.git
cd TUPISEC

# Crear entorno virtual e instalar dependencias
python3 -m venv venv
source venv/bin/activate
pip install requests beautifulsoup4 colorama

# Ejecutar un escaneo
python3 scanner.py https://ejemplo.com --full
```

### Usando el wrapper CLI

```bash
chmod +x scan.sh
./scan.sh https://ejemplo.com nombre_reporte
```

El reporte se guarda automaticamente en `reports/nombre_reporte_YYYYMMDD_HHMMSS.txt`.

### Dashboard Web

```bash
cd dashboard
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Uso del Scanner

```
python3 scanner.py <URL> [opciones]

Opciones:
  --full          Ejecuta todos los modulos de escaneo
  --output FILE   Guarda el reporte en un archivo .txt
```

**Ejemplos:**

```bash
# Escaneo basico
python3 scanner.py https://ejemplo.com

# Escaneo completo con reporte
python3 scanner.py https://ejemplo.com --full --output reporte.txt
```

---

## Niveles de Severidad

```
CRITICAL  ██████████  Explotacion inmediata posible
HIGH      ████████░░  Riesgo elevado, requiere atencion urgente
MEDIUM    ██████░░░░  Vulnerabilidad explotable con condiciones
LOW       ████░░░░░░  Debilidad menor o informativa
INFO      ██░░░░░░░░  Informacion del sistema / contexto
```

---

## Dashboard

El dashboard provee una interfaz visual completa para gestionar escaneos:

- **Nuevo scan** — lanza el scanner directamente desde el browser
- **Historial** — todos los scans anteriores con filtros y busqueda
- **Detalle de scan** — findings organizados por severidad, screenshots, tech stack
- **Comparacion** — compara dos scans del mismo objetivo para ver mejoras
- **Batch scan** — escanea multiples URLs en paralelo
- **Export PDF** — genera reportes profesionales listos para entregar
- **Notas en findings** — agrega contexto o estado de remediacion a cada hallazgo

**Stack del dashboard:**

```
Next.js 15  ·  TypeScript  ·  Tailwind CSS  ·  Shadcn UI
Recharts  ·  SQLite (better-sqlite3)  ·  Puppeteer  ·  React PDF
```

---

## Aviso Legal

> Este framework fue desarrollado con fines educativos y de auditoria autorizada.
> Usarlo contra sistemas sin permiso explicito del propietario es **ilegal**.
> El autor no se hace responsable del uso indebido de esta herramienta.
> **Usar solo en entornos propios o con autorizacion escrita.**

---

<div align="center">

Hecho con fines de seguridad defensiva

</div>
