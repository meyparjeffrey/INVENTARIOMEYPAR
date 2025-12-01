import * as React from "react";

type LanguageCode = "es-ES" | "ca-ES";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(
  undefined
);

// Traducciones básicas para el login
const translations: Record<LanguageCode, Record<string, string>> = {
  "es-ES": {
    "login.title": "Inventario",
    "login.subtitle": "Inicia sesión para continuar",
    "login.email": "Correo electrónico",
    "login.password": "Contraseña",
    "login.remember": "Recordar sesión",
    "login.submit": "Iniciar sesión",
    "login.submitting": "Iniciando…",
    "login.success": "Credenciales correctas, redirigiendo...",
    "login.error": "Error al iniciar sesión",
    "login.error.invalidCredentials": "Credenciales inválidas. Por favor, verifica tu correo y contraseña.",
    "login.error.network": "Error de conexión. Verifica tu conexión a internet.",
    "login.error.emailRequired": "El correo electrónico es obligatorio",
    "login.error.emailInvalid": "Por favor, introduce un correo electrónico válido",
    "login.error.passwordRequired": "La contraseña es obligatoria",
    "login.error.passwordMinLength": "La contraseña debe tener al menos 6 caracteres",
    "login.feature.secure": "Seguro y confiable",
    "login.feature.fast": "Rápido y eficiente",
    "login.feature.control": "Control total del inventario",
    "login.version": "Versión",
    "app.name": "ALMACÉN MEYPAR",
    "app.subtitle": "Sistema de Inventario",
    "connection.connected": "Conectado",
    "connection.disconnected": "Desconectado",
    "connection.checking": "Comprobando...",
    "connection.title.connected": "Conectado a la base de datos",
    "connection.title.disconnected": "Desconectado de la base de datos",
    "connection.title.checking": "Comprobando conexión...",
    // Columnas de tabla
    "table.code": "Código",
    "table.name": "Nombre",
    "table.category": "Categoría",
    "table.stock": "Stock",
    "table.min": "Mín",
    "table.location": "Ubicación",
    "table.supplierCode": "Código Proveedor",
    "table.status": "Estado",
    "table.actions": "Acciones",
    // Botones de acción
    "actions.view": "Ver detalle",
    "actions.edit": "Editar",
    "actions.delete": "Eliminar",
    "actions.movement": "Registrar movimiento",
    "actions.duplicate": "Duplicar",
    "actions.history": "Ver historial",
    "actions.export": "Exportar",
    "actions.activate": "Activar",
    "actions.deactivate": "Desactivar",
    "actions.confirmDelete": "¿Estás seguro de eliminar este producto?",
    // Productos
    "products.title": "Productos",
    "products.total": "productos en total",
    "products.new": "Nuevo Producto",
    "products.export": "Exportar Excel",
    "products.search": "Buscar por código, nombre o barcode...",
    "products.includeInactive": "Incluir inactivos",
    "products.lowStockOnly": "Solo en alarma",
    "products.noProducts": "No hay productos",
    "products.createFirst": "Crea tu primer producto para comenzar",
    "products.batches": "Lotes",
    "products.alarm": "Alarma",
    "products.ok": "OK",
    // Paginación
    "pagination.showing": "Mostrando",
    "pagination.of": "de",
    "pagination.previous": "Anterior",
    "pagination.next": "Siguiente",
    // Notificaciones
    "notifications.title": "Notificaciones",
    "notifications.unread": "sin leer",
    "notifications.loading": "Cargando...",
    "notifications.empty": "No hay notificaciones",
    "notifications.viewAll": "Ver todas las notificaciones",
    // Usuario
    "user.profile": "Perfil",
    "user.settings": "Configuración",
    "user.logout": "Cerrar sesión",
    // Chat IA
    "ai.chat.title": "MEYPAR IA",
    "ai.chat.subtitle": "Pregúntame sobre la aplicación",
    "ai.chat.placeholder": "Escribe tu pregunta...",
    "ai.chat.send": "Enviar",
    "ai.chat.welcome": "Hola, soy tu asistente de IA",
    "ai.chat.welcome.description": "Puedo ayudarte a entender cómo usar la aplicación, consultar datos y explicar permisos. ¿En qué puedo ayudarte?",
    "ai.chat.suggestions.how-create-product": "¿Cómo creo un producto?",
    "ai.chat.suggestions.low-stock": "¿Qué productos están en alarma?",
    "ai.chat.suggestions.scanner": "¿Cómo uso el escáner?",
    "ai.chat.typing": "Escribiendo...",
    "ai.chat.error": "Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.",
    "ai.chat.close": "Cerrar chat",
    "ai.chat.open": "Abrir chat de IA",
    // Filtros
    "filters.title": "Filtros",
    "filters.all": "Todas",
    "filters.min": "Mín",
    "filters.max": "Máx",
    "filters.batchTracked": "Solo con lotes",
    "filters.clear": "Limpiar",
    "filters.apply": "Aplicar",
    "filters.supplierCodePlaceholder": "Buscar por código...",
    // Exportación
    "export.title": "Exportar Datos",
    "export.subtitle": "Configura tu exportación",
    "export.selectAll": "Seleccionar todas",
    "export.deselectAll": "Deseleccionar todas",
    "export.selected": "seleccionadas",
    "export.selectColumns": "Columnas a exportar",
    "export.export": "Exportar",
    "export.exporting": "Exportando...",
    "export.errorNoColumns": "Selecciona al menos una columna",
    "export.format": "Formato de exportación",
    "export.formatExcelDesc": "Formato Excel con estilos",
    "export.formatCsvDesc": "Texto plano separado por comas",
    "export.formatPdfDesc": "Documento portable para imprimir",
    "export.includeFilters": "Incluir filtros aplicados",
    "export.activeFilters": "filtros activos",
    "export.filtersPreview": "Filtros a incluir:",
    "export.pdfNote": "El PDF puede tardar unos segundos",
    "export.fileNote": "El archivo se descargará automáticamente",
    // Común
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.view": "Ver",
    "common.close": "Cerrar",
    "common.noResults": "No se encontraron resultados",
    "common.comingSoon": "Próximamente...",
    // Navegación
    "nav.dashboard": "Dashboard",
    "nav.products": "Productos",
    "nav.batches": "Lotes",
    "nav.movements": "Movimientos",
    "nav.alerts": "Alarmas",
    "nav.scanner": "Escáner",
    "nav.chat": "Chat",
    "nav.reports": "Reportes",
    "nav.settings": "Configuración",
    "nav.admin": "Admin",
    "nav.language": "Idioma",
    // Búsqueda
    "search.loading": "Buscando...",
    "search.noResults": "No se encontraron resultados",
    "search.recent": "Búsquedas recientes",
    "search.product": "Producto",
    "search.batch": "Lote",
    // Validaciones formulario
    "validation.code.required": "El código es requerido",
    "validation.code.minLength": "El código debe tener al menos 3 caracteres",
    "validation.code.noSpaces": "El código no puede contener espacios",
    "validation.name.required": "El nombre es requerido",
    "validation.name.minLength": "El nombre debe tener al menos 2 caracteres",
    "validation.stockMin.required": "El stock mínimo es requerido",
    "validation.stockMin.invalid": "El stock mínimo debe ser un número >= 0",
    "validation.stockCurrent.invalid": "El stock actual debe ser un número >= 0",
    "validation.stockMax.invalid": "El stock máximo debe ser mayor que el mínimo",
    "validation.aisle.required": "El pasillo es requerido",
    "validation.shelf.required": "El estante es requerido",
    "validation.costPrice.required": "El precio de coste es requerido",
    "validation.costPrice.invalid": "El precio de coste debe ser un número >= 0",
    "validation.salePrice.invalid": "El precio de venta debe ser >= precio de coste",
    "validation.dimensions.invalid": "Las dimensiones deben ser números positivos",
    "validation.url.invalid": "Por favor, introduce una URL válida",
    // Formulario producto
    "form.basicInfo": "Información Básica",
    "form.stock": "Stock",
    "form.location": "Ubicación",
    "form.prices": "Precios",
    "form.additionalInfo": "Información Adicional",
    "form.options": "Opciones",
    "form.barcode": "Código de Barras",
    "form.description": "Descripción",
    "form.stockCurrent": "Stock Actual",
    "form.stockMin": "Stock Mínimo",
    "form.stockMax": "Stock Máximo",
    "form.aisle": "Pasillo",
    "form.shelf": "Estante",
    "form.locationExtra": "Ubicación Extra",
    "form.costPrice": "Precio de Coste",
    "form.salePrice": "Precio de Venta",
    "form.supplierCode": "Código de Proveedor",
    "form.unitOfMeasure": "Unidad de Medida",
    "form.purchaseUrl": "URL de Compra",
    "form.imageUrl": "URL de Imagen",
    "form.weightKg": "Peso (kg)",
    "form.dimensions": "Dimensiones (cm)",
    "form.length": "Largo",
    "form.width": "Ancho",
    "form.height": "Alto",
    "form.notes": "Notas",
    "form.activeProduct": "Producto activo",
    "form.batchTracked": "Control por lotes",
    "form.cancel": "Cancelar",
    "form.save": "Guardando...",
    "form.update": "Actualizar",
    "form.create": "Crear Producte",
    // Admin
    "admin.title": "Administración",
    "admin.users": "Usuarios",
    "admin.permissions": "Permisos",
    "admin.settings": "Configuración",
    "admin.audit": "Auditoría",
    "admin.users.title": "Gestión de Usuarios",
    "admin.users.new": "Nuevo Usuario",
    "admin.users.search": "Buscar usuarios...",
    "admin.users.name": "Nombre",
    "admin.users.email": "Correo",
    "admin.users.role": "Rol",
    "admin.users.status": "Estado",
    "admin.users.lastLogin": "Último acceso",
    "admin.users.actions": "Acciones",
    "admin.users.active": "Activo",
    "admin.users.inactive": "Inactivo",
    "admin.users.edit": "Editar Usuario",
    "admin.users.delete": "Eliminar Usuario",
    "admin.users.changeRole": "Cambiar Rol",
    "admin.users.toggleStatus": "Activar/Desactivar",
    "admin.permissions.title": "Gestión de Permisos",
    "admin.permissions.user": "Usuario",
    "admin.permissions.permission": "Permiso",
    "admin.permissions.grant": "Conceder",
    "admin.permissions.revoke": "Revocar",
    "admin.settings.title": "Configuración del Sistema",
    "admin.settings.companyName": "Nombre de la Empresa",
    "admin.settings.defaultLanguage": "Idioma por Defecto",
    "admin.settings.stockAlarmDays": "Días de Alarma de Stock",
    "admin.settings.batchExpiryDays": "Días de Caducidad",
    "admin.audit.title": "Auditoría y Logs",
    "admin.audit.user": "Usuario",
    "admin.audit.action": "Acción",
    "admin.audit.timestamp": "Fecha/Hora",
    "admin.audit.success": "Éxito",
    "admin.audit.failure": "Fallo",
    "admin.audit.filter": "Filtrar por usuario...",
    // Movimientos
    "movements.title": "Movimientos",
    "movements.total": "movimientos registrados",
    "movements.new": "Nuevo Movimiento",
    "movements.noMovements": "No hay movimientos",
    "movements.createFirst": "Registra tu primer movimiento para comenzar",
    "movements.date": "Fecha",
    "movements.type": "Tipo",
    "movements.product": "Producto",
    "movements.quantity": "Cantidad",
    "movements.stockBefore": "Stock Antes",
    "movements.stockAfter": "Stock Después",
    "movements.reason": "Motivo",
    "movements.category": "Categoría",
    "movements.comments": "Comentarios",
    "movements.dateFrom": "Desde",
    "movements.dateTo": "Hasta",
    "movements.type.IN": "Entrada",
    "movements.type.OUT": "Salida",
    "movements.type.ADJUSTMENT": "Ajuste",
    "movements.type.TRANSFER": "Transferencia",
    "movements.category.PURCHASE": "Compra",
    "movements.category.RETURN": "Devolución",
    "movements.category.PRODUCTION": "Producción",
    "movements.category.CONSUMPTION": "Consumo",
    "movements.category.DEFECTIVE": "Defectuoso",
    "movements.category.EXPIRED": "Caducado",
    "movements.category.CORRECTION": "Corrección",
    "movements.category.INVENTORY_COUNT": "Inventario",
    "movements.category.OTHER": "Otro",
    "movements.searchProduct": "Buscar producto por código o nombre...",
    "movements.selectCategory": "Seleccionar categoría...",
    "movements.reasonPlaceholder": "Describe el motivo del movimiento",
    "movements.commentsPlaceholder": "Comentarios adicionales (opcional)",
    "movements.availableStock": "Stock disponible",
    "movements.register": "Registrar Movimiento",
    "movements.error.noProduct": "Debes seleccionar un producto",
    "movements.error.invalidQuantity": "La cantidad debe ser mayor que 0",
    "movements.error.noReason": "El motivo es obligatorio",
    "movements.error.insufficientStock": "Stock insuficiente. Stock actual: {current}",
    // Alarmas
    "alarms.title": "Alarmas de Stock",
    "alarms.productsInAlarm": "productos en alarma",
    "alarms.critical": "Crítico",
    "alarms.high": "Alto",
    "alarms.medium": "Medio",
    "alarms.noAlarms": "Sin alarmas",
    "alarms.allStockOk": "Todos los productos tienen stock suficiente",
    "alarms.current": "Actual",
    "alarms.minimum": "Mínimo",
    "alarms.need": "Necesitas",
    // Escáner
    "scanner.title": "Escáner",
    "scanner.subtitle": "Escanea códigos de barras o introduce manualmente",
    "scanner.mode.search": "Buscar",
    "scanner.mode.movement": "Movimiento",
    "scanner.placeholder": "Escanea o escribe el código...",
    "scanner.instructions": "El campo mantiene el foco automáticamente para escáner USB",
    "scanner.manualSearch": "Buscar",
    "scanner.found": "Producto encontrado",
    "scanner.notFound": "No encontrado",
    "scanner.notFoundDesc": "El código no corresponde a ningún producto",
    "scanner.history": "Historial de escaneos",
    "scanner.howToUse": "Cómo usar el escáner",
    "scanner.tip1": "Conecta un escáner USB y escanea directamente",
    "scanner.tip2": "También puedes escribir el código manualmente",
    "scanner.tip3": "Presiona Enter para buscar",
    // Lotes
    "batches.title": "Lotes",
    "batches.total": "lotes en total",
    "batches.noBatches": "No hay lotes",
    "batches.noBatchesDesc": "Los lotes aparecerán cuando se creen productos con control por lotes",
    "batches.code": "Código de Lote",
    "batches.product": "Producto",
    "batches.status": "Estado",
    "batches.quantityTotal": "Total",
    "batches.quantityAvailable": "Disponible",
    "batches.receivedAt": "Recibido",
    "batches.expiryDate": "Caducidad",
    "batches.changeStatus": "Cambiar Estado",
    "batches.newStatus": "Nuevo Estado",
    "batches.reason": "Motivo",
    "batches.reasonPlaceholder": "Describe el motivo del cambio de estado...",
    "batches.status.OK": "OK",
    "batches.status.DEFECTIVE": "Defectuoso",
    "batches.status.BLOCKED": "Bloqueado",
    "batches.status.CONSUMED": "Consumido",
    "batches.status.EXPIRED": "Caducado",
    // Común adicional
    "common.refresh": "Actualizar",
    "common.saving": "Guardando...",
    // Dashboard
    "dashboard.inventoryValueCost": "Valor del Inventario (Coste)",
    "dashboard.inventoryValueSale": "Valor del Inventario (Venta)",
    "dashboard.units": "unidades",
    "dashboard.potentialMargin": "margen potencial",
    "dashboard.movementsToday": "Movimientos Hoy",
    "dashboard.thisWeek": "esta semana",
    "dashboard.categories": "Categorías",
    "dashboard.products": "productos",
    "dashboard.activeProducts": "Productos Activos",
    "dashboard.lowStockAlerts": "En Alarma de Stock",
    "dashboard.criticalBatches": "Lotes Críticos",
    "dashboard.aiSuggestions": "Sugerencias IA",
    "dashboard.movementsChart": "Movimientos Últimos 7 Días",
    "dashboard.entries": "Entradas",
    "dashboard.exits": "Salidas",
    "dashboard.adjustments": "Ajustes",
    "dashboard.noData": "Sin datos",
    "dashboard.topProducts": "Top Productos",
    "dashboard.totalValue": "Valor Total",
    // Atajos de teclado
    "shortcuts.title": "Atajos de Teclado",
    "shortcuts.subtitle": "Navega más rápido con atajos",
    "shortcuts.hint": "Presiona",
    "shortcuts.toToggle": "para mostrar/ocultar este panel"
  },
  "ca-ES": {
    "login.title": "Inventari",
    "login.subtitle": "Inicia sessió per continuar",
    "login.email": "Correu electrònic",
    "login.password": "Contrasenya",
    "login.remember": "Recordar sessió",
    "login.submit": "Iniciar sessió",
    "login.submitting": "Iniciant…",
    "login.success": "Credencials correctes, redirigint...",
    "login.error": "Error en iniciar sessió",
    "login.error.invalidCredentials": "Credencials invàlides. Si us plau, verifica el teu correu i contrasenya.",
    "login.error.network": "Error de connexió. Verifica la teva connexió a internet.",
    "login.error.emailRequired": "El correu electrònic és obligatori",
    "login.error.emailInvalid": "Si us plau, introdueix un correu electrònic vàlid",
    "login.error.passwordRequired": "La contrasenya és obligatòria",
    "login.error.passwordMinLength": "La contrasenya ha de tenir almenys 6 caràcters",
    "login.feature.secure": "Segur i fiable",
    "login.feature.fast": "Ràpid i eficient",
    "login.feature.control": "Control total de l'inventari",
    "login.version": "Versió",
    "app.name": "MAGATZEM MEYPAR",
    "app.subtitle": "Sistema d'Inventari",
    "connection.connected": "Conectat",
    "connection.disconnected": "Desconnectat",
    "connection.checking": "Comprovant...",
    "connection.title.connected": "Conectat a la base de dades",
    "connection.title.disconnected": "Desconnectat de la base de dades",
    "connection.title.checking": "Comprovant connexió...",
    // Columnes de taula
    "table.code": "Codi",
    "table.name": "Nom",
    "table.category": "Categoria",
    "table.stock": "Estoc",
    "table.min": "Mín",
    "table.location": "Ubicació",
    "table.supplierCode": "Codi Proveïdor",
    "table.status": "Estat",
    "table.actions": "Accions",
    // Botons d'acció
    "actions.view": "Veure detall",
    "actions.edit": "Editar",
    "actions.delete": "Eliminar",
    "actions.movement": "Registrar moviment",
    "actions.duplicate": "Duplicar",
    "actions.history": "Veure historial",
    "actions.export": "Exportar",
    "actions.activate": "Activar",
    "actions.deactivate": "Desactivar",
    "actions.confirmDelete": "Estàs segur d'eliminar aquest producte?",
    // Productes
    "products.title": "Productes",
    "products.total": "productes en total",
    "products.new": "Nou Producte",
    "products.export": "Exportar Excel",
    "products.search": "Buscar per codi, nom o barcode...",
    "products.includeInactive": "Incloure inactius",
    "products.lowStockOnly": "Només en alarma",
    "products.noProducts": "No hi ha productes",
    "products.createFirst": "Crea el teu primer producte per començar",
    "products.batches": "Lots",
    "products.alarm": "Alarma",
    "products.ok": "OK",
    // Paginació
    "pagination.showing": "Mostrant",
    "pagination.of": "de",
    "pagination.previous": "Anterior",
    "pagination.next": "Següent",
    // Notificacions
    "notifications.title": "Notificacions",
    "notifications.unread": "sense llegir",
    "notifications.loading": "Carregant...",
    "notifications.empty": "No hi ha notificacions",
    "notifications.viewAll": "Veure totes les notificacions",
    // Usuari
    "user.profile": "Perfil",
    "user.settings": "Configuració",
    "user.logout": "Tancar sessió",
    // Xat IA
    "ai.chat.title": "MEYPAR IA",
    "ai.chat.subtitle": "Pregunta'm sobre l'aplicació",
    "ai.chat.placeholder": "Escriu la teva pregunta...",
    "ai.chat.send": "Enviar",
    "ai.chat.welcome": "Hola, sóc el teu assistent d'IA",
    "ai.chat.welcome.description": "Puc ajudar-te a entendre com utilitzar l'aplicació, consultar dades i explicar permisos. En què et puc ajudar?",
    "ai.chat.suggestions.how-create-product": "Com creo un producte?",
    "ai.chat.suggestions.low-stock": "Quins productes estan en alarma?",
    "ai.chat.suggestions.scanner": "Com utilitzo l'escàner?",
    "ai.chat.typing": "Escrivint...",
    "ai.chat.error": "Ho sento, hi ha hagut un error en processar el teu missatge. Si us plau, torna-ho a intentar.",
    "ai.chat.close": "Tancar xat",
    "ai.chat.open": "Obrir xat d'IA",
    // Filtres
    "filters.title": "Filtres",
    "filters.all": "Totes",
    "filters.min": "Mín",
    "filters.max": "Màx",
    "filters.batchTracked": "Només amb lots",
    "filters.clear": "Netejar",
    "filters.apply": "Aplicar",
    "filters.supplierCodePlaceholder": "Buscar per codi...",
    // Exportació
    "export.title": "Exportar Dades",
    "export.subtitle": "Configura la teva exportació",
    "export.selectAll": "Seleccionar totes",
    "export.deselectAll": "Deseleccionar totes",
    "export.selected": "seleccionades",
    "export.selectColumns": "Columnes a exportar",
    "export.export": "Exportar",
    "export.exporting": "Exportant...",
    "export.format": "Format d'exportació",
    "export.formatExcelDesc": "Format Excel amb estils",
    "export.formatCsvDesc": "Text pla separat per comes",
    "export.formatPdfDesc": "Document portable per imprimir",
    "export.includeFilters": "Incloure filtres aplicats",
    "export.activeFilters": "filtres actius",
    "export.filtersPreview": "Filtres a incloure:",
    "export.pdfNote": "El PDF pot trigar uns segons",
    "export.fileNote": "El fitxer es descarregarà automàticament",
    "export.errorNoColumns": "Has de seleccionar almenys una columna",
    // Comú
    "common.cancel": "Cancel·lar",
    "common.save": "Desar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.view": "Veure",
    "common.close": "Tancar",
    "common.noResults": "No s'han trobat resultats",
    "common.comingSoon": "Pròximament...",
    // Navegació
    "nav.dashboard": "Dashboard",
    "nav.products": "Productes",
    "nav.batches": "Lots",
    "nav.movements": "Moviments",
    "nav.alerts": "Alarmes",
    "nav.scanner": "Escàner",
    "nav.chat": "Xat",
    "nav.reports": "Informes",
    "nav.settings": "Configuració",
    "nav.admin": "Admin",
    "nav.language": "Idioma",
    // Cerca
    "search.loading": "Buscant...",
    "search.noResults": "No s'han trobat resultats",
    "search.recent": "Cerques recents",
    "search.product": "Producte",
    "search.batch": "Lot",
    // Validacions formulari
    "validation.code.required": "El codi és obligatori",
    "validation.code.minLength": "El codi ha de tenir almenys 3 caràcters",
    "validation.code.noSpaces": "El codi no pot contenir espais",
    "validation.name.required": "El nom és obligatori",
    "validation.name.minLength": "El nom ha de tenir almenys 2 caràcters",
    "validation.stockMin.required": "L'estoc mínim és obligatori",
    "validation.stockMin.invalid": "L'estoc mínim ha de ser un nombre >= 0",
    "validation.stockCurrent.invalid": "L'estoc actual ha de ser un nombre >= 0",
    "validation.stockMax.invalid": "L'estoc màxim ha de ser major que el mínim",
    "validation.aisle.required": "El passadís és obligatori",
    "validation.shelf.required": "L'estanteria és obligatòria",
    "validation.costPrice.required": "El preu de cost és obligatori",
    "validation.costPrice.invalid": "El preu de cost ha de ser un nombre >= 0",
    "validation.salePrice.invalid": "El preu de venda ha de ser >= preu de cost",
    "validation.dimensions.invalid": "Les dimensions han de ser nombres positius",
    "validation.url.invalid": "Si us plau, introdueix una URL vàlida",
    // Formulari producte
    "form.basicInfo": "Informació Bàsica",
    "form.stock": "Estoc",
    "form.location": "Ubicació",
    "form.prices": "Preus",
    "form.additionalInfo": "Informació Adicional",
    "form.options": "Opcions",
    "form.barcode": "Codi de Barres",
    "form.description": "Descripció",
    "form.stockCurrent": "Estoc Actual",
    "form.stockMin": "Estoc Mínim",
    "form.stockMax": "Estoc Màxim",
    "form.aisle": "Passadís",
    "form.shelf": "Estanteria",
    "form.locationExtra": "Ubicació Extra",
    "form.costPrice": "Preu de Cost",
    "form.salePrice": "Preu de Venda",
    "form.supplierCode": "Codi Proveïdor",
    "form.unitOfMeasure": "Unitat de Mesura",
    "form.purchaseUrl": "URL de Compra",
    "form.imageUrl": "URL d'Imatge",
    "form.weightKg": "Pes (kg)",
    "form.dimensions": "Dimensions (cm)",
    "form.length": "Llarg",
    "form.width": "Ample",
    "form.height": "Alt",
    "form.notes": "Notes",
    "form.activeProduct": "Producte actiu",
    "form.batchTracked": "Control per lots",
    "form.cancel": "Cancel·lar",
    "form.save": "Desant...",
    "form.update": "Actualitzar",
    "form.create": "Crear Producte",
    // Admin
    "admin.title": "Administració",
    "admin.users": "Usuaris",
    "admin.permissions": "Permisos",
    "admin.settings": "Configuració",
    "admin.audit": "Auditoria",
    "admin.users.title": "Gestió d'Usuaris",
    "admin.users.new": "Nou Usuari",
    "admin.users.search": "Buscar usuaris...",
    "admin.users.name": "Nom",
    "admin.users.email": "Correu",
    "admin.users.role": "Rol",
    "admin.users.status": "Estat",
    "admin.users.lastLogin": "Últim accés",
    "admin.users.actions": "Accions",
    "admin.users.active": "Actiu",
    "admin.users.inactive": "Inactiu",
    "admin.users.edit": "Editar Usuari",
    "admin.users.delete": "Eliminar Usuari",
    "admin.users.changeRole": "Canviar Rol",
    "admin.users.toggleStatus": "Activar/Desactivar",
    "admin.permissions.title": "Gestió de Permisos",
    "admin.permissions.user": "Usuari",
    "admin.permissions.permission": "Permís",
    "admin.permissions.grant": "Concedir",
    "admin.permissions.revoke": "Revocar",
    "admin.settings.title": "Configuració del Sistema",
    "admin.settings.companyName": "Nom de l'Empresa",
    "admin.settings.defaultLanguage": "Idioma per Defecte",
    "admin.settings.stockAlarmDays": "Dies d'Alarma d'Estoc",
    "admin.settings.batchExpiryDays": "Dies de Caducitat",
    "admin.audit.title": "Auditoria i Logs",
    "admin.audit.user": "Usuari",
    "admin.audit.action": "Acció",
    "admin.audit.timestamp": "Data/Hora",
    "admin.audit.success": "Èxit",
    "admin.audit.failure": "Fallida",
    "admin.audit.filter": "Filtrar per usuari...",
    // Moviments
    "movements.title": "Moviments",
    "movements.total": "moviments registrats",
    "movements.new": "Nou Moviment",
    "movements.noMovements": "No hi ha moviments",
    "movements.createFirst": "Registra el teu primer moviment per començar",
    "movements.date": "Data",
    "movements.type": "Tipus",
    "movements.product": "Producte",
    "movements.quantity": "Quantitat",
    "movements.stockBefore": "Estoc Abans",
    "movements.stockAfter": "Estoc Després",
    "movements.reason": "Motiu",
    "movements.category": "Categoria",
    "movements.comments": "Comentaris",
    "movements.dateFrom": "Des de",
    "movements.dateTo": "Fins a",
    "movements.type.IN": "Entrada",
    "movements.type.OUT": "Sortida",
    "movements.type.ADJUSTMENT": "Ajust",
    "movements.type.TRANSFER": "Transferència",
    "movements.category.PURCHASE": "Compra",
    "movements.category.RETURN": "Devolució",
    "movements.category.PRODUCTION": "Producció",
    "movements.category.CONSUMPTION": "Consum",
    "movements.category.DEFECTIVE": "Defectuós",
    "movements.category.EXPIRED": "Caducat",
    "movements.category.CORRECTION": "Correcció",
    "movements.category.INVENTORY_COUNT": "Inventari",
    "movements.category.OTHER": "Altre",
    "movements.searchProduct": "Buscar producte per codi o nom...",
    "movements.selectCategory": "Seleccionar categoria...",
    "movements.reasonPlaceholder": "Descriu el motiu del moviment",
    "movements.commentsPlaceholder": "Comentaris addicionals (opcional)",
    "movements.availableStock": "Estoc disponible",
    "movements.register": "Registrar Moviment",
    "movements.error.noProduct": "Has de seleccionar un producte",
    "movements.error.invalidQuantity": "La quantitat ha de ser major que 0",
    "movements.error.noReason": "El motiu és obligatori",
    "movements.error.insufficientStock": "Estoc insuficient. Estoc actual: {current}",
    // Alarmes
    "alarms.title": "Alarmes d'Estoc",
    "alarms.productsInAlarm": "productes en alarma",
    "alarms.critical": "Crític",
    "alarms.high": "Alt",
    "alarms.medium": "Mitjà",
    "alarms.noAlarms": "Sense alarmes",
    "alarms.allStockOk": "Tots els productes tenen estoc suficient",
    "alarms.current": "Actual",
    "alarms.minimum": "Mínim",
    "alarms.need": "Necessites",
    // Escàner
    "scanner.title": "Escàner",
    "scanner.subtitle": "Escaneja codis de barres o introdueix manualment",
    "scanner.mode.search": "Buscar",
    "scanner.mode.movement": "Moviment",
    "scanner.placeholder": "Escaneja o escriu el codi...",
    "scanner.instructions": "El camp manté el focus automàticament per escàner USB",
    "scanner.manualSearch": "Buscar",
    "scanner.found": "Producte trobat",
    "scanner.notFound": "No trobat",
    "scanner.notFoundDesc": "El codi no correspon a cap producte",
    "scanner.history": "Historial d'escanejos",
    "scanner.howToUse": "Com utilitzar l'escàner",
    "scanner.tip1": "Connecta un escàner USB i escaneja directament",
    "scanner.tip2": "També pots escriure el codi manualment",
    "scanner.tip3": "Prem Enter per buscar",
    // Lots
    "batches.title": "Lots",
    "batches.total": "lots en total",
    "batches.noBatches": "No hi ha lots",
    "batches.noBatchesDesc": "Els lots apareixeran quan es creïn productes amb control per lots",
    "batches.code": "Codi de Lot",
    "batches.product": "Producte",
    "batches.status": "Estat",
    "batches.quantityTotal": "Total",
    "batches.quantityAvailable": "Disponible",
    "batches.receivedAt": "Rebut",
    "batches.expiryDate": "Caducitat",
    "batches.changeStatus": "Canviar Estat",
    "batches.newStatus": "Nou Estat",
    "batches.reason": "Motiu",
    "batches.reasonPlaceholder": "Descriu el motiu del canvi d'estat...",
    "batches.status.OK": "OK",
    "batches.status.DEFECTIVE": "Defectuós",
    "batches.status.BLOCKED": "Bloquejat",
    "batches.status.CONSUMED": "Consumit",
    "batches.status.EXPIRED": "Caducat",
    // Comú addicional
    "common.refresh": "Actualitzar",
    "common.saving": "Desant...",
    // Dashboard
    "dashboard.inventoryValueCost": "Valor de l'Inventari (Cost)",
    "dashboard.inventoryValueSale": "Valor de l'Inventari (Venda)",
    "dashboard.units": "unitats",
    "dashboard.potentialMargin": "marge potencial",
    "dashboard.movementsToday": "Moviments Avui",
    "dashboard.thisWeek": "aquesta setmana",
    "dashboard.categories": "Categories",
    "dashboard.products": "productes",
    "dashboard.activeProducts": "Productes Actius",
    "dashboard.lowStockAlerts": "En Alarma d'Estoc",
    "dashboard.criticalBatches": "Lots Crítics",
    "dashboard.aiSuggestions": "Suggeriments IA",
    "dashboard.movementsChart": "Moviments Últims 7 Dies",
    "dashboard.entries": "Entrades",
    "dashboard.exits": "Sortides",
    "dashboard.adjustments": "Ajustos",
    "dashboard.noData": "Sense dades",
    "dashboard.topProducts": "Top Productes",
    "dashboard.totalValue": "Valor Total",
    // Dreceres de teclat
    "shortcuts.title": "Dreceres de Teclat",
    "shortcuts.subtitle": "Navega més ràpid amb dreceres",
    "shortcuts.hint": "Prem",
    "shortcuts.toToggle": "per mostrar/ocultar aquest panell"
  }
};

/**
 * Contexto para gestionar el idioma de la aplicación (es-ES/ca-ES).
 * Sincroniza con Supabase user_settings y localStorage.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<LanguageCode>(() => {
    const stored = localStorage.getItem("language") as LanguageCode | null;
    return stored ?? "ca-ES"; // Idioma por defecto: CATALÁN
  });

  const t = React.useCallback(
    (key: string): string => {
      return translations[language]?.[key] ?? key;
    },
    [language]
  );

  // Sincronizar idioma con Supabase cuando cambia
  const setLanguage = React.useCallback(async (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    
    // Sincronizar con Supabase si hay sesión activa
    try {
      const { supabaseClient } = await import("@infrastructure/supabase/supabaseClient");
      const { data: { session } } = await supabaseClient.auth.getSession();
      
      if (session?.user?.id) {
        await supabaseClient
          .from("user_settings")
          .upsert({
            user_id: session.user.id,
            language: lang,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "user_id"
          });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[LanguageContext] Error sincronizando idioma con Supabase:", error);
    }
  }, []);

  // Cargar idioma desde Supabase al montar si hay sesión
  React.useEffect(() => {
    const loadLanguageFromSupabase = async () => {
      try {
        const { supabaseClient } = await import("@infrastructure/supabase/supabaseClient");
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.user?.id) {
          const { data: settings } = await supabaseClient
            .from("user_settings")
            .select("language")
            .eq("user_id", session.user.id)
            .single();
          
          if (settings?.language && (settings.language === "es-ES" || settings.language === "ca-ES")) {
            setLanguageState(settings.language as LanguageCode);
            localStorage.setItem("language", settings.language);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[LanguageContext] Error cargando idioma desde Supabase:", error);
      }
    };

    loadLanguageFromSupabase();

    // Escuchar eventos de cambio de idioma desde AuthContext
    const handleLanguageChange = (event: CustomEvent) => {
      const newLanguage = event.detail as LanguageCode;
      if (newLanguage === "es-ES" || newLanguage === "ca-ES") {
        setLanguageState(newLanguage);
      }
    };

    window.addEventListener("language-changed", handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener("language-changed", handleLanguageChange as EventListener);
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de idioma.
 */
export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  }
  return context;
}

