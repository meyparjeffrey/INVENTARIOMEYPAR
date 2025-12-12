/**
 * Generador de Lenguaje Natural (NLG) sin LLM
 * Utiliza técnicas de generación de lenguaje natural basadas en templates y variaciones
 * para crear respuestas más humanas y naturales sin necesidad de modelos de lenguaje grandes
 */

type LanguageCode = "es-ES" | "ca-ES";

interface ResponseVariation {
  template: string;
  style: "friendly" | "professional" | "casual" | "detailed";
  context?: string[];
}

interface SentenceBuilder {
  intro: string[];
  body: string[];
  outro: string[];
  transitions: string[];
}

/**
 * Motor de generación de lenguaje natural
 * Aplica técnicas de NLG para crear respuestas más humanas
 */
export class NaturalLanguageGenerator {
  private conversationHistory: string[] = [];
  
  /**
   * Genera una respuesta más humana usando técnicas de NLG
   */
  generateResponse(
    baseTemplate: string,
    language: LanguageCode,
    context?: {
      variation?: "friendly" | "professional" | "casual" | "detailed";
      addPersonalTouch?: boolean;
      includeTransitions?: boolean;
    }
  ): string {
    // Aplicar variaciones naturales
    let response = baseTemplate;
    
    // Mejorar fluidez primero
    response = this.improveFluency(response, language);
    
    // Personalizar según el estilo (antes de transiciones)
    if (context?.variation) {
      response = this.applyStyleVariation(response, context.variation, language);
    }
    
    // Añadir transiciones naturales si se solicita
    if (context?.includeTransitions) {
      response = this.addNaturalTransitions(response, language);
    }
    
    // Añadir toque personal si se solicita (al final)
    if (context?.addPersonalTouch) {
      response = this.addPersonalTouch(response, language);
    }
    
    return response;
  }
  
  /**
   * Añade transiciones naturales entre ideas
   */
  private addNaturalTransitions(text: string, language: LanguageCode): string {
    const transitions = {
      "es-ES": [
        "Bien, ",
        "Perfecto, ",
        "Ahora, ",
        "Además, ",
        "También, ",
        "Por cierto, ",
        "Es importante mencionar que ",
        "Ten en cuenta que ",
        "Para hacer esto, ",
        "En este punto, ",
      ],
      "ca-ES": [
        "Bé, ",
        "Perfecte, ",
        "Ara, ",
        "A més, ",
        "També, ",
        "Per cert, ",
        "És important esmentar que ",
        "Tingues en compte que ",
        "Per fer això, ",
        "En aquest punt, ",
      ]
    };
    
    // Detectar puntos donde añadir transiciones (separar por párrafos numerados)
    const paragraphs = text.split(/\n\n/);
    if (paragraphs.length > 2) {
      const selectedTransitions = transitions[language];
      // Añadir transiciones aleatorias a algunos párrafos intermedios
      for (let i = 2; i < paragraphs.length && i < 5; i++) {
        // 30% de probabilidad de añadir transición
        if (Math.random() < 0.3 && paragraphs[i].length > 20) {
          const randomTransition = selectedTransitions[
            Math.floor(Math.random() * selectedTransitions.length)
          ];
          // Solo añadir si el párrafo no empieza ya con una transición
          if (!paragraphs[i].match(/^(Bien|Perfecto|Ahora|Además|También|Por cierto|Bé|Perfecte|Ara|A més|També|Per cert)/i)) {
            paragraphs[i] = randomTransition + paragraphs[i].charAt(0).toLowerCase() + paragraphs[i].slice(1);
          }
        }
      }
      
      return paragraphs.join("\n\n");
    }
    
    return text;
  }
  
  /**
   * Aplica variaciones de estilo
   */
  private applyStyleVariation(
    text: string,
    style: "friendly" | "professional" | "casual" | "detailed",
    language: LanguageCode
  ): string {
    const styleModifiers = {
      "es-ES": {
        friendly: {
          intro: ["¡Hola! ", "¡Perfecto! ", "Genial, "],
          outro: ["¡Cualquier duda, avísame!", "¡Estoy aquí para ayudarte!", "¡No dudes en preguntar!"]
        },
        professional: {
          intro: ["Para realizar esta acción, "],
          outro: ["Si necesitas más información, consulta la documentación."]
        },
        casual: {
          intro: ["Mira, ", "Bueno, ", "Pues "],
          outro: ["Cualquier cosa, me dices.", "Si te ayuda, genial."]
        },
        detailed: {
          intro: ["Te explico paso a paso: "],
          outro: ["Espero que esta información te sea útil. Si necesitas más detalles, puedo ampliar cualquier punto."]
        }
      },
      "ca-ES": {
        friendly: {
          intro: ["Hola! ", "Perfecte! ", "Genial, "],
          outro: ["Qualsevol dubte, avisa'm!", "Estic aquí per ajudar-te!", "No dubtis a preguntar!"]
        },
        professional: {
          intro: ["Per realitzar aquesta acció, "],
          outro: ["Si necessites més informació, consulta la documentació."]
        },
        casual: {
          intro: ["Mira, ", "Bé, ", "Doncs "],
          outro: ["Qualsevol cosa, em dius.", "Si t'ajuda, genial."]
        },
        detailed: {
          intro: ["T'explico pas a pas: "],
          outro: ["Espero que aquesta informació et sigui útil. Si necessites més detalls, puc ampliar qualsevol punt."]
        }
      }
    };
    
    const modifiers = styleModifiers[language][style];
    
    // Añadir intro si no existe
    if (modifiers.intro && !text.match(/^(¡|Hola|Genial|Perfecto|Bé|Hola!|Genial,|Perfecte!)/i)) {
      const randomIntro = modifiers.intro[Math.floor(Math.random() * modifiers.intro.length)];
      text = randomIntro + text.charAt(0).toLowerCase() + text.slice(1);
    }
    
    // Añadir outro
    if (modifiers.outro && !text.endsWith("!")) {
      const randomOutro = modifiers.outro[Math.floor(Math.random() * modifiers.outro.length)];
      text += "\n\n" + randomOutro;
    }
    
    return text;
  }
  
  /**
   * Añade un toque personal a la respuesta
   */
  private addPersonalTouch(text: string, language: LanguageCode): string {
    const personalTouches = {
      "es-ES": [
        "Espero que esto te ayude.",
        "Si te surge alguna duda, no dudes en preguntar.",
        "¿Hay algo más en lo que pueda ayudarte?",
      ],
      "ca-ES": [
        "Espero que això t'ajudi.",
        "Si et sorgeix algun dubte, no dubtis a preguntar.",
        "Hi ha alguna cosa més en què pugui ajudar-te?",
      ]
    };
    
    const touches = personalTouches[language];
    const randomTouch = touches[Math.floor(Math.random() * touches.length)];
    
    // Añadir al final si no termina con pregunta o exclamación
    if (!text.endsWith("?") && !text.endsWith("!")) {
      return text + "\n\n" + randomTouch;
    }
    
    return text;
  }
  
  /**
   * Crea variaciones de una respuesta base
   */
  generateVariations(
    baseKey: string,
    language: LanguageCode,
    count: number = 3
  ): string[] {
    // Esto se implementaría con múltiples templates para cada tipo de respuesta
    // Por ahora, devolvemos variaciones básicas
    return [baseKey]; // Placeholder
  }
  
  /**
   * Mejora la fluidez de una respuesta
   */
  improveFluency(text: string, language: LanguageCode): string {
    // Reemplazar frases repetitivas
    const replacements = {
      "es-ES": [
        { from: /puedes hacer/g, to: "puedes realizar" },
        { from: /necesitas hacer/g, to: "necesitas realizar" },
        { from: /debes hacer/g, to: "debes realizar" },
      ],
      "ca-ES": [
        { from: /pots fer/g, to: "pots realitzar" },
        { from: /necessites fer/g, to: "necessites realitzar" },
        { from: /has de fer/g, to: "has de realitzar" },
      ]
    };
    
    let improved = text;
    const reps = replacements[language];
    
    for (const rep of reps) {
      improved = improved.replace(rep.from, rep.to);
    }
    
    return improved;
  }
  
  /**
   * Genera una respuesta con estructura conversacional natural
   */
  buildConversationalResponse(
    parts: {
      greeting?: string;
      acknowledgment?: string;
      mainContent: string;
      additionalInfo?: string;
      closing?: string;
    },
    language: LanguageCode
  ): string {
    const responseParts: string[] = [];
    
    if (parts.greeting) {
      responseParts.push(parts.greeting);
    }
    
    if (parts.acknowledgment) {
      responseParts.push(parts.acknowledgment);
    }
    
    responseParts.push(parts.mainContent);
    
    if (parts.additionalInfo) {
      const connectors = {
        "es-ES": ["Además,", "También,", "Por otro lado,"],
        "ca-ES": ["A més,", "També,", "D'altra banda,"]
      };
      
      const connector = connectors[language][
        Math.floor(Math.random() * connectors[language].length)
      ];
      responseParts.push(connector + " " + parts.additionalInfo);
    }
    
    if (parts.closing) {
      responseParts.push("\n\n" + parts.closing);
    }
    
    return responseParts.join("\n\n");
  }
  
  /**
   * Añade variedad léxica usando sinónimos
   */
  applyLexicalVariation(text: string, language: LanguageCode): string {
    const synonyms = {
      "es-ES": {
        "hacer": ["realizar", "ejecutar", "llevar a cabo"],
        "ver": ["consultar", "revisar", "visualizar"],
        "crear": ["añadir", "registrar", "agregar"],
        "editar": ["modificar", "actualizar", "cambiar"],
      },
      "ca-ES": {
        "fer": ["realitzar", "executar", "portar a terme"],
        "veure": ["consultar", "revisar", "visualitzar"],
        "crear": ["afegir", "registrar", "agregar"],
        "editar": ["modificar", "actualitzar", "canviar"],
      }
    };
    
    // Por ahora, devolvemos el texto sin cambios
    // En una implementación completa, reemplazaríamos palabras por sinónimos
    return text;
  }
}

// Instancia singleton
export const nlg = new NaturalLanguageGenerator();

