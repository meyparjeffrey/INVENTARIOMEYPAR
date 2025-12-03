import type {
  AiResponse,
  ProjectStructure,
  QuestionIntent,
  QuestionCategory
} from "./types";
import { CodeAnalyzer } from "./CodeAnalyzer";
import { CHAT_MENU_STRUCTURE, generateMenuResponse, type MenuOption } from "./ChatMenuStructure";

/**
 * Motor que clasifica preguntas y genera respuestas contextuales
 */
export class ResponseEngine {
  private codeAnalyzer: CodeAnalyzer;

  constructor() {
    this.codeAnalyzer = CodeAnalyzer.getInstance();
  }

  /**
   * Clasifica la intención de una pregunta
   */
  async classifyQuestion(question: string): Promise<QuestionIntent> {
    try {
      if (!question || typeof question !== "string" || !question.trim()) {
        return {
          category: "general",
          keywords: [],
          confidence: 0
        };
      }
      
      const lowerQuestion = question.toLowerCase();

    // Palabras clave para cada categoría (ES y CA)
    const howToKeywords = [
      "cómo", "como", "com", "com fer", "com crear", "com utilitzar", "com usar",
      "como hacer", "cómo hacer", "como crear", "cómo crear", "como editar", "cómo editar",
      "como usar", "cómo usar", "como escanear", "cómo escanear", "com escanejar",
      "como modificar", "cómo modificar", "com modificar",
      "como filtrar", "cómo filtrar", "como buscar", "cómo buscar",
      "como exportar", "cómo exportar",
      "pasos", "passos", "explicar", "explicar-me", "ayuda con", "ajuda amb",
      "manual", "guía", "guia", "instrucciones"
    ];

    const dataQueryKeywords = [
      "qué", "que", "què", "cuántos", "cuantos", "quants", "cuántas", "cuantas", "quantes",
      "listar", "llistar", "mostrar", "dame", "dona'm", "dime", "digues-me",
      "buscar", "cercar", "encontrar", "trobar",
      "productos en alarma", "productes en alarma", "quins productes", "quins productos",
      "stock", "estoc", "cuánto stock", "quant estoc", "tiene stock", "té estoc",
      "lotes", "lots", "movimientos", "moviments", "historial", "moviments de",
      "historial del", "movimientos del", "cuánto tiene", "quant té"
    ];

    const permissionsKeywords = [
      "permiso", "permisos", "permís", "permisos",
      "rol", "roles", "puedo", "puc", "puede", "pot",
      "autorización", "autorització", "acceso", "accés"
    ];

    const featuresKeywords = [
      "funcionalidad",
      "funcionalidades",
      "características",
      "caracteristicas",
      "qué hace",
      "que hace",
      "para qué sirve",
      "para que sirve"
    ];

    // Contar coincidencias
    const howToScore = howToKeywords.filter((kw) =>
      lowerQuestion.includes(kw)
    ).length;
    const dataQueryScore = dataQueryKeywords.filter((kw) =>
      lowerQuestion.includes(kw)
    ).length;
    const permissionsScore = permissionsKeywords.filter((kw) =>
      lowerQuestion.includes(kw)
    ).length;
    const featuresScore = featuresKeywords.filter((kw) =>
      lowerQuestion.includes(kw)
    ).length;

    // Determinar categoría principal
    const scores = [
      { category: "how_to" as QuestionCategory, score: howToScore },
      { category: "data_query" as QuestionCategory, score: dataQueryScore },
      { category: "permissions" as QuestionCategory, score: permissionsScore },
      { category: "features" as QuestionCategory, score: featuresScore }
    ];

    scores.sort((a, b) => b.score - a.score);
    const maxScore = scores[0].score;

    // Si no hay coincidencias claras, es una pregunta general
    if (maxScore === 0) {
      return {
        category: "general",
        keywords: [],
        confidence: 0.5
      };
    }

    const confidence = Math.min(maxScore / 3, 1); // Normalizar a 0-1

      return {
        category: scores[0].category,
        keywords: question.split(/\s+/),
        confidence,
        action: this.extractAction(question)
      };
    } catch (error) {
      console.error("Error clasificando pregunta:", error);
      return {
        category: "general",
        keywords: [],
        confidence: 0
      };
    }
  }

  /**
   * Extrae la acción específica de la pregunta
   */
  private extractAction(question: string): string | undefined {
    const lowerQuestion = question.toLowerCase();

    // Extraer verbos de acción
    const actions: Record<string, string> = {
      crear: "create",
      editar: "edit",
      modificar: "edit",
      eliminar: "delete",
      ver: "view",
      buscar: "search",
      escanear: "scan",
      exportar: "export",
      imprimir: "print",
      filtrar: "filter",
      usuario: "user",
      dashboard: "view"
    };

    for (const [spanish, english] of Object.entries(actions)) {
      if (lowerQuestion.includes(spanish)) {
        return english;
      }
    }

    return undefined;
  }

  /**
   * Genera una respuesta según la categoría de la pregunta
   */
  async generateResponse(
    question: string,
    intent: QuestionIntent,
    userPermissions: string[],
    userRole?: string
  ): Promise<AiResponse> {
    try {
      let structure: ProjectStructure;
      try {
        structure = await this.codeAnalyzer.analyzeProject();
      } catch (error) {
        console.warn("Error analizando proyecto, usando estructura mínima:", error);
        structure = {
          routes: [],
          components: [],
          services: [],
          hooks: [],
          permissions: [],
          lastAnalyzed: new Date()
        };
      }

      console.log("📋 Categoría detectada:", intent.category);
      
      switch (intent.category) {
        case "how_to":
          console.log("📖 Generando respuesta 'how_to'");
          return this.generateHowToResponse(question, intent, structure, userPermissions, userRole);

        case "data_query":
          console.log("📊 Generando respuesta 'data_query'");
          return this.generateDataQueryResponse(question, intent);

        case "permissions":
          console.log("🔐 Generando respuesta 'permissions'");
          return this.generatePermissionsResponse(question, intent, structure, userPermissions, userRole);

        case "features":
          console.log("⚙️ Generando respuesta 'features'");
          return this.generateFeaturesResponse(question, intent, structure);

        default:
          console.log("❓ Generando respuesta 'general'");
          return this.generateGeneralResponse(question);
      }
    } catch (error) {
      console.error("Error en generateResponse:", error);
      return {
        content: "Lo siento, hubo un error al generar la respuesta. Por favor, inténtalo de nuevo."
      };
    }
  }

  /**
   * Genera respuesta para preguntas "cómo hacer X"
   */
  private generateHowToResponse(
    question: string,
    intent: QuestionIntent,
    structure: ProjectStructure,
    userPermissions: string[],
    userRole?: string
  ): AiResponse {
    const lowerQuestion = question.toLowerCase();
    let response = "";
    const sources: string[] = [];
    let requiresPermission: string | undefined;

    // Manejar acciones específicas del menú
    if (lowerQuestion.startsWith("how_to:")) {
      const action = lowerQuestion.replace("how_to:", "");
      switch (action) {
        case "create_product":
          requiresPermission = "products.create";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "crear productos",
              requiresPermission,
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>📦 Cómo Crear un Producto</strong><br /><br />

<strong>Paso 1: Acceder al formulario</strong><br />
• Navega a la página de productos desde el menú lateral<br />
• Haz clic en el botón "Nuevo Producto" (arriba a la derecha)<br /><br />

<strong>Paso 2: Completar el formulario</strong><br /><br />

<strong>📋 Información Básica:</strong><br />
• <strong>Código*</strong>: Identificador único del producto (ej: CABLE-001). No puede repetirse.<br />
• <strong>Nombre*</strong>: Nombre descriptivo del producto (ej: "Cable Unifilar Marrón 1x1")<br />
• <strong>Descripción</strong>: Detalles adicionales sobre el producto (opcional)<br />
• <strong>Categoría</strong>: Clasificación del producto (opcional)<br />
• <strong>Código de Barras</strong>: Código EAN/UPC para escaneo (opcional)<br /><br />

<strong>📊 Stock:</strong><br />
• <strong>Stock Actual*</strong>: Cantidad disponible actualmente en el almacén<br />
• <strong>Stock Mínimo*</strong>: Cantidad mínima antes de generar alarma (cuando el stock actual ≤ mínimo, aparece en alertas)<br />
• <strong>Stock Máximo</strong>: Cantidad máxima recomendada (opcional, para control de sobrestock)<br />
• <strong>Unidad de Medida</strong>: Unidad (unidades, kg, m, etc.)<br /><br />

<strong>📍 Ubicación:</strong><br />
• <strong>Pasillo*</strong>: Número o letra del pasillo donde está ubicado<br />
• <strong>Estante*</strong>: Número o letra del estante<br />
• <strong>Ubicación Extra</strong>: Información adicional de ubicación (opcional)<br /><br />

<strong>💰 Precios:</strong><br />
• <strong>Precio de Coste*</strong>: Precio al que compras el producto al proveedor<br />
• <strong>Precio de Venta</strong>: Precio al que vendes el producto (opcional)<br /><br />

<strong>📦 Información Adicional:</strong><br />
• <strong>Código de Proveedor</strong>: Referencia del producto en el catálogo del proveedor<br />
• <strong>URL de Compra</strong>: Enlace directo para comprar el producto<br />
• <strong>URL de Imagen</strong>: Enlace a imagen del producto<br />
• <strong>Peso</strong>: Peso del producto (opcional)<br />
• <strong>Dimensiones</strong>: Dimensiones del producto (opcional)<br />
• <strong>Notas</strong>: Observaciones adicionales (opcional)<br /><br />

<strong>⚙️ Opciones:</strong><br />
• <strong>Producto Activo</strong>: Si está desactivado, no aparecerá en listados (útil para productos descontinuados)<br />
• <strong>Control por Lotes</strong>: Activa si el producto requiere seguimiento por lotes (fechas de caducidad, números de lote, etc.)<br /><br />

<strong>⚠️ Campos obligatorios (*):</strong> Código, Nombre, Stock Actual, Stock Mínimo, Pasillo, Estante, Precio de Coste<br /><br />

<strong>Paso 3: Guardar</strong><br />
• Haz clic en "Crear Producto" para guardar<br />
• Serás redirigido a la lista de productos<br />
• El producto aparecerá inmediatamente en la tabla<br /><br />

<strong>💡 Consejo:</strong> Si activas "Control por Lotes", podrás gestionar fechas de caducidad y números de lote para este producto.`;
          sources.push("/products/new");
          break;

        case "filter_products":
          response = `<strong>🔎 Cómo Filtrar y Buscar Productos</strong><br /><br />

<strong>Método 1: Búsqueda Rápida</strong><br />
• Usa la barra de búsqueda en la parte superior de la página<br />
• Busca por: nombre del producto, código o código de barras<br />
• La búsqueda es en tiempo real (se filtra mientras escribes)<br />
• No distingue entre mayúsculas y minúsculas<br /><br />

<strong>Método 2: Filtros Rápidos</strong><br /><br />

<strong>⚠️ Solo Alarma:</strong><br />
• Muestra solo productos con stock bajo<br />
• Un producto está en alarma cuando: Stock Actual ≤ Stock Mínimo<br />
• Útil para identificar rápidamente qué productos necesitan reposición<br />
• Este filtro consulta TODA la base de datos, no solo la página visible<br /><br />

<strong>📋 Incluir Inactivos:</strong><br />
• Por defecto, solo se muestran productos activos<br />
• Activa este filtro para ver también productos desactivados<br />
• Útil para productos descontinuados o temporalmente fuera de uso<br /><br />

<strong>Método 3: Filtros Avanzados</strong><br />
Haz clic en el icono de embudo (🔽) para abrir el menú de filtros avanzados:<br /><br />

<strong>📂 Categoría:</strong><br />
• Filtra productos por su categoría específica<br />
• Ejemplo: "Cables", "Herramientas", "Material Eléctrico"<br />
• Solo muestra productos de la categoría seleccionada<br /><br />

<strong>📦 Control por Lotes:</strong><br />
• Muestra solo productos que tienen control por lotes activado<br />
• Útil para gestionar productos con fechas de caducidad<br />
• Los productos con lotes requieren seguimiento especial<br /><br />

<strong>📊 Rango de Stock:</strong><br />
• <strong>Stock Mínimo:</strong> Filtra productos con stock mínimo mayor o igual al valor<br />
• <strong>Stock Máximo:</strong> Filtra productos con stock máximo menor o igual al valor<br />
• Útil para encontrar productos con stock específico<br /><br />

<strong>💰 Rango de Precios:</strong><br />
• <strong>Precio Mínimo:</strong> Filtra productos con precio de coste mayor o igual<br />
• <strong>Precio Máximo:</strong> Filtra productos con precio de coste menor o igual<br />
• Útil para análisis de costes<br /><br />

<strong>🏷️ Código de Proveedor:</strong><br />
• Busca productos por su código de referencia del proveedor<br />
• Útil cuando conoces la referencia del proveedor pero no el código interno<br /><br />

<strong>💡 Consejos:</strong><br />
• Los filtros se combinan entre sí (AND lógico)<br />
• Puedes usar múltiples filtros a la vez<br />
• Para limpiar todos los filtros: usa el botón "Limpiar filtros" o cierra las etiquetas de filtro activas<br />
• Los filtros activos se muestran como etiquetas debajo de la barra de búsqueda<br />
• Puedes hacer clic en la X de cada etiqueta para eliminar ese filtro específico`;
          sources.push("/products");
          break;

        case "export_products":
        case "export_excel":
        case "export_csv":
        case "export_data":
          response = `<strong>📥 Cómo Exportar Productos</strong><br /><br />

<strong>Paso 1: Acceder a la Exportación</strong><br />
• Ve a la página de Productos (/products)<br />
• Haz clic en el botón "Exportar" (arriba a la derecha, icono de descarga 📥)<br />
• Se abrirá un cuadro de diálogo modal<br /><br />

<strong>Paso 2: Seleccionar Formato</strong><br />
• <strong>Excel (.xlsx)</strong>: Formato de Excel con formato y estilos<br />
  - Mejor para análisis y presentaciones<br />
  - Mantiene formato de números y fechas<br />
  - Permite fórmulas y gráficos<br /><br />
• <strong>CSV (.csv)</strong>: Formato de texto separado por comas<br />
  - Compatible con cualquier programa de hojas de cálculo<br />
  - Más ligero y rápido<br />
  - Ideal para importar en otros sistemas<br /><br />

<strong>Paso 3: Seleccionar Columnas</strong><br />
Por defecto están seleccionadas las columnas más importantes:<br />
• Codi (Código)<br />
• Nom (Nombre)<br />
• Estoc (Stock Actual)<br />
• Min (Stock Mínimo)<br />
• Stock Máxim (Stock Máximo)<br />
• Pasillo<br />
• Estante<br />
• Ubicación extra<br />
• Codi provedor (Código de Proveedor)<br />
• Control por lotes<br /><br />

Puedes seleccionar o deseleccionar cualquier columna según tus necesidades.<br /><br />

<strong>Paso 4: Opciones de Filtrado</strong><br />
• <strong>Incluir filtros activos</strong>: Si está marcado, solo exporta los productos que coinciden con los filtros aplicados<br />
• Si no está marcado, exporta TODOS los productos de la base de datos<br /><br />

<strong>Paso 5: Exportar</strong><br />
• Haz clic en el botón "Exportar" dentro del modal<br />
• El archivo se descargará automáticamente<br />
• El nombre del archivo incluye la fecha y hora de exportación<br /><br />

<strong>⚠️ Importante:</strong><br />
• La exportación incluye TODOS los productos que coinciden con los filtros, no solo los 25 visibles en la página<br />
• Si tienes filtros activos y marcas "Incluir filtros activos", solo se exportarán los productos filtrados<br />
• El archivo CSV incluye codificación UTF-8 con BOM para abrirse correctamente en Excel<br />
• Los archivos Excel incluyen formato básico (anchos de columna, formato de números)`;
          sources.push("/products");
          break;

        case "use_scanner":
          requiresPermission = "scanner.use";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "usar el escáner",
              requiresPermission,
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>📷 Cómo Usar el Escáner</strong><br /><br />

<strong>Paso 1: Acceder al Escáner</strong><br />
• Ve a la página de Escáner desde el menú lateral (/scanner)<br /><br />

<strong>Paso 2: Elegir Modo de Escaneo</strong><br /><br />

<strong>🔌 Escáner USB:</strong><br />
• Conecta tu escáner USB al ordenador<br />
• El campo de escaneo estará activo automáticamente<br />
• Simplemente escanea el código de barras o QR<br />
• El código se detectará automáticamente (el escáner USB actúa como un teclado)<br />
• No necesitas hacer clic en ningún botón, solo escanear<br /><br />

<strong>📸 Cámara:</strong><br />
• Haz clic en el botón "Activar cámara"<br />
• Permite el acceso a la cámara cuando el navegador lo solicite<br />
• Apunta la cámara hacia el código de barras o QR<br />
• El código se detectará automáticamente<br />
• Útil cuando no tienes escáner USB disponible<br /><br />

<strong>Paso 3: Después de Escanear</strong><br /><br />

<strong>Si escaneas un Producto:</strong><br />
• Verás la ficha completa del producto<br />
• Información: código, nombre, stock actual, ubicación<br />
• Acciones disponibles:<br />
  - Ver detalles completos del producto<br />
  - Registrar entrada de stock<br />
  - Registrar salida de stock<br />
  - Ver historial de movimientos<br /><br />

<strong>Si escaneas un Lote:</strong><br />
• Verás la información del lote<br />
• Información: número de lote, producto asociado, fecha de caducidad, cantidad<br />
• Acciones disponibles:<br />
  - Ver detalles del lote<br />
  - Ver producto asociado<br />
  - Reportar defectos<br />
  - Registrar movimientos<br /><br />

<strong>💡 Consejos:</strong><br />
• El escáner USB funciona mejor en un campo de texto con foco<br />
• Si el código no se detecta, intenta escanearlo de nuevo<br />
• Puedes escribir el código manualmente si el escáner no funciona<br />
• Los códigos de barras y QR son compatibles`;
          sources.push("/scanner");
          break;

        case "scanner_usb":
          requiresPermission = "scanner.use";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "usar el escáner USB",
              requiresPermission,
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>🔌 Escáner USB - Guía Completa</strong><br /><br />

<strong>Configuración:</strong><br />
1. Conecta tu escáner USB al ordenador<br />
2. El sistema operativo lo reconocerá automáticamente<br />
3. No necesitas instalar drivers adicionales (en la mayoría de casos)<br /><br />

<strong>Uso:</strong><br />
1. Ve a la página de Escáner (/scanner)<br />
2. Haz clic en el campo de escaneo para darle foco<br />
3. Escanea el código de barras o QR con tu escáner USB<br />
4. El código aparecerá automáticamente en el campo<br />
5. El sistema procesará el código y mostrará la información<br /><br />

<strong>Ventajas:</strong><br />
• Más rápido que escribir manualmente<br />
• Menos errores de escritura<br />
• Ideal para entornos de almacén<br />
• Funciona con códigos de barras y QR<br /><br />

<strong>Nota:</strong> El escáner USB se comporta como un teclado, por lo que escribe el código y envía Enter automáticamente.`;
          sources.push("/scanner");
          break;

        case "scanner_camera":
          requiresPermission = "scanner.use";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "usar la cámara para escanear",
              requiresPermission,
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>📸 Escáner con Cámara - Guía Completa</strong><br /><br />

<strong>Configuración:</strong><br />
1. Ve a la página de Escáner (/scanner)<br />
2. Haz clic en el botón "Activar cámara"<br />
3. Permite el acceso a la cámara cuando el navegador lo solicite<br />
4. La cámara se activará y mostrará la vista previa<br /><br />

<strong>Uso:</strong><br />
1. Asegúrate de tener buena iluminación<br />
2. Apunta la cámara hacia el código de barras o QR<br />
3. Mantén el código dentro del área de escaneo<br />
4. El código se detectará automáticamente<br />
5. El sistema procesará el código y mostrará la información<br /><br />

<strong>Ventajas:</strong><br />
• No necesitas hardware adicional<br />
• Funciona en dispositivos móviles y tablets<br />
• Ideal para uso ocasional<br />
• Compatible con códigos QR y de barras<br /><br />

<strong>Consejos:</strong><br />
• Mantén el código bien iluminado<br />
• Acerca la cámara lo suficiente para que el código sea legible<br />
• Evita reflejos y sombras<br />
• Si no se detecta, intenta cambiar el ángulo o la distancia`;
          sources.push("/scanner");
          break;

        case "create_movement_in":
          requiresPermission = "movements.create_in";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "registrar entradas",
              "movements.create_in",
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>⬆️ Cómo Registrar una Entrada de Stock</strong><br /><br />

<strong>¿Qué es una Entrada?</strong><br />
Una entrada aumenta el stock disponible de un producto. Se usa cuando:<br />
• Llega una compra del proveedor<br />
• Se devuelve material al almacén<br />
• Se corrige un error de inventario<br /><br />

<strong>Método 1: Desde el Escáner</strong><br />
1. Ve a la página de Escáner (/scanner)<br />
2. Escanea el código del producto o lote<br />
3. Selecciona "Registrar Entrada"<br />
4. Completa el formulario<br /><br />

<strong>Método 2: Desde Movimientos</strong><br />
1. Ve a la página de Movimientos (/movements)<br />
2. Haz clic en "Nuevo Movimiento" (si está disponible)<br />
3. Completa los campos<br /><br />

<strong>📝 Campos del Formulario:</strong><br />
• <strong>Producto*</strong>: Selecciona el producto del que quieres aumentar el stock<br />
• <strong>Lote</strong>: Si el producto tiene control por lotes, selecciona el lote específico (opcional)<br />
• <strong>Cantidad*</strong>: Número de unidades que entran (debe ser mayor que 0)<br />
• <strong>Motivo*</strong>: Explica por qué se realiza esta entrada (ej: "Compra proveedor", "Devolución cliente", "Corrección inventario")<br />
• <strong>Fecha</strong>: Fecha del movimiento (por defecto, fecha actual)<br /><br />

<strong>⚠️ Importante:</strong><br />
• El stock se actualiza automáticamente después de guardar<br />
• Si el producto tiene control por lotes, debes seleccionar o crear un lote<br />
• El motivo es obligatorio para auditoría<br />
• Los movimientos quedan registrados en el historial`;
          sources.push("/movements", "/scanner");
          break;

        case "create_movement_out":
          requiresPermission = "movements.create_out";
          if (!userPermissions.includes(requiresPermission)) {
            return this.generatePermissionDeniedResponse(
              "registrar salidas",
              "movements.create_out",
              userRole,
              ["WAREHOUSE", "ADMIN"]
            );
          }
          response = `<strong>⬇️ Cómo Registrar una Salida de Stock</strong><br /><br />

<strong>¿Qué es una Salida?</strong><br />
Una salida disminuye el stock disponible de un producto. Se usa cuando:<br />
• Se vende un producto<br />
• Se consume material<br />
• Se envía a otro almacén<br />
• Se descarta material defectuoso<br /><br />

<strong>Método 1: Desde el Escáner</strong><br />
1. Ve a la página de Escáner (/scanner)<br />
2. Escanea el código del producto o lote<br />
3. Selecciona "Registrar Salida"<br />
4. Completa el formulario<br /><br />

<strong>Método 2: Desde Movimientos</strong><br />
1. Ve a la página de Movimientos (/movements)<br />
2. Haz clic en "Nuevo Movimiento" (si está disponible)<br />
3. Completa los campos<br /><br />

<strong>📝 Campos del Formulario:</strong><br />
• <strong>Producto*</strong>: Selecciona el producto del que quieres disminuir el stock<br />
• <strong>Lote</strong>: Si el producto tiene control por lotes, selecciona el lote específico (opcional)<br />
• <strong>Cantidad*</strong>: Número de unidades que salen (debe ser mayor que 0 y no mayor al stock disponible)<br />
• <strong>Motivo*</strong>: Explica por qué se realiza esta salida (ej: "Venta cliente", "Consumo interno", "Envío almacén B")<br />
• <strong>Fecha</strong>: Fecha del movimiento (por defecto, fecha actual)<br /><br />

<strong>⚠️ Importante:</strong><br />
• El stock se actualiza automáticamente después de guardar<br />
• No puedes registrar una salida mayor al stock disponible<br />
• Si el producto tiene control por lotes, debes seleccionar el lote específico<br />
• El motivo es obligatorio para auditoría<br />
• Los movimientos quedan registrados en el historial`;
          sources.push("/movements", "/scanner");
          break;

        case "filter_movements":
          response = `<strong>🔎 Cómo Filtrar Movimientos</strong><br /><br />

<strong>Paso 1: Acceder a Movimientos</strong><br />
• Ve a la página de Movimientos desde el menú lateral (/movements)<br /><br />

<strong>Paso 2: Usar los Filtros</strong><br /><br />

<strong>📋 Filtro por Tipo:</strong><br />
• <strong>STOCK IN</strong> ⬆️: Solo entradas (aumentos de stock)<br />
• <strong>STOCK OUT</strong> ⬇️: Solo salidas (disminuciones de stock)<br />
• <strong>UBICACIÓN</strong> 📍: Solo transferencias entre ubicaciones<br />
• <strong>Código</strong>: Movimientos por cambios de código de producto<br />
• <strong>Nombre</strong>: Movimientos por cambios de nombre de producto<br />
• <strong>Descripción</strong>: Movimientos por cambios de descripción<br /><br />

<strong>📅 Filtro por Fecha:</strong><br />
• Selecciona un rango de fechas para ver movimientos en un período específico<br />
• Útil para reportes mensuales o búsquedas históricas<br /><br />

<strong>📦 Filtro por Producto:</strong><br />
• Busca por código o nombre del producto<br />
• Muestra todos los movimientos relacionados con ese producto<br /><br />

<strong>👤 Filtro por Usuario:</strong><br />
• Filtra por quién registró el movimiento<br />
• Útil para auditoría y seguimiento de acciones<br /><br />

<strong>🔄 Ordenar:</strong><br />
• Usa el botón "Ordenar" para cambiar el orden<br />
• Opciones: Por Fecha (ascendente/descendente) o Por Producto (A-Z / Z-A)<br />
• Por defecto, los movimientos más recientes aparecen primero<br /><br />

<strong>📥 Exportar:</strong><br />
• Puedes exportar los movimientos filtrados a Excel o CSV<br />
• El archivo incluirá solo los movimientos que coincidan con los filtros activos`;
          sources.push("/movements");
          break;

        case "export_movements":
          response = `<strong>📥 Cómo Exportar Movimientos</strong><br /><br />

<strong>Paso 1: Acceder a Movimientos</strong><br />
• Ve a la página de Movimientos (/movements)<br /><br />

<strong>Paso 2: Aplicar Filtros (Opcional)</strong><br />
• Puedes filtrar por tipo, fecha, producto o usuario antes de exportar<br />
• Los filtros son opcionales, puedes exportar todos los movimientos<br />
• Si aplicas filtros, solo se exportarán los movimientos que coincidan<br /><br />

<strong>Paso 3: Exportar</strong><br />
• Haz clic en el botón "Exportar" (si está disponible)<br />
• Selecciona el formato: Excel (.xlsx) o CSV (.csv)<br />
• El archivo se descargará automáticamente<br /><br />

<strong>📋 Información Incluida:</strong><br />
El archivo exportado incluye todas las columnas de movimientos:<br />
• Fecha y hora del movimiento<br />
• Tipo de movimiento (STOCK IN, STOCK OUT, UBICACIÓN, etc.)<br />
• Producto (código y nombre)<br />
• Cantidad<br />
• Motivo<br />
• Usuario que registró el movimiento<br />
• Ubicación (si aplica)<br />
• Lote (si aplica)<br /><br />

<strong>💡 Consejos:</strong><br />
• Usa filtros de fecha para exportar movimientos de un período específico<br />
• Exporta movimientos de un producto específico usando el filtro de producto<br />
• El formato Excel es mejor para análisis y presentaciones<br />
• El formato CSV es mejor para importar en otros sistemas`;
          sources.push("/movements");
          break;

        case "change_language":
          response = `<strong>🌐 Cómo Cambiar el Idioma</strong><br /><br />

<strong>Ubicación:</strong><br />
• El selector de idioma está en la esquina superior derecha del header<br />
• Está junto al botón de cambio de tema<br />
• Se muestra como un botón con las siglas del idioma actual (CAT o ES)<br /><br />

<strong>Idiomas Disponibles:</strong><br />
• <strong>CAT</strong> (ca-ES): Catalán - Idioma por defecto de la aplicación<br />
• <strong>ES</strong> (es-ES): Español<br /><br />

<strong>Cómo Cambiar:</strong><br />
1. Haz clic en el botón del idioma actual (CAT o ES)<br />
2. Se abrirá un menú desplegable<br />
3. Selecciona el idioma que deseas usar<br />
4. El cambio se aplicará inmediatamente en toda la aplicación<br /><br />

<strong>⚠️ Importante:</strong><br />
• El idioma seleccionado se guarda en tus preferencias de usuario<br />
• Se mantendrá en futuras sesiones<br />
• Todos los textos de la interfaz cambiarán al idioma seleccionado<br />
• Los mensajes del sistema también cambiarán de idioma`;
          sources.push("/settings");
          break;

        case "change_theme":
          response = `<strong>🎨 Cómo Cambiar el Tema</strong><br /><br />

<strong>Ubicación:</strong><br />
• El botón de tema está en la esquina superior derecha del header<br />
• Está junto al selector de idioma<br />
• Muestra un icono de sol (☀️) en modo claro o luna (🌙) en modo oscuro<br /><br />

<strong>Temas Disponibles:</strong><br />
• <strong>Tema Claro</strong>: Fondo blanco, texto oscuro<br />
  - Mejor para entornos con mucha luz<br />
  - Reduce el consumo de batería en pantallas OLED<br />
  - Más tradicional y familiar<br /><br />
• <strong>Tema Oscuro</strong>: Fondo oscuro, texto claro<br />
  - Mejor para entornos con poca luz<br />
  - Reduce la fatiga visual<br />
  - Más moderno y elegante<br /><br />

<strong>Cómo Cambiar:</strong><br />
1. Haz clic en el botón de tema (icono de sol/luna)<br />
2. El tema cambiará inmediatamente<br />
3. El cambio se guarda automáticamente en tus preferencias<br /><br />

<strong>⚠️ Importante:</strong><br />
• El tema seleccionado se guarda en tu perfil de usuario<br />
• Se aplicará automáticamente en futuras sesiones<br />
• Todos los componentes de la aplicación respetan el tema seleccionado<br />
• Puedes cambiar el tema en cualquier momento`;
          sources.push("/settings");
          break;

        case "manage_users":
          if (!userPermissions.includes("admin.users")) {
            return this.generatePermissionDeniedResponse(
              "gestionar usuarios",
              "admin.users",
              userRole,
              ["ADMIN"]
            );
          }
          response = `Gestión de Usuarios (Solo Administradores):<br /><br />
1. <strong>Crear usuarios</strong>: Actualmente los usuarios se crean desde el panel de Supabase Authentication. Una vez creados, deben iniciar sesión en la aplicación para que se genere su perfil automáticamente.<br /><br />
2. <strong>Roles y Permisos</strong>:<br />
   - Al iniciar sesión por primera vez, el usuario puede tener un rol por defecto (VIEWER).<br />
   - Un administrador puede cambiar el rol de un usuario editando la tabla user_profiles o mediante futuras funcionalidades de administración en la app.<br /><br />
3. <strong>Perfiles</strong>: Puedes ver la información de los usuarios en la sección de configuración o auditoría (si está disponible).`;
          sources.push("/admin", "/settings");
          break;

        default:
          // Si no coincide con ninguna acción específica, continuar con el flujo normal
          break;
      }

      if (response) {
        return {
          content: response,
          sources,
          requiresPermission
        };
      }
    }

    // Detectar qué acción quiere hacer
    if (lowerQuestion.includes("producto")) {
      if (lowerQuestion.includes("crear") || lowerQuestion.includes("añadir") || lowerQuestion.includes("nuevo")) {
        requiresPermission = "products.create";
        if (!userPermissions.includes(requiresPermission)) {
          return this.generatePermissionDeniedResponse(
            "crear productos",
            requiresPermission,
            userRole,
            ["WAREHOUSE", "ADMIN"]
          );
        }

        response = `Para crear un producto en la aplicación, sigue estos pasos:

1. <strong>Navega a la página de productos</strong>: Haz clic en "Productos" en el menú lateral o ve a la ruta /products.

2. <strong>Haz clic en el botón "Nuevo Producto"</strong>: Encontrarás este botón en la parte superior de la tabla de productos, junto a los botones de exportar.

3. <strong>Completa el formulario</strong>: El formulario tiene varias secciones:
   - <strong>Información Básica</strong>: Código*, Nombre*, Descripción, Categoría, Código de Barras
   - <strong>Stock</strong>: Stock Actual, Stock Mínimo*, Stock Máximo
   - <strong>Ubicación</strong>: Pasillo*, Estante*, Ubicación Extra
   - <strong>Precios</strong>: Precio de Coste*, Precio de Venta
   - <strong>Información Adicional</strong>: Código de Proveedor, Unidad de Medida, URL de Compra, URL de Imagen, Peso, Dimensiones, Notas
   - <strong>Opciones</strong>: Producto activo, Control por lotes

4. <strong>Los campos marcados con * son obligatorios</strong>.

5. <strong>Haz clic en "Crear Producto"</strong> para guardar.

Una vez creado, serás redirigido a la lista de productos.`;

        sources.push("/products/new");
      } else if (lowerQuestion.includes("editar") || lowerQuestion.includes("modificar")) {
        requiresPermission = "products.edit";
        if (!userPermissions.includes(requiresPermission)) {
          return this.generatePermissionDeniedResponse(
            "editar productos",
            requiresPermission,
            userRole,
            ["WAREHOUSE", "ADMIN"]
          );
        }

        response = `Para editar un producto existente:

1. <strong>Ve a la lista de productos</strong>: Navega a /products desde el menú lateral.

2. <strong>Busca el producto</strong> que quieres editar usando el campo de búsqueda o navegando por la tabla.

3. <strong>Haz clic en el botón de editar</strong> en la fila del producto (icono de lápiz) o haz clic directamente en el producto para ver sus detalles.

4. <strong>Desde la página de detalle</strong>: Haz clic en el botón "Editar" que aparece en la parte superior.

5. <strong>Modifica los campos</strong> que necesites cambiar en el formulario.

6. <strong>Guarda los cambios</strong> haciendo clic en "Actualizar".

<strong>Nota</strong>: Solo puedes editar productos si tienes el permiso "products.edit".`;

        sources.push("/products", "/products/:id/edit");
      } else if (lowerQuestion.includes("exportar") || lowerQuestion.includes("excel") || lowerQuestion.includes("csv")) {
        response = `Para exportar productos:

1. <strong>Ve a la página de Productos</strong>.
2. <strong>Haz clic en el botón "Exportar"</strong> (arriba a la derecha, icono de descarga).
3. <strong>Selecciona el formato</strong>: Excel (.xlsx) o CSV.
4. <strong>Elige las columnas</strong> que quieres incluir en el archivo. Por defecto están seleccionadas las más importantes.
5. <strong>Opcional</strong>: Marca "Incluir filtros activos" si solo quieres exportar lo que estás viendo filtrado en pantalla.
6. <strong>Haz clic en "Exportar"</strong> en el cuadro de diálogo.

El archivo se descargará automáticamente.`;
        sources.push("/products");
      } else if (lowerQuestion.includes("filtrar") || lowerQuestion.includes("buscar") || lowerQuestion.includes("filtro")) {
        response = `Puedes buscar y filtrar productos de varias formas:

1. <strong>Búsqueda rápida</strong>: Usa la barra de búsqueda superior para buscar por nombre, código o código de barras.

2. <strong>Filtros rápidos</strong>:
   - <strong>Solo alarma</strong>: Muestra productos con stock bajo (menor o igual al mínimo).
   - <strong>Incluir inactivos</strong>: Muestra productos desactivados.

3. <strong>Filtros avanzados</strong> (icono de embudo):
   - <strong>Categoría</strong>: Filtra por categoría específica.
   - <strong>Control por lotes</strong>: Muestra solo productos que usan lotes.
   - <strong>Rango de Stock</strong>: Filtra por cantidad mínima y máxima.
   - <strong>Rango de Precios</strong>: Filtra por coste.
   - <strong>Código de Proveedor</strong>: Busca por referencia de proveedor.

Los filtros se combinan entre sí. Para limpiar todos los filtros, usa el botón "Limpiar filtros" dentro del menú avanzado o cierra las etiquetas de filtro activas.`;
        sources.push("/products");
      } else {
        response = `¿Qué te gustaría hacer con productos? Puedo ayudarte a:
- Crear un nuevo producto
- Editar un producto existente
- Ver detalles de un producto
- Buscar y filtrar productos
- Exportar a Excel/CSV

¿Cuál de estas acciones necesitas?`;
      }
    } else if (lowerQuestion.includes("escanear") || lowerQuestion.includes("escáner") || lowerQuestion.includes("escanner")) {
      requiresPermission = "scanner.use";
      if (!userPermissions.includes(requiresPermission)) {
        return this.generatePermissionDeniedResponse(
          "usar el escáner",
          requiresPermission,
          userRole,
          ["WAREHOUSE", "ADMIN"]
        );
      }

      response = `Para usar el escáner en la aplicación:

1. <strong>Navega al módulo de Escáner</strong>: Haz clic en "Escáner" en el menú lateral o ve a /scanner.

2. <strong>Elige el modo de escaneo</strong>:
   - <strong>Escáner USB</strong>: El campo de escaneo estará activo automáticamente. Simplemente escanea el código y se detectará automáticamente.
   - <strong>Cámara</strong>: Haz clic en el botón "Activar cámara" para usar la cámara del dispositivo.

3. <strong>Después de escanear</strong>:
   - Si es un código de producto, verás la ficha del producto con opciones para ver detalles, registrar entrada o salida.
   - Si es un código de lote, verás la información del lote y el producto asociado.

4. <strong>Acciones disponibles</strong>:
   - Ver detalle del producto/lote
   - Registrar un movimiento (entrada o salida)
   - Si encuentras un defecto, puedes reportarlo directamente.

<strong>Tip</strong>: El escáner USB se comporta como un teclado, escribe el código y envía Enter automáticamente.`;

      sources.push("/scanner");
    } else if (lowerQuestion.includes("movimiento") || lowerQuestion.includes("entrada") || lowerQuestion.includes("salida")) {
      requiresPermission = "movements.create_in";
      if (!userPermissions.includes(requiresPermission) && !userPermissions.includes("movements.create_out")) {
        return this.generatePermissionDeniedResponse(
          "registrar movimientos",
          "movements.create_in",
          userRole,
          ["WAREHOUSE", "ADMIN"]
        );
      }

      response = `Para registrar un movimiento de inventario:

1. <strong>Opción 1 - Desde el escáner</strong>:
   - Escanea el código del producto o lote
   - Selecciona la acción "Registrar entrada" o "Registrar salida"
   - Completa el formulario con la cantidad y el motivo

2. <strong>Opción 2 - Desde la página de movimientos</strong>:
   - Navega a /movements desde el menú
   - Haz clic en "Nuevo Movimiento"
   - Selecciona el producto y, si aplica, el lote
   - Elige el tipo: Entrada, Salida, Ajuste o Transferencia
   - Completa la cantidad y el motivo (requerido)

3. <strong>Campos importantes</strong>:
   - <strong>Motivo</strong> (requerido): Explica por qué se realiza el movimiento
   - <strong>Cantidad</strong>: Número de unidades
   - <strong>Lote</strong>: Si el producto tiene control por lotes, selecciona el lote

<strong>Nota</strong>: El stock se actualiza automáticamente después de registrar el movimiento.`;

      sources.push("/movements", "/scanner");
    } else if (lowerQuestion.includes("usuario") || lowerQuestion.includes("cuenta") || lowerQuestion.includes("perfil")) {
      if (!userPermissions.includes("admin.users")) {
        response = `La gestión de usuarios está reservada para administradores.

Como usuario normal, puedes ver tu perfil haciendo clic en tu avatar o nombre en la esquina superior derecha.

Para cerrar sesión, abre el menú de usuario y selecciona "Cerrar Sesión".`;
      } else {
        response = `Gestión de Usuarios (Solo Administradores):

1. <strong>Crear usuarios</strong>: Actualmente los usuarios se crean desde el panel de Supabase Authentication. Una vez creados, deben iniciar sesión en la aplicación para que se genere su perfil automáticamente.

2. <strong>Roles y Permisos</strong>:
   - Al iniciar sesión por primera vez, el usuario puede tener un rol por defecto (VIEWER).
   - Un administrador puede cambiar el rol de un usuario editando la tabla user_profiles o mediante futuras funcionalidades de administración en la app.

3. <strong>Perfiles</strong>: Puedes ver la información de los usuarios en la sección de configuración o auditoría (si está disponible).`;
      }
      sources.push("/settings");
    } else if (lowerQuestion.includes("dashboard") || lowerQuestion.includes("inicio") || lowerQuestion.includes("resumen")) {
      response = `El Dashboard (Inicio) te ofrece una visión general del estado del inventario:

- <strong>KPIs</strong>: Tarjetas superiores con métricas clave (Stock Total, Valor, Productos Críticos, Movimientos hoy).
- <strong>Alertas</strong>: Lista de productos con stock bajo o lotes caducados/por caducar.
- <strong>Movimientos recientes</strong>: Gráfico de entradas, salidas y ajustes de los últimos 7 días.
- <strong>Actividad reciente</strong>: Historial de las últimas acciones realizadas en el sistema.
- <strong>Sugerencias IA</strong>: Recomendaciones inteligentes para optimizar el inventario (reabastecimiento, movimiento de lotes).

Usa el dashboard para detectar problemas rápidamente al iniciar tu jornada.`;
      sources.push("/");
    } else {
      response = `Puedo ayudarte con varias tareas en la aplicación. Actúo como un manual interactivo:

<strong>Gestión de Productos</strong>:
- Crear, editar, buscar y filtrar productos
- Exportar a Excel/CSV

<strong>Operaciones</strong>:
- Registrar movimientos (Entradas/Salidas/Ajustes)
- Usar el Escáner (USB o Cámara)
- Gestionar lotes y caducidades

<strong>Sistema</strong>:
- Explicar permisos y roles
- Entender el Dashboard y Alertas

¿Sobre qué funcionalidad específica te gustaría saber más?`;
    }

    return {
      content: response,
      sources,
      requiresPermission
    };
  }

  /**
   * Genera respuesta para consultas de datos
   * Esta respuesta indica que se debe usar el servicio MCP para obtener datos reales
   */
  private generateDataQueryResponse(
    question: string,
    intent: QuestionIntent
  ): AiResponse {
    // Las consultas de datos requieren llamar a los repositorios/MCP tools
    // Esta respuesta será procesada por el AiChatService que llamará a los repositorios
    return {
      content: "PROCESS_DATA_QUERY", // Marcador especial para que el servicio sepa que debe consultar datos
      suggestedActions: []
    };
  }

  /**
   * Genera respuesta para preguntas sobre permisos
   */
  private generatePermissionsResponse(
    question: string,
    intent: QuestionIntent,
    structure: ProjectStructure,
    userPermissions: string[],
    userRole?: string
  ): AiResponse {
    const lowerQuestion = question.toLowerCase();
    let response = "";

    if (lowerQuestion.includes("puedo") || lowerQuestion.includes("permiso")) {
      // Buscar qué permiso está preguntando
      const permissionInfo = this.codeAnalyzer.getPermissionInfo(
        this.extractPermissionFromQuestion(lowerQuestion)
      );

      if (permissionInfo) {
        const hasPermission = userPermissions.includes(permissionInfo.key);
        if (hasPermission) {
          response = `Sí, tienes permiso para "${permissionInfo.description}" (${permissionInfo.key}).`;
        } else {
          response = `No, no tienes permiso para "${permissionInfo.description}".\n\nEste permiso está disponible para los roles: ${permissionInfo.roles.join(", ")}.`;
          if (userRole) {
            response += `\n\nTu rol actual es: ${userRole}.`;
          }
          response += `\n\nContacta a un administrador si necesitas este permiso.`;
        }
      } else {
        response = `Para saber qué permisos tienes, puedo ayudarte. ¿Qué acción específica quieres realizar? Por ejemplo: "¿Puedo crear productos?" o "¿Puedo usar el escáner?"`;
      }
    } else {
      response = `Tu rol actual es: ${userRole || "No identificado"}.\n\n`;
      response += `Tienes los siguientes permisos:\n`;
      response += userPermissions.map((p) => `- ${p}`).join("\n");
    }

    return {
      content: response,
      requiresPermission: this.extractPermissionFromQuestion(lowerQuestion)
    };
  }

  /**
   * Genera respuesta sobre funcionalidades
   */
  private generateFeaturesResponse(
    question: string,
    intent: QuestionIntent,
    structure: ProjectStructure
  ): AiResponse {
    const routes = structure.routes;
    let response = `La aplicación incluye las siguientes funcionalidades principales:\n\n`;

    response += `<strong>Páginas disponibles:</strong><br />`;
    routes.forEach((route) => {
      if (route.label && route.path !== "/") {
        response += `- <strong>${route.label}</strong> (${route.path})`;
        if (route.description) {
          response += `: ${route.description}`;
        }
        response += `<br />`;
      }
    });

    response += `<br /><strong>Servicios disponibles:</strong><br />`;
    structure.services.forEach((service) => {
      response += `- <strong>${service.name}</strong>: ${service.description || ""}<br />`;
    });

    return {
      content: response,
      sources: routes.map((r) => r.path)
    };
  }

  /**
   * Genera respuesta general
   */
  private generateGeneralResponse(question: string): AiResponse {
    const lowerQuestion = question.toLowerCase().trim();
    
    // Detectar si es un comando de menú
    if (lowerQuestion.startsWith("menu:")) {
      const menuId = lowerQuestion.replace("menu:", "");
      return generateMenuResponse(menuId);
    }
    
    // Detectar saludos - mostrar menú principal
    if (
      lowerQuestion === "hola" ||
      lowerQuestion === "hola!" ||
      lowerQuestion === "hola." ||
      lowerQuestion === "hi" ||
      lowerQuestion === "hello" ||
      lowerQuestion === "buenos días" ||
      lowerQuestion === "buenos dias" ||
      lowerQuestion === "buenas tardes" ||
      lowerQuestion === "buenas noches" ||
      lowerQuestion === "bon dia" ||
      lowerQuestion === "bona tarda" ||
      lowerQuestion === "bona nit" ||
      lowerQuestion === "" ||
      lowerQuestion.length === 0
    ) {
      const menuResponse = generateMenuResponse();
      return {
        ...menuResponse,
        menuOptions: CHAT_MENU_STRUCTURE.map((opt) => ({
          id: opt.id,
          label: opt.label,
          emoji: opt.emoji,
          hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0
        }))
      };
    }
    
    // Respuesta general para otras preguntas - mostrar menú principal
    const menuResponse = generateMenuResponse();
    return {
      ...menuResponse,
      menuOptions: CHAT_MENU_STRUCTURE.map((opt) => ({
        id: opt.id,
        label: opt.label,
        emoji: opt.emoji,
        hasSubOptions: !!opt.subOptions && opt.subOptions.length > 0
      }))
    };
  }

  /**
   * Genera respuesta cuando no se tienen permisos
   */
  private generatePermissionDeniedResponse(
    action: string,
    requiredPermission: string,
    userRole?: string,
    allowedRoles?: string[]
  ): AiResponse {
    const roleInfo = this.codeAnalyzer.getPermissionInfo(requiredPermission);
    let response = `No puedes ${action} porque no tienes el permiso necesario.<br /><br />`;
    response += `<strong>Permiso requerido</strong>: ${requiredPermission}<br />`;
    if (roleInfo) {
      response += `<strong>Descripción</strong>: ${roleInfo.description}<br />`;
    }
    if (userRole) {
      response += `<strong>Tu rol actual</strong>: ${userRole}<br />`;
    }
    if (allowedRoles && allowedRoles.length > 0) {
      response += `<strong>Roles permitidos</strong>: ${allowedRoles.join(", ")}<br />`;
    }
    response += `<br />Contacta a un administrador si necesitas acceso a esta funcionalidad.`;

    return {
      content: response,
      requiresPermission: requiredPermission,
      suggestedActions: [
        {
          label: "Contactar administrador",
          permission: "admin.users"
        }
      ]
    };
  }

  /**
   * Extrae el permiso de una pregunta
   */
  private extractPermissionFromQuestion(question: string): string {
    // Mapeo simple de palabras clave a permisos
    const mapping: Record<string, string> = {
      producto: "products.view",
      crear: "products.create",
      editar: "products.edit",
      modificar: "products.edit",
      eliminar: "products.delete",
      escanear: "scanner.use",
      escáner: "scanner.use",
      movimiento: "movements.view",
      reporte: "reports.view",
      exportar: "reports.export_excel",
      lote: "batches.view"
    };

    for (const [keyword, permission] of Object.entries(mapping)) {
      if (question.includes(keyword)) {
        return permission;
      }
    }

    return "";
  }
}

