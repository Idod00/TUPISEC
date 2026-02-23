export type Lang = "en" | "es";

export const translations = {
  en: {
    // Nav
    "nav.dashboard": "Dashboard",
    "nav.history": "History",
    "nav.batch": "Batch",
    "nav.schedules": "Schedules",
    "nav.ssl": "SSL",
    "nav.settings": "Settings",

    // Home
    "home.subtitle": "Enter a URL to analyze its security posture",
    "home.batchScan": "Batch Scan (Multiple URLs)",
    "home.recentScans": "Recent Scans",
    "home.findings": "findings",
    "home.running": "Running...",
    "home.failed": "Failed",

    // Scan form
    "scan.placeholder": "https://example.com",
    "scan.scanning": "Scanning...",
    "scan.scanButton": "Scan",
    "scan.validUrl": "Please enter a valid URL",
    "scan.startFailed": "Failed to start scan",
    "scan.networkError": "Network error. Please try again.",
    "scan.auth": "Authentication (Optional)",
    "scan.authDesc": "Cookie header value to send with all requests",
    "scan.cookiePlaceholder": "session=abc123; token=xyz789",

    // Scan report page
    "scan.title": "Security Report",
    "scan.retest": "Re-test",
    "scan.compareWithPrev": "Compare with Previous Scan",
    "scan.noReport": "No report data available.",
    "scan.backDashboard": "Dashboard",
    "scan.findings": "Findings",

    // Scan progress
    "scanProgress.complete": "Scan complete!",
    "scanProgress.failed": "Scan failed",
    "scanProgress.starting": "Starting scan...",
    "scanProgress.step": "Step {step} of {total}",

    // Batch form
    "batch.urlsLabel": "URLs (one per line)",
    "batch.enterUrl": "Enter at least one URL",
    "batch.startFailed": "Failed to start batch scan",
    "batch.networkError": "Network error. Please try again.",
    "batch.starting": "Starting Batch...",
    "batch.start": "Start Batch Scan",
    "batch.auth": "Authentication (Optional)",
    "batch.authDesc": "Cookie header value to send with all requests",

    // Batch page
    "batch.title": "Batch Scan",
    "batch.subtitle": "Scan multiple URLs at once",
    "batch.recentBatches": "Recent Batches",
    "batch.urls": "URLs",

    // Batch result page
    "batchResult.progress": "Progress",
    "batchResult.totalFindings": "Total Findings",
    "batchResult.scanResults": "Scan Results",
    "batchResult.notFound": "Batch not found",
    "batchResult.back": "Back to Dashboard",
    "batchResult.completed": "completed",
    "batchResult.failed": "failed",

    // Batch progress
    "batchProgress.connecting": "Connecting to batch scan...",
    "batchProgress.scanned": "of",
    "batchProgress.scanning": "Scanning:",
    "batchProgress.urlsScanned": "URLs scanned",
    "batchProgress.failed": "failed",

    // History
    "history.title": "Scan History",

    // Schedules
    "schedules.title": "Scheduled Scans",
    "schedules.subtitle": "Automatically re-scan targets on a schedule.",
    "schedules.addNew": "Add New Schedule",
    "schedules.add": "Add",
    "schedules.daily": "Daily",
    "schedules.weekly": "Weekly",
    "schedules.monthly": "Monthly",
    "schedules.targetUrl": "Target URL",
    "schedules.interval": "Interval",
    "schedules.status": "Status",
    "schedules.lastRun": "Last Run",
    "schedules.nextRun": "Next Run",
    "schedules.active": "Active",
    "schedules.paused": "Paused",
    "schedules.none": "No schedules configured yet.",

    // Compare
    "compare.title": "Scan Comparison",
    "compare.newFindings": "New Findings",
    "compare.resolvedFindings": "Resolved Findings",
    "compare.persistentFindings": "Persistent Findings",
    "compare.back": "History",
    "compare.none": "None",
    "compare.loadFailed": "Failed to load comparison",
    "compare.idsRequired": "Both scan IDs are required",
    "compare.scoreDelta": "Score Delta",
    "compare.scanA": "Scan A (Baseline)",
    "compare.scanB": "Scan B (Current)",
    "compare.findings": "findings",

    // Findings
    "finding.detail": "Detail",
    "finding.recommendation": "Recommendation",
    "finding.note": "Note",
    "finding.owaspRef": "OWASP Reference",

    // Finding status
    "findingStatus.open": "Open",
    "findingStatus.inProgress": "In Progress",
    "findingStatus.accepted": "Accepted",
    "findingStatus.resolved": "Resolved",

    // Findings table
    "findingsTable.search": "Search findings...",
    "findingsTable.allStatus": "All Status",
    "findingsTable.showing": "Showing {count} of {total} findings",
    "findingsTable.noMatch": "No findings match your filters.",

    // Remediation
    "remediation.progress": "Remediation Progress",
    "remediation.resolved": "Resolved",
    "remediation.inProgress": "In Progress",
    "remediation.accepted": "Accepted",
    "remediation.open": "Open",

    // Discovered URLs
    "discovery.title": "Discovered URLs",

    // Grouped history table
    "grouped.noScans": "No scans yet. Start your first scan from the Dashboard.",
    "grouped.target": "Target",
    "grouped.latestScore": "Latest Score",
    "grouped.trend": "Trend",
    "grouped.scans": "Scans",
    "grouped.lastScan": "Last Scan",
    "grouped.actions": "Actions",
    "grouped.view": "View",
    "grouped.retest": "Re-test",
    "grouped.date": "Date",
    "grouped.status": "Status",

    // SSL Monitor
    "ssl.title": "SSL Certificate Monitor",
    "ssl.subtitle": "Monitor SSL/TLS certificate expiry and receive alerts before they expire.",
    "ssl.addMonitor": "Add Monitor",
    "ssl.domain": "Domain",
    "ssl.port": "Port",
    "ssl.alertDays": "Alert N days before expiry",
    "ssl.alertEmail": "Alert Email (optional)",
    "ssl.checkNow": "Check Now",
    "ssl.status.ok": "OK",
    "ssl.status.warning": "Warning",
    "ssl.status.error": "Error",
    "ssl.daysRemaining": "{n} days remaining",
    "ssl.expiredAgo": "Expired {n} days ago",
    "ssl.expires": "Expires",
    "ssl.issuer": "Issuer",
    "ssl.protocol": "Protocol",
    "ssl.chain": "Chain",
    "ssl.chainValid": "Valid",
    "ssl.chainInvalid": "Invalid",
    "ssl.sans": "SANs",
    "ssl.notChecked": "Not checked",
    "ssl.neverChecked": "Never checked",
    "ssl.disabled": "Disabled",
    "ssl.alertsLabel": "Alerts: {n}d",
    "ssl.edit.enabled": "Monitor enabled",
    "ssl.none": "No SSL monitors configured yet.",

    // SMTP Settings
    "settings.smtp": "Email (SMTP)",
    "settings.smtpDesc": "Configure SMTP to receive SSL alert emails.",
    "settings.smtpHost": "SMTP Host",
    "settings.smtpPort": "Port",
    "settings.smtpUser": "Username",
    "settings.smtpPass": "Password",
    "settings.smtpFrom": "From Address",
    "settings.smtpSecure": "Use SSL/TLS (port 465)",
    "settings.testEmail": "Send Test Email",
    "settings.testEmailTo": "Recipient email",

    // Enrichment
    "enrichment.enrich": "Enrich",
    "enrichment.reEnrich": "Re-enrich",
    "enrichment.enriching": "Enriching...",
    "enrichment.noKeys": "No API keys configured. Add VirusTotal or Shodan keys in Settings.",
    "enrichment.virustotal": "VirusTotal",
    "enrichment.shodan": "Shodan",
    "enrichment.threatIntel": "Threat Intelligence",

    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Configure API integrations and notification webhooks.",
    "settings.apiKeys": "API Keys",
    "settings.apiKeysDesc": "Add API keys to enable automatic enrichment after each scan.",
    "settings.vtKey": "VirusTotal API Key",
    "settings.shodanKey": "Shodan API Key",
    "settings.save": "Save API Keys",
    "settings.saved": "Saved!",
    "settings.configured": "Configured",
    "settings.notifications": "Notifications",
    "settings.notificationsDesc": "Receive alerts when scans complete or critical findings are detected.",

    // Footer
    "footer.text": "TupiSec Scanner — Web Security Analysis Framework",

    // Common
    "common.backDashboard": "Back to Dashboard",
    "common.backHistory": "Back to History",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.noScans": "No scans yet.",
    "common.urlsLabel": "URLs",
  },

  es: {
    // Nav
    "nav.dashboard": "Panel",
    "nav.history": "Historial",
    "nav.batch": "Masivo",
    "nav.schedules": "Programados",
    "nav.ssl": "SSL",
    "nav.settings": "Ajustes",

    // Home
    "home.subtitle": "Ingresá una URL para analizar su seguridad",
    "home.batchScan": "Escaneo masivo (múltiples URLs)",
    "home.recentScans": "Escaneos recientes",
    "home.findings": "hallazgos",
    "home.running": "Ejecutando...",
    "home.failed": "Fallido",

    // Scan form
    "scan.placeholder": "https://ejemplo.com",
    "scan.scanning": "Escaneando...",
    "scan.scanButton": "Escanear",
    "scan.validUrl": "Ingresá una URL válida",
    "scan.startFailed": "No se pudo iniciar el escaneo",
    "scan.networkError": "Error de red. Por favor intentá de nuevo.",
    "scan.auth": "Autenticación (Opcional)",
    "scan.authDesc": "Valor del header Cookie para enviar con todas las solicitudes",
    "scan.cookiePlaceholder": "session=abc123; token=xyz789",

    // Scan report page
    "scan.title": "Informe de Seguridad",
    "scan.retest": "Re-escanear",
    "scan.compareWithPrev": "Comparar con escaneo anterior",
    "scan.noReport": "No hay datos de informe disponibles.",
    "scan.backDashboard": "Panel",
    "scan.findings": "Hallazgos",

    // Scan progress
    "scanProgress.complete": "¡Escaneo completo!",
    "scanProgress.failed": "Escaneo fallido",
    "scanProgress.starting": "Iniciando escaneo...",
    "scanProgress.step": "Paso {step} de {total}",

    // Batch form
    "batch.urlsLabel": "URLs (una por línea)",
    "batch.enterUrl": "Ingresá al menos una URL",
    "batch.startFailed": "No se pudo iniciar el escaneo masivo",
    "batch.networkError": "Error de red. Por favor intentá de nuevo.",
    "batch.starting": "Iniciando lote...",
    "batch.start": "Iniciar Escaneo Masivo",
    "batch.auth": "Autenticación (Opcional)",
    "batch.authDesc": "Valor del header Cookie para enviar con todas las solicitudes",

    // Batch page
    "batch.title": "Escaneo Masivo",
    "batch.subtitle": "Escaneá múltiples URLs a la vez",
    "batch.recentBatches": "Lotes recientes",
    "batch.urls": "URLs",

    // Batch result page
    "batchResult.progress": "Progreso",
    "batchResult.totalFindings": "Total de Hallazgos",
    "batchResult.scanResults": "Resultados del Escaneo",
    "batchResult.notFound": "Lote no encontrado",
    "batchResult.back": "Volver al Panel",
    "batchResult.completed": "completados",
    "batchResult.failed": "fallidos",

    // Batch progress
    "batchProgress.connecting": "Conectando al escaneo masivo...",
    "batchProgress.scanned": "de",
    "batchProgress.scanning": "Escaneando:",
    "batchProgress.urlsScanned": "URLs escaneadas",
    "batchProgress.failed": "fallidos",

    // History
    "history.title": "Historial de Escaneos",

    // Schedules
    "schedules.title": "Escaneos Programados",
    "schedules.subtitle": "Re-escaneá objetivos automáticamente según un programa.",
    "schedules.addNew": "Agregar Nuevo Programa",
    "schedules.add": "Agregar",
    "schedules.daily": "Diario",
    "schedules.weekly": "Semanal",
    "schedules.monthly": "Mensual",
    "schedules.targetUrl": "URL Objetivo",
    "schedules.interval": "Intervalo",
    "schedules.status": "Estado",
    "schedules.lastRun": "Última Ejecución",
    "schedules.nextRun": "Próxima Ejecución",
    "schedules.active": "Activo",
    "schedules.paused": "Pausado",
    "schedules.none": "No hay programas configurados.",

    // Compare
    "compare.title": "Comparación de Escaneos",
    "compare.newFindings": "Nuevos Hallazgos",
    "compare.resolvedFindings": "Hallazgos Resueltos",
    "compare.persistentFindings": "Hallazgos Persistentes",
    "compare.back": "Historial",
    "compare.none": "Ninguno",
    "compare.loadFailed": "No se pudo cargar la comparación",
    "compare.idsRequired": "Se requieren ambos IDs de escaneo",
    "compare.scoreDelta": "Delta de Puntaje",
    "compare.scanA": "Escaneo A (Base)",
    "compare.scanB": "Escaneo B (Actual)",
    "compare.findings": "hallazgos",

    // Findings
    "finding.detail": "Detalle",
    "finding.recommendation": "Recomendación",
    "finding.note": "Nota",
    "finding.owaspRef": "Referencia OWASP",

    // Finding status
    "findingStatus.open": "Abierto",
    "findingStatus.inProgress": "En Progreso",
    "findingStatus.accepted": "Aceptado",
    "findingStatus.resolved": "Resuelto",

    // Findings table
    "findingsTable.search": "Buscar hallazgos...",
    "findingsTable.allStatus": "Todos los estados",
    "findingsTable.showing": "Mostrando {count} de {total} hallazgos",
    "findingsTable.noMatch": "Ningún hallazgo coincide con los filtros.",

    // Remediation
    "remediation.progress": "Progreso de Remediación",
    "remediation.resolved": "Resuelto",
    "remediation.inProgress": "En Progreso",
    "remediation.accepted": "Aceptado",
    "remediation.open": "Abierto",

    // Discovered URLs
    "discovery.title": "URLs Descubiertas",

    // Grouped history table
    "grouped.noScans": "Sin escaneos. Iniciá el primero desde el Panel.",
    "grouped.target": "Objetivo",
    "grouped.latestScore": "Último Puntaje",
    "grouped.trend": "Tendencia",
    "grouped.scans": "Escaneos",
    "grouped.lastScan": "Último Escaneo",
    "grouped.actions": "Acciones",
    "grouped.view": "Ver",
    "grouped.retest": "Re-escanear",
    "grouped.date": "Fecha",
    "grouped.status": "Estado",

    // SSL Monitor
    "ssl.title": "Monitor de Certificados SSL",
    "ssl.subtitle": "Monitoreá el vencimiento de certificados SSL/TLS y recibí alertas antes de que expiren.",
    "ssl.addMonitor": "Agregar Monitor",
    "ssl.domain": "Dominio",
    "ssl.port": "Puerto",
    "ssl.alertDays": "Alertar N días antes del vencimiento",
    "ssl.alertEmail": "Email de Alerta (opcional)",
    "ssl.checkNow": "Verificar Ahora",
    "ssl.status.ok": "OK",
    "ssl.status.warning": "Atención",
    "ssl.status.error": "Error",
    "ssl.daysRemaining": "{n} días restantes",
    "ssl.expiredAgo": "Vencido hace {n} días",
    "ssl.expires": "Vence",
    "ssl.issuer": "Emisor",
    "ssl.protocol": "Protocolo",
    "ssl.chain": "Cadena",
    "ssl.chainValid": "Válida",
    "ssl.chainInvalid": "Inválida",
    "ssl.sans": "SANs",
    "ssl.notChecked": "Sin verificar",
    "ssl.neverChecked": "Nunca verificado",
    "ssl.disabled": "Deshabilitado",
    "ssl.alertsLabel": "Alertas: {n}d",
    "ssl.edit.enabled": "Monitor habilitado",
    "ssl.none": "Sin monitores SSL configurados aún.",

    // SMTP Settings
    "settings.smtp": "Email (SMTP)",
    "settings.smtpDesc": "Configurá SMTP para recibir alertas de SSL por email.",
    "settings.smtpHost": "Host SMTP",
    "settings.smtpPort": "Puerto",
    "settings.smtpUser": "Usuario",
    "settings.smtpPass": "Contraseña",
    "settings.smtpFrom": "Dirección Remitente",
    "settings.smtpSecure": "Usar SSL/TLS (puerto 465)",
    "settings.testEmail": "Enviar Email de Prueba",
    "settings.testEmailTo": "Email destinatario",

    // Enrichment
    "enrichment.enrich": "Enriquecer",
    "enrichment.reEnrich": "Re-enriquecer",
    "enrichment.enriching": "Enriqueciendo...",
    "enrichment.noKeys": "Sin claves API. Agrega VirusTotal o Shodan en Ajustes.",
    "enrichment.virustotal": "VirusTotal",
    "enrichment.shodan": "Shodan",
    "enrichment.threatIntel": "Inteligencia de Amenazas",

    // Settings
    "settings.title": "Ajustes",
    "settings.subtitle": "Configurá integraciones de API y webhooks de notificaciones.",
    "settings.apiKeys": "Claves API",
    "settings.apiKeysDesc": "Agrega claves API para habilitar el enriquecimiento automático.",
    "settings.vtKey": "Clave API de VirusTotal",
    "settings.shodanKey": "Clave API de Shodan",
    "settings.save": "Guardar Claves API",
    "settings.saved": "¡Guardado!",
    "settings.configured": "Configurado",
    "settings.notifications": "Notificaciones",
    "settings.notificationsDesc": "Recibí alertas cuando los escaneos completen o se detecten hallazgos críticos.",

    // Footer
    "footer.text": "TupiSec Scanner — Framework de Análisis de Seguridad Web",

    // Common
    "common.backDashboard": "Volver al Panel",
    "common.backHistory": "Volver al Historial",
    "common.delete": "Eliminar",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.noScans": "Sin escaneos.",
    "common.urlsLabel": "URLs",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
