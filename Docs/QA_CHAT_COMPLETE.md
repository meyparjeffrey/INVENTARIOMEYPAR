# QA Completo del Chat de IA - Análisis Funcional

**Fecha:** 2024-12-19  
**Rama:** CHATAIFINAL

---

## 🔴 PROBLEMA IDENTIFICADO

### Problema Principal: Menú se resetea después de acciones

**Síntoma:** Cuando el usuario hace clic en "Crear Producto" (que tiene `action: "how_to:create_product"`), en lugar de mostrar la respuesta con instrucciones, vuelve a mostrar el menú principal.

**Flujo esperado:**

1. Usuario abre chat → Ve menú principal
2. Usuario hace clic en "Productos" → Ve sub-menú de productos
3. Usuario hace clic en "Crear Producto" → Debería ver instrucciones detalladas sobre cómo crear un producto

**Flujo actual (con error):**

1. Usuario abre chat → Ve menú principal ✅
2. Usuario hace clic en "Productos" → Ve sub-menú de productos ✅
3. Usuario hace clic en "Crear Producto" → **Vuelve al menú principal** ❌

---

## 🔍 ANÁLISIS DEL CÓDIGO

### 1. Flujo de Click en Botón de Menú

**Archivo:** `src/presentation/components/ai/MessageBubble.tsx`

```typescript
const handleMenuOptionClick = React.useCallback(
  async (option: MenuOption) => {
    // PRIORIDAD 1: Si tiene una acción específica (how_to:, query:, info:), ejecutarla directamente
    if (option.action) {
      await sendMessage(option.action); // Envía "how_to:create_product"
      return;
    }
    // ...
  },
  [sendMessage],
);
```

**Análisis:** ✅ Correcto - Envía `"how_to:create_product"` cuando hay `action`

---

### 2. Procesamiento en AiChatContext

**Archivo:** `src/presentation/context/AiChatContext.tsx`

```typescript
const sendMessage = React.useCallback(
  async (content: string) => {
    // ...
    const isInternal = isInternalCommand(content); // Detecta "how_to:" como interno

    // Solo añadir mensaje del usuario si NO es un comando interno
    if (!isInternal && content.trim()) {
      // No añade mensaje del usuario para comandos internos ✅
    }

    // ...
    const response = await aiServiceRef.current.processMessage(
      content.trim(), // "how_to:create_product"
      userPermissions,
      userRole,
    );
  },
  [authContext, t, isInitializing, isInternalCommand],
);
```

**Análisis:** ✅ Correcto - No muestra el mensaje del usuario para comandos internos

---

### 3. Procesamiento en AiChatService

**Archivo:** `src/application/services/AiChatService.ts`

```typescript
async processMessage(userMessage: string, ...) {
  // ...

  // Si es un comando de menú, procesarlo ANTES de la clasificación normal
  const lowerMessage = userMessage.toLowerCase();
  if (lowerMessage.startsWith("menu:") || lowerMessage.startsWith("how_to:") || ...) {
    response = await this.processMenuAction(userMessage, userPermissions || [], userRole);
    // Si processMenuAction devolvió una respuesta válida, usarla directamente
    if (response && response.content && response.content !== "PROCESS_DATA_QUERY") {
      return response;  // ✅ Debería retornar la respuesta
    }
  }

  // Si no es comando de menú, clasificar y generar respuesta normal
  const intent = await this.responseEngine.classifyQuestion(userMessage);
  response = await this.responseEngine.generateResponse(...);

  return response;
}
```

**Análisis:** ⚠️ **PROBLEMA POTENCIAL** - Si `processMenuAction` no retorna una respuesta válida, continúa con el flujo normal

---

### 4. Procesamiento en processMenuAction

**Archivo:** `src/application/services/AiChatService.ts` (línea 366-459)

```typescript
private async processMenuAction(action: string, ...) {
  const lowerAction = action.toLowerCase();

  // Si es menu:id, mostrar sub-opciones
  if (lowerAction.startsWith("menu:")) {
    // ... maneja menu:products, menu:products-create, etc.
  }

  // Si es info:page:, mostrar información sobre la página
  if (lowerAction.startsWith("info:page:")) {
    // ...
  }

  // Si es how_to:, query: o info:, procesar con ResponseEngine
  if (lowerAction.startsWith("how_to:") || lowerAction.startsWith("query:") || lowerAction.startsWith("info:")) {
    const intent = await this.responseEngine.classifyQuestion(action);
    return await this.responseEngine.generateResponse(
      action,  // "how_to:create_product"
      intent,
      userPermissions || [],
      userRole
    );
  }

  // Por defecto, mostrar menú principal
  const menuResponse = generateMenuResponse();
  return {
    ...menuResponse,
    menuOptions: CHAT_MENU_STRUCTURE.map(...)  // ❌ PROBLEMA: Retorna menú principal
  };
}
```

**Análisis:** ✅ Debería funcionar - Si recibe "how_to:create_product", debería entrar en el `if` de línea 438 y llamar a `ResponseEngine.generateResponse`

---

### 5. Generación de Respuesta en ResponseEngine

**Archivo:** `src/infrastructure/ai/ResponseEngine.ts`

```typescript
async generateResponse(question: string, intent: QuestionIntent, ...) {
  // ...
  switch (intent.category) {
    case "how_to":
      return this.generateHowToResponse(question, intent, structure, userPermissions, userRole);
    // ...
  }
}

private generateHowToResponse(question: string, ...) {
  const lowerQuestion = question.toLowerCase();

  // Manejar acciones específicas del menú
  if (lowerQuestion.startsWith("how_to:")) {
    const action = lowerQuestion.replace("how_to:", "");  // "create_product"
    switch (action) {
      case "create_product":
        // ✅ Genera respuesta detallada (líneas 232-293)
        return {
          content: "<strong>📦 Cómo Crear un Producto</strong>...",
          sources: ["/products/new"]
        };
      // ...
    }
  }

  // Si no encuentra la acción, genera respuesta genérica
  return this.generateGeneralHowToResponse(...);
}
```

**Análisis:** ✅ El código parece correcto - Debería generar la respuesta para "create_product"

---

## 🐛 POSIBLES CAUSAS DEL PROBLEMA

### Causa 1: El intent no se clasifica como "how_to"

**Hipótesis:** Cuando se envía "how_to:create_product", el `classifyQuestion` podría no detectarlo como categoría "how_to" porque no contiene palabras clave como "cómo" o "como".

**Verificación necesaria:**

- Revisar si `classifyQuestion("how_to:create_product")` retorna `category: "how_to"`
- Si retorna "general", entonces `generateResponse` irá al `default` y mostrará menú principal

### Causa 2: El switch case no encuentra "create_product"

**Hipótesis:** El `switch (action)` en `generateHowToResponse` no encuentra el caso "create_product" y cae al `default`, que podría retornar el menú principal.

**Verificación necesaria:**

- Revisar si el case "create_product" existe y está correctamente escrito
- Verificar que no haya un `default` que retorne el menú principal

### Causa 3: La respuesta se genera pero se sobrescribe

**Hipótesis:** La respuesta se genera correctamente, pero luego se sobrescribe en algún lugar del flujo.

**Verificación necesaria:**

- Añadir logs en cada paso del flujo
- Verificar que la respuesta no se modifique después de generarse

---

## 🔧 SOLUCIONES PROPUESTAS

### Solución 1: Mejorar detección de comandos "how_to:" en classifyQuestion

**Problema:** `classifyQuestion` busca palabras clave en el texto, pero "how_to:create_product" no contiene "cómo" o "como".

**Solución:**

```typescript
async classifyQuestion(question: string): Promise<QuestionIntent> {
  const lowerQuestion = question.toLowerCase();

  // Detectar comandos específicos ANTES de buscar palabras clave
  if (lowerQuestion.startsWith("how_to:")) {
    return {
      category: "how_to",
      keywords: [],
      confidence: 1.0,
      action: lowerQuestion.replace("how_to:", "")
    };
  }

  // ... resto del código
}
```

### Solución 2: Simplificar processMenuAction para comandos "how_to:"

**Problema:** `processMenuAction` llama a `ResponseEngine` que a su vez llama a `classifyQuestion`, que podría no detectar correctamente el comando.

**Solución:**

```typescript
// Si es how_to:, procesar directamente sin pasar por classifyQuestion
if (lowerAction.startsWith('how_to:')) {
  const action = lowerAction.replace('how_to:', '');
  return this.responseEngine.generateHowToResponseDirect(
    action,
    userPermissions,
    userRole,
  );
}
```

### Solución 3: Añadir logs de depuración

**Solución:**
Añadir logs en cada paso para identificar dónde se pierde la respuesta:

```typescript
console.log('🔍 [processMenuAction] Acción recibida:', action);
console.log('🔍 [processMenuAction] Es how_to?:', lowerAction.startsWith('how_to:'));
console.log('🔍 [ResponseEngine] Intent generado:', intent);
console.log('🔍 [ResponseEngine] Respuesta generada:', response);
```

---

## 📋 CHECKLIST DE PRUEBAS

### Prueba 1: Flujo básico de menú

- [ ] Abrir chat → Debe mostrar menú principal
- [ ] Clic en "Productos" → Debe mostrar sub-menú de productos
- [ ] Clic en "Crear Producto" → Debe mostrar instrucciones, NO menú principal

### Prueba 2: Comandos how_to:

- [ ] "how_to:create_product" → Debe mostrar instrucciones de creación
- [ ] "how_to:filter_products" → Debe mostrar instrucciones de filtrado
- [ ] "how_to:export_products" → Debe mostrar instrucciones de exportación

### Prueba 3: Comandos query:

- [ ] "query:stock" → Debe mostrar consulta de stock
- [ ] "query:alarma" → Debe mostrar productos en alarma

### Prueba 4: Comandos menu:

- [ ] "menu:products" → Debe mostrar sub-menú de productos
- [ ] "menu:products-stock" → Debe mostrar sub-menú de stock

### Prueba 5: Comandos info:page:

- [ ] "info:page:/products/new" → Debe mostrar información sobre la página

---

## 🎯 MEJORAS ADICIONALES RECOMENDADAS

### 1. Mejorar Experiencia de Usuario

**Problema actual:** No hay feedback visual cuando se hace clic en un botón del menú.

**Mejora:**

- Deshabilitar el botón mientras se procesa
- Mostrar indicador de carga
- Añadir animación de "enviando"

### 2. Historial de Navegación

**Problema actual:** No hay forma de volver atrás en el menú.

**Mejora:**

- Añadir botón "Volver" cuando se está en un sub-menú
- Mostrar breadcrumb del menú actual
- Permitir navegación con teclado (flechas)

### 3. Búsqueda en el Chat

**Problema actual:** No se puede buscar en el historial del chat.

**Mejora:**

- Añadir barra de búsqueda en el historial
- Resaltar resultados de búsqueda
- Filtrar mensajes por tipo (usuario/asistente)

### 4. Persistencia del Estado

**Problema actual:** Si se cierra el chat, se pierde el contexto.

**Mejora:**

- Guardar historial en localStorage
- Restaurar estado al abrir
- Limitar historial a últimos 50 mensajes

### 5. Mejores Prácticas de Chat UI

Basado en investigación de mejores prácticas:

**a) Indicadores de Estado:**

- "Escribiendo..." cuando el bot está procesando
- Timestamp en cada mensaje
- Indicador de mensaje leído/no leído

**b) Navegación:**

- Botón "Nuevo Chat" para reiniciar conversación
- Botón "Limpiar" para borrar historial
- Scroll automático inteligente (solo si está al final)

**c) Accesibilidad:**

- Soporte completo de teclado
- ARIA labels apropiados
- Contraste adecuado
- Tamaño de fuente ajustable

**d) Responsive:**

- Panel adaptable a móvil
- Touch-friendly en dispositivos táctiles
- Gestos de swipe para cerrar

---

## ✅ CORRECCIONES APLICADAS

### Corrección 1: Orden de procesamiento en AiChatService

**Problema:** Los comandos de menú se procesaban DESPUÉS de clasificar y generar respuesta.

**Solución:** Reordenar el código para procesar comandos de menú PRIMERO:

```typescript
// ANTES (incorrecto):
1. Clasificar pregunta
2. Generar respuesta
3. Verificar si es comando de menú

// DESPUÉS (correcto):
1. Verificar si es comando de menú → Procesar y retornar
2. Si no es comando, clasificar y generar respuesta normal
```

### Corrección 2: Detección de comandos en classifyQuestion

**Problema:** `classifyQuestion` no detectaba comandos "how_to:" porque buscaba palabras clave.

**Solución:** Añadir detección directa de comandos ANTES de buscar palabras clave:

```typescript
// Detectar comandos específicos ANTES de buscar palabras clave
if (lowerQuestion.startsWith('how_to:')) {
  return {
    category: 'how_to',
    keywords: [action],
    confidence: 1.0,
    action: action,
  };
}
```

### Corrección 3: Logs mejorados

**Mejora:** Añadir logs más descriptivos para facilitar depuración:

- `🔍 [AiChatService] Detectado comando de menú`
- `✅ [AiChatService] Respuesta de menú generada`
- `⚠️ [AiChatService] processMenuAction no retornó respuesta válida`

---

## 🔍 PRÓXIMOS PASOS

1. ✅ **Corregir orden de procesamiento** - COMPLETADO
2. ✅ **Mejorar classifyQuestion** - COMPLETADO
3. ⏳ **Probar cada flujo** individualmente - PENDIENTE
4. ⏳ **Implementar mejoras de UX** - PENDIENTE

---

## 📊 ESTADO ACTUAL

- ✅ Estructura del código: Bien organizada
- ✅ Manejo de errores: Básico, necesita mejoras
- ⚠️ Flujo de comandos: Tiene problemas de detección
- ⚠️ Experiencia de usuario: Necesita mejoras
- ⚠️ Persistencia: No implementada
- ⚠️ Accesibilidad: Básica, necesita mejoras
