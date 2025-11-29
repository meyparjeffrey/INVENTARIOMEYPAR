import type {
  AiResponse,
  ProjectStructure,
  QuestionIntent,
  QuestionCategory
} from "./types";
import { CodeAnalyzer } from "./CodeAnalyzer";

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
      "pasos", "passos", "explicar", "explicar-me", "ayuda con", "ajuda amb"
    ];

    const dataQueryKeywords = [
      "qué", "que", "què", "cuántos", "cuantos", "quants", "cuántas", "cuantas", "quantes",
      "listar", "llistar", "mostrar", "dame", "dona'm", "dime", "digues-me",
      "buscar", "cercar", "encontrar", "trobar",
      "productos en alarma", "productes en alarma", "stock", "estoc",
      "lotes", "lots", "movimientos", "moviments"
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
      imprimir: "print"
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
      const structure = await this.codeAnalyzer.analyzeProject();

    switch (intent.category) {
      case "how_to":
        return this.generateHowToResponse(question, intent, structure, userPermissions, userRole);

      case "data_query":
        return this.generateDataQueryResponse(question, intent);

      case "permissions":
        return this.generatePermissionsResponse(question, intent, structure, userPermissions, userRole);

      case "features":
        return this.generateFeaturesResponse(question, intent, structure);

      default:
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

1. **Navega a la página de productos**: Haz clic en "Productos" en el menú lateral o ve a la ruta `/products`.

2. **Haz clic en el botón "Nuevo Producto"**: Encontrarás este botón en la parte superior de la tabla de productos, junto a los botones de exportar.

3. **Completa el formulario**: El formulario tiene varias secciones:
   - **Información Básica**: Código*, Nombre*, Descripción, Categoría, Código de Barras
   - **Stock**: Stock Actual, Stock Mínimo*, Stock Máximo
   - **Ubicación**: Pasillo*, Estante*, Ubicación Extra
   - **Precios**: Precio de Coste*, Precio de Venta
   - **Información Adicional**: Código de Proveedor, Unidad de Medida, URL de Compra, URL de Imagen, Peso, Dimensiones, Notas
   - **Opciones**: Producto activo, Control por lotes

4. **Los campos marcados con * son obligatorios**.

5. **Haz clic en "Crear Producto"** para guardar.

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

1. **Ve a la lista de productos**: Navega a `/products` desde el menú lateral.

2. **Busca el producto** que quieres editar usando el campo de búsqueda o navegando por la tabla.

3. **Haz clic en el botón de editar** en la fila del producto (icono de lápiz) o haz clic directamente en el producto para ver sus detalles.

4. **Desde la página de detalle**: Haz clic en el botón "Editar" que aparece en la parte superior.

5. **Modifica los campos** que necesites cambiar en el formulario.

6. **Guarda los cambios** haciendo clic en "Actualizar".

**Nota**: Solo puedes editar productos si tienes el permiso "products.edit".`;

        sources.push("/products", "/products/:id/edit");
      } else {
        response = `¿Qué te gustaría hacer con productos? Puedo ayudarte a:
- Crear un nuevo producto
- Editar un producto existente
- Ver detalles de un producto
- Buscar productos

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

1. **Navega al módulo de Escáner**: Haz clic en "Escáner" en el menú lateral o ve a `/scanner`.

2. **Elige el modo de escaneo**:
   - **Escáner USB**: El campo de escaneo estará activo automáticamente. Simplemente escanea el código y se detectará automáticamente.
   - **Cámara**: Haz clic en el botón "Activar cámara" para usar la cámara del dispositivo.

3. **Después de escanear**:
   - Si es un código de producto, verás la ficha del producto con opciones para ver detalles, registrar entrada o salida.
   - Si es un código de lote, verás la información del lote y el producto asociado.

4. **Acciones disponibles**:
   - Ver detalle del producto/lote
   - Registrar un movimiento (entrada o salida)
   - Si encuentras un defecto, puedes reportarlo directamente.

**Tip**: El escáner USB se comporta como un teclado, escribe el código y envía Enter automáticamente.`;

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

1. **Opción 1 - Desde el escáner**:
   - Escanea el código del producto o lote
   - Selecciona la acción "Registrar entrada" o "Registrar salida"
   - Completa el formulario con la cantidad y el motivo

2. **Opción 2 - Desde la página de movimientos**:
   - Navega a `/movements` desde el menú
   - Haz clic en "Nuevo Movimiento"
   - Selecciona el producto y, si aplica, el lote
   - Elige el tipo: Entrada, Salida, Ajuste o Transferencia
   - Completa la cantidad y el motivo (requerido)

3. **Campos importantes**:
   - **Motivo** (requerido): Explica por qué se realiza el movimiento
   - **Cantidad**: Número de unidades
   - **Lote**: Si el producto tiene control por lotes, selecciona el lote

**Nota**: El stock se actualiza automáticamente después de registrar el movimiento.`;

      sources.push("/movements", "/scanner");
    } else {
      response = `Puedo ayudarte con varias tareas en la aplicación:

**Gestión de Productos**:
- Crear, editar y ver productos
- Buscar productos por código o nombre

**Escáner**:
- Usar escáner USB o cámara
- Escanear códigos de barras y QR

**Movimientos**:
- Registrar entradas y salidas
- Ver historial de movimientos

**Reportes**:
- Exportar datos a Excel
- Ver alarmas de stock

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

    response += `**Páginas disponibles:**\n`;
    routes.forEach((route) => {
      if (route.label && route.path !== "/") {
        response += `- **${route.label}** (${route.path})`;
        if (route.description) {
          response += `: ${route.description}`;
        }
        response += `\n`;
      }
    });

    response += `\n**Servicios disponibles:**\n`;
    structure.services.forEach((service) => {
      response += `- **${service.name}**: ${service.description || ""}\n`;
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
    return {
      content: `Hola, soy tu asistente de IA. Puedo ayudarte con:\n\n- **Cómo usar la aplicación**: Explicarte paso a paso cómo realizar acciones\n- **Consultar datos**: Buscar información sobre productos, lotes, movimientos\n- **Permisos**: Explicarte qué puedes hacer según tu rol\n- **Funcionalidades**: Mostrarte qué características están disponibles\n\n¿En qué puedo ayudarte específicamente?`,
      suggestedActions: [
        {
          label: "¿Cómo creo un producto?",
          path: "/products/new"
        },
        {
          label: "¿Cómo uso el escáner?",
          path: "/scanner"
        }
      ]
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
    let response = `No puedes ${action} porque no tienes el permiso necesario.\n\n`;
    response += `**Permiso requerido**: ${requiredPermission}\n`;
    if (roleInfo) {
      response += `**Descripción**: ${roleInfo.description}\n`;
    }
    if (userRole) {
      response += `**Tu rol actual**: ${userRole}\n`;
    }
    if (allowedRoles && allowedRoles.length > 0) {
      response += `**Roles permitidos**: ${allowedRoles.join(", ")}\n`;
    }
    response += `\nContacta a un administrador si necesitas acceso a esta funcionalidad.`;

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

