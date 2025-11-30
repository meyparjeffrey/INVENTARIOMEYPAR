import type {
  AiResponse,
  ProjectStructure,
  QuestionIntent,
  QuestionCategory
} from "./types";
import { CodeAnalyzer } from "./CodeAnalyzer";
import { getAiResponse } from "./responseTranslations";
import { nlg } from "./NaturalLanguageGenerator";

type LanguageCode = "es-ES" | "ca-ES";

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
  async classifyQuestion(question: string, language: LanguageCode = "es-ES"): Promise<QuestionIntent> {
    try {
      if (!question || typeof question !== "string" || !question.trim()) {
        return {
          category: "general",
          keywords: [],
          confidence: 0
        };
      }
      
      const lowerQuestion = question.toLowerCase();

    // Obtener palabras clave desde las traducciones
    const howToKeywordsStr = getAiResponse(language, "keywords.howTo");
    const dataQueryKeywordsStr = getAiResponse(language, "keywords.dataQuery");
    const permissionsKeywordsStr = getAiResponse(language, "keywords.permissions");
    const featuresKeywordsStr = getAiResponse(language, "keywords.features");

    // Separar por comas
    const howToKeywords = howToKeywordsStr.split(", ").map(k => k.trim()).filter(Boolean);
    const dataQueryKeywords = dataQueryKeywordsStr.split(", ").map(k => k.trim()).filter(Boolean);
    const permissionsKeywords = permissionsKeywordsStr.split(", ").map(k => k.trim()).filter(Boolean);
    const featuresKeywords = featuresKeywordsStr.split(", ").map(k => k.trim()).filter(Boolean);

    // Detectar acciones directas PRIMERO (tienen alta prioridad)
    const directActions = [
      "crear", "editar", "modificar", "eliminar", "esborrar",
      "añadir", "afegir", "registrar", "escanear", "escanejar", "escanejar"
    ];
    const hasDirectAction = directActions.some(action => lowerQuestion.includes(action));
    
    // Detectar objetos comunes
    const hasProduct = lowerQuestion.includes("producto") || lowerQuestion.includes("producte") || 
                      lowerQuestion.includes("productos") || lowerQuestion.includes("productes");
    const hasMovement = lowerQuestion.includes("movimiento") || lowerQuestion.includes("moviment");
    const hasScanner = lowerQuestion.includes("escáner") || lowerQuestion.includes("escàner") || 
                      lowerQuestion.includes("escanner");
    
    // Si hay acción directa + objeto, es definitivamente "how_to" con alta confianza
    if (hasDirectAction && (hasProduct || hasMovement || hasScanner)) {
      return {
        category: "how_to",
        keywords: question.split(/\s+/),
        confidence: 0.95,
        action: this.extractAction(question)
      };
    }
    
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

    // Dar bonus a "how_to" si hay acción directa
    const boostedHowToScore = howToScore + (hasDirectAction ? 2 : 0);

    // Determinar categoría principal
    const scores = [
      { category: "how_to" as QuestionCategory, score: boostedHowToScore },
      { category: "data_query" as QuestionCategory, score: dataQueryScore },
      { category: "permissions" as QuestionCategory, score: permissionsScore },
      { category: "features" as QuestionCategory, score: featuresScore }
    ];

    scores.sort((a, b) => b.score - a.score);
    const maxScore = scores[0].score;

    // Si hay acción directa pero no se clasificó como "how_to", forzar clasificación
    if (hasDirectAction && scores[0].category !== "how_to" && maxScore < 2) {
      return {
        category: "how_to",
        keywords: question.split(/\s+/),
        confidence: 0.8,
        action: this.extractAction(question)
      };
    }
    
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
    userRole?: string,
    language: LanguageCode = "es-ES"
  ): Promise<AiResponse> {
    try {
      const structure = await this.codeAnalyzer.analyzeProject();

    switch (intent.category) {
      case "how_to":
        return this.generateHowToResponse(question, intent, structure, userPermissions, userRole, language);

      case "data_query":
        return this.generateDataQueryResponse(question, intent);

      case "permissions":
        return this.generatePermissionsResponse(question, intent, structure, userPermissions, userRole, language);

      case "features":
        return this.generateFeaturesResponse(question, intent, structure, language);

      default:
        // Antes de devolver respuesta general, verificar si hay acción directa que debería procesarse como "how_to"
        const lowerQuestion = question.toLowerCase();
        const hasDirectAction = lowerQuestion.includes("editar") || lowerQuestion.includes("crear") || 
                               lowerQuestion.includes("modificar") || lowerQuestion.includes("eliminar") ||
                               lowerQuestion.includes("escanear") || lowerQuestion.includes("escanejar");
        if (hasDirectAction) {
          // Si hay acción directa, tratar como "how_to" aunque no se clasificó así
          return this.generateHowToResponse(question, { category: "how_to", keywords: [], confidence: 0.7 }, structure, userPermissions || [], userRole, language);
        }
        return this.generateGeneralResponse(question, language);
    }
    } catch (error) {
      console.error("Error en generateResponse:", error);
      return {
        content: getAiResponse(language, "error.generic")
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
    userRole?: string,
    language: LanguageCode = "es-ES"
  ): AiResponse {
    const lowerQuestion = question.toLowerCase();
    let response = "";
    const sources: string[] = [];
    let requiresPermission: string | undefined;

    // Detectar acciones directas primero (más específico)
    // Mejora: Detectar formas conjugadas y variantes de verbos con expresiones regulares
    const editPattern = /edit(a|ar|es|en|em|ant|ant)|modifiqu(e|es|en|em|ant|ant)|canvi(ar|a|es|en|em)/;
    const hasEditAction = editPattern.test(lowerQuestion) || lowerQuestion.includes("editar") || 
                         lowerQuestion.includes("modificar") || lowerQuestion.includes("canviar");
    
    // Detectar crear en todas sus formas: crear, creo, crea, creamos, crean, creem, etc.
    const createPattern = /cre(a|ar|o|es|en|em|ant|ant|ant)|afeg(eix|ir|eixo|eixes|eixen|eixem)/;
    const hasCreateAction = createPattern.test(lowerQuestion) || lowerQuestion.includes("crear") || 
                           lowerQuestion.includes("creo") || lowerQuestion.includes("crea") ||
                           lowerQuestion.includes("creem") || lowerQuestion.includes("añadir") || 
                           lowerQuestion.includes("afegir") || lowerQuestion.includes("nuevo") || 
                           lowerQuestion.includes("nou");
    
    const isProductQuestion = lowerQuestion.includes("producto") || lowerQuestion.includes("producte") ||
                             lowerQuestion.includes("productes") || lowerQuestion.includes("productos");
    
    // Detección mejorada: Si menciona "editar" y "existente" o "producto", es editar producto
    const isEditing = hasEditAction && (
      isProductQuestion || 
      lowerQuestion.includes("existente") || 
      lowerQuestion.includes("existent") ||
      lowerQuestion.includes("producto existente") || 
      lowerQuestion.includes("producte existent")
    );
    
    // Mejora: Detectar "crear producto" - PRIORIDAD ALTA si tiene crear/creo + producte/producto
    // IMPORTANTE: "creo" es la primera persona del singular del verbo "crear" en catalán/español
    const isCreating = hasCreateAction && isProductQuestion;
    
    // Detectar qué acción quiere hacer (ES y CA) - Mejorado para detectar acciones directas
    // Priorizar crear si está presente, luego editar
    if (isCreating || isEditing || (isProductQuestion && (hasCreateAction || hasEditAction))) {
      // Crear producto - PRIORIDAD MÁXIMA si detecta crear/creo + producto/producte
      if (isCreating) {
        requiresPermission = "products.create";
        if (!userPermissions.includes(requiresPermission)) {
          return this.generatePermissionDeniedResponse(
            language === "ca-ES" ? "crear productes" : "crear productos",
            requiresPermission,
            userRole,
            ["WAREHOUSE", "ADMIN"],
            language
          );
        }

        const baseResponse = getAiResponse(language, "howTo.createProduct");
        // Aplicar técnicas de NLG para hacer la respuesta más humana
        response = nlg.generateResponse(baseResponse, language, {
          variation: "friendly",
          addPersonalTouch: true,
          includeTransitions: true
        });
        sources.push("/products/new");
      } 
      // Editar producto - Prioridad alta si detecta editar + producto
      else if (isEditing || (hasEditAction && isProductQuestion) || (isProductQuestion && (lowerQuestion.includes("cambiar") || lowerQuestion.includes("canviar")))) {
        requiresPermission = "products.edit";
        if (!userPermissions.includes(requiresPermission)) {
          return this.generatePermissionDeniedResponse(
            language === "ca-ES" ? "editar productes" : "editar productos",
            requiresPermission,
            userRole,
            ["WAREHOUSE", "ADMIN"],
            language
          );
        }

        const baseResponse = getAiResponse(language, "howTo.editProduct");
        // Aplicar técnicas de NLG para hacer la respuesta más humana
        response = nlg.generateResponse(baseResponse, language, {
          variation: "friendly",
          addPersonalTouch: true,
          includeTransitions: true
        });
        sources.push("/products", "/products/:id/edit");
      } 
      // Pregunta genérica sobre productos
      else {
        // Si solo menciona productos sin acción específica, dar opciones
        response = language === "ca-ES" 
          ? "Què vols fer amb productes? Puc ajudar-te a:\n- Crear un nou producte\n- Editar un producte existent\n- Veure detalls d'un producte\n- Buscar productes\n\nQuina d'aquestes accions necessites?"
          : "¿Qué te gustaría hacer con productos? Puedo ayudarte a:\n- Crear un nuevo producto\n- Editar un producto existente\n- Ver detalles de un producto\n- Buscar productos\n\n¿Cuál de estas acciones necesitas?";
      }
    } else if (lowerQuestion.includes("escanear") || lowerQuestion.includes("escáner") || lowerQuestion.includes("escanner") || lowerQuestion.includes("escanejar") || lowerQuestion.includes("escàner")) {
      requiresPermission = "scanner.use";
      if (!userPermissions.includes(requiresPermission)) {
        return this.generatePermissionDeniedResponse(
          language === "ca-ES" ? "utilitzar l'escàner" : "usar el escáner",
          requiresPermission,
          userRole,
          ["WAREHOUSE", "ADMIN"],
          language
        );
      }

      const baseResponse = getAiResponse(language, "howTo.useScanner");
      // Aplicar técnicas de NLG para hacer la respuesta más humana
      response = nlg.generateResponse(baseResponse, language, {
        variation: "detailed",
        addPersonalTouch: true,
        includeTransitions: true
      });
      sources.push("/scanner");
    } else if (lowerQuestion.includes("movimiento") || lowerQuestion.includes("moviment") || lowerQuestion.includes("entrada") || lowerQuestion.includes("entrada") || lowerQuestion.includes("salida") || lowerQuestion.includes("sortida")) {
      requiresPermission = "movements.create_in";
      if (!userPermissions.includes(requiresPermission) && !userPermissions.includes("movements.create_out")) {
        return this.generatePermissionDeniedResponse(
          language === "ca-ES" ? "registrar moviments" : "registrar movimientos",
          "movements.create_in",
          userRole,
          ["WAREHOUSE", "ADMIN"],
          language
        );
      }

      const baseResponse = getAiResponse(language, "howTo.createMovement");
      // Aplicar técnicas de NLG para hacer la respuesta más humana
      response = nlg.generateResponse(baseResponse, language, {
        variation: "detailed",
        addPersonalTouch: true,
        includeTransitions: true
      });
      sources.push("/movements", "/scanner");
    } else {
      response = getAiResponse(language, "howTo.general");
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
    userRole?: string,
    language: LanguageCode = "es-ES"
  ): AiResponse {
    const lowerQuestion = question.toLowerCase();
    let response = "";

    if (lowerQuestion.includes("puedo") || lowerQuestion.includes("puc") || lowerQuestion.includes("permiso") || lowerQuestion.includes("permís")) {
      // Buscar qué permiso está preguntando
      const permissionInfo = this.codeAnalyzer.getPermissionInfo(
        this.extractPermissionFromQuestion(lowerQuestion)
      );

      if (permissionInfo) {
        const hasPermission = userPermissions.includes(permissionInfo.key);
        if (hasPermission) {
          response = getAiResponse(language, "permissions.hasPermission", {
            desc: permissionInfo.description,
            key: permissionInfo.key
          });
        } else {
          response = getAiResponse(language, "permissions.noPermission", {
            desc: permissionInfo.description,
            roles: permissionInfo.roles.join(", ")
          });
          if (userRole) {
            response += getAiResponse(language, "permissions.currentRole", { role: userRole });
          }
          response += getAiResponse(language, "permissions.contactAdmin");
        }
      } else {
        response = getAiResponse(language, "permissions.askSpecific");
      }
    } else {
      response = getAiResponse(language, "permissions.list", {
        role: userRole || "No identificado",
        permissions: userPermissions.map((p) => `- ${p}`).join("\n")
      });
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
    structure: ProjectStructure,
    language: LanguageCode = "es-ES"
  ): AiResponse {
    const lowerQuestion = question.toLowerCase();
    const routes = structure.routes;
    let response = "";
    
    // Si pregunta sobre base de datos o tablas, dar información específica
    if (lowerQuestion.includes("base de datos") || lowerQuestion.includes("base de dades") || 
        lowerQuestion.includes("tabla") || lowerQuestion.includes("taula") ||
        lowerQuestion.includes("tablas") || lowerQuestion.includes("taules")) {
      
      const tables = structure.databaseTables || [];
      if (tables.length > 0) {
        response = language === "ca-ES"
          ? `La base de dades de Supabase inclou les següents taules principals:\n\n`
          : `La base de datos de Supabase incluye las siguientes tablas principales:\n\n`;
        
        tables.forEach((table) => {
          response += `**${table.name}**: ${table.description}\n`;
          if (table.keyFields && table.keyFields.length > 0) {
            response += `  - Camps principals: ${table.keyFields.slice(0, 5).join(", ")}${table.keyFields.length > 5 ? "..." : ""}\n`;
          }
          if (table.relationships && table.relationships.length > 0) {
            response += `  - Relacions: ${table.relationships.map(r => `${r.table} (${r.relation})`).join(", ")}\n`;
          }
          response += `\n`;
        });
      } else {
        response = language === "ca-ES"
          ? "La base de dades utilitza Supabase amb diverses taules per gestionar productes, lots, moviments i usuaris."
          : "La base de datos utiliza Supabase con varias tablas para gestionar productos, lotes, movimientos y usuarios.";
      }
      
      return {
        content: response,
        sources: []
      };
    }
    
    // Respuesta estándar sobre funcionalidades
    response = language === "ca-ES"
      ? `L'aplicació inclou les següents funcionalitats principals:\n\n`
      : `La aplicación incluye las siguientes funcionalidades principales:\n\n`;

    response += language === "ca-ES" ? `**Pàgines disponibles:**\n` : `**Páginas disponibles:**\n`;
    routes.forEach((route) => {
      if (route.label && route.path !== "/") {
        response += `- **${route.label}** (${route.path})`;
        if (route.description) {
          response += `: ${route.description}`;
        }
        response += `\n`;
      }
    });

    response += language === "ca-ES" ? `\n**Servicis disponibles:**\n` : `\n**Servicios disponibles:**\n`;
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
  private generateGeneralResponse(question: string, language: LanguageCode = "es-ES"): AiResponse {
    const lowerQuestion = question.toLowerCase();
    
    // Si hay una acción directa pero no se detectó en how_to, intentar detectarla aquí
    // Usar patrones para detectar formas conjugadas
    const createPattern = /cre[ao]|crea|creem|afeg|afegix|nuevo|nou/;
    const editPattern = /edit|modifiqu|canvi/;
    
    const hasCreateAction = createPattern.test(lowerQuestion);
    const hasEditAction = editPattern.test(lowerQuestion);
    const hasProduct = lowerQuestion.includes("producto") || lowerQuestion.includes("producte");
    
    if (hasCreateAction && hasProduct) {
      // Si detecta crear/creo + producto, redirigir a generateHowToResponse
      return {
        content: language === "ca-ES"
          ? "Per crear un nou producte, ves a la pàgina de productes i fes clic al botó 'Nou producte'. Allà podràs omplir tots els camps necessaris."
          : "Para crear un nuevo producto, ve a la página de productos y haz clic en el botón 'Nuevo producto'. Allí podrás llenar todos los campos necesarios.",
        sources: ["/products/new"]
      };
    }
    
    if (hasEditAction && hasProduct) {
      // Probablemente se refiere a editar producto
      const response = language === "ca-ES"
        ? "Per editar un producte existent, ves a la llista de productes, cerca el producte que vols editar i fes clic al botó d'editar."
        : "Para editar un producto existente, ve a la lista de productos, busca el producto que quieres editar y haz clic en el botón de editar.";
      
      return {
        content: response,
        sources: ["/products"]
      };
    }
    
    if (hasEditAction || hasCreateAction) {
      // Intentar generar una respuesta útil incluso si no se clasificó como how_to
      if (hasEditAction) {
        const response = language === "ca-ES"
          ? "Per editar un element a l'aplicació, pots fer-ho des de les seves pàgines corresponents. Per exemple:\n\n- **Editar producte**: Ves a la llista de productes, cerca el producte i fes clic a editar\n- **Editar lot**: Ves a la llista de lots i selecciona el lot a editar\n\nQuè vols editar específicament?"
          : "Para editar un elemento en la aplicación, puedes hacerlo desde sus páginas correspondientes. Por ejemplo:\n\n- **Editar producto**: Ve a la lista de productos, busca el producto y haz clic en editar\n- **Editar lote**: Ve a la lista de lotes y selecciona el lote a editar\n\n¿Qué quieres editar específicamente?";
        
        return {
          content: response,
          suggestedActions: []
        };
      }
    }
    
    const baseWelcome = getAiResponse(language, "general.welcome");
    // Aplicar técnicas de NLG para hacer el mensaje de bienvenida más humano
    const welcomeMessage = nlg.generateResponse(baseWelcome, language, {
      variation: "friendly",
      addPersonalTouch: true
    });
    
    return {
      content: welcomeMessage,
      suggestedActions: [
        {
          label: language === "ca-ES" ? "Com creo un producte?" : "¿Cómo creo un producto?",
          path: "/products/new"
        },
        {
          label: language === "ca-ES" ? "Com utilitzo l'escàner?" : "¿Cómo uso el escáner?",
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
    allowedRoles?: string[],
    language: LanguageCode = "es-ES"
  ): AiResponse {
    const roleInfo = this.codeAnalyzer.getPermissionInfo(requiredPermission);
    const response = getAiResponse(language, "permissionDenied.message", {
      action,
      permission: requiredPermission,
      desc: roleInfo?.description || requiredPermission,
      role: userRole || "No identificado",
      allowedRoles: allowedRoles?.join(", ") || ""
    });

    return {
      content: response,
      requiresPermission: requiredPermission,
      suggestedActions: [
        {
          label: language === "ca-ES" ? "Contactar administrador" : "Contactar administrador",
          permission: "admin.users"
        }
      ]
    };
  }

  /**
   * Extrae el permiso de una pregunta (reconoce ES y CA)
   */
  private extractPermissionFromQuestion(question: string): string {
    // Mapeo simple de palabras clave a permisos (ES y CA)
    const mapping: Record<string, string> = {
      producto: "products.view",
      producte: "products.view",
      crear: "products.create",
      editar: "products.edit",
      modificar: "products.edit",
      eliminar: "products.delete",
      esborrar: "products.delete",
      escanear: "scanner.use",
      escáner: "scanner.use",
      escàner: "scanner.use",
      escanejar: "scanner.use",
      movimiento: "movements.view",
      moviment: "movements.view",
      reporte: "reports.view",
      informe: "reports.view",
      exportar: "reports.export_excel",
      exportar: "reports.export_excel",
      lote: "batches.view",
      lot: "batches.view"
    };

    for (const [keyword, permission] of Object.entries(mapping)) {
      if (question.includes(keyword)) {
        return permission;
      }
    }

    return "";
  }
}

