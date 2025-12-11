# Instrucciones para Probar el Botón de Gemini

## Estado Actual

✅ **Correcciones Aplicadas:**
1. Lógica de reinicialización corregida en `AiChatContext.tsx`
2. Logs de debugging añadidos en todos los puntos críticos
3. Variables de entorno añadidas en configuraciones de Vite
4. Mejora en el acceso a la API key de Gemini

## Pasos para Probar

### 1. Verificar que el Servidor Esté Corriendo
- El servidor debe estar ejecutándose con `npm run dev:web`
- Verificar que esté en `http://localhost:5173`

### 2. Abrir el Chat
- Hacer click en el botón flotante "MEYPAR IA" (parte inferior izquierda)
- El chat debería abrirse mostrando los botones "Local" y "Gemini"

### 3. Verificar Logs Iniciales
En DevTools (F12) → Console, deberías ver:
```
[AiChat] useEffect iniciado, aiEngine: local aiServiceRef.current existe: false
[AiChat] Cargando servicio Local...
[AiChat] ✅ Servicio Local cargado correctamente
```

### 4. Hacer Click en el Botón "Gemini"
- Hacer click en el botón "Gemini" en el header del chat
- Observar los logs en consola

### 5. Logs Esperados al Hacer Click en Gemini
```
[AiChatPanel] Click en botón Gemini
[AiChat] setAiEngine llamado - cambiando de local a gemini
[AiChat] Estado actualizado, aiEngine ahora es: gemini
[AiChat] useEffect iniciado, aiEngine: gemini aiServiceRef.current existe: false
[AiChat] Intentando cargar servicio Gemini...
[GeminiAiService] Constructor - API key encontrada: AIzaSyBMdi...
[GeminiAiService] Cliente de Gemini inicializado correctamente
[GeminiAiService] API key encontrada en import.meta.env (o process.env)
[GeminiAiService] isAvailable() - cliente: true, API key: true, total: true
[AiChat] ✅ Gemini disponible y cargado correctamente
```

### 6. Si Aparece "Gemini no disponible"
Verificar en los logs:
- `[GeminiAiService] API key NO encontrada...` → Problema con variables de entorno
- `[GeminiAiService] Error inicializando Gemini...` → Problema con la API key o la librería
- Ver qué keys están disponibles: `keys disponibles: [...]`

## Posibles Problemas y Soluciones

### Problema 1: API Key No Encontrada
**Solución:**
1. Verificar que `.env.local` contiene: `VITE_GEMINI_API_KEY=tu_key_aqui`
2. **REINICIAR EL SERVIDOR** (Ctrl+C y luego `npm run dev:web`)
3. Vite solo carga variables de entorno al iniciar

### Problema 2: El Botón No Responde
**Verificar:**
1. Abrir DevTools → Console
2. Hacer click en el botón Gemini
3. Ver si aparece el log `[AiChatPanel] Click en botón Gemini`
4. Si NO aparece, el problema es que el evento no se está disparando
5. Si SÍ aparece, el problema está en la lógica de `setAiEngine`

### Problema 3: El Estado No Cambia
**Verificar:**
1. Después de hacer click, verificar si el botón "Gemini" cambia de estilo (debería tener fondo blanco/20)
2. Ver en localStorage: `localStorage.getItem("aiEngine")` debería ser "gemini"
3. Ver logs: `[AiChat] Estado actualizado, aiEngine ahora es: gemini`

## Pruebas Adicionales

### Probar Enviando un Mensaje con Gemini
1. Cambiar a Gemini
2. Escribir un mensaje (ej: "hola, prueba")
3. Enviar el mensaje
4. Verificar que la respuesta viene de Gemini (debe ser diferente a la respuesta local)

### Probar Cambio Entre Local y Gemini
1. Cambiar a Gemini
2. Cambiar de vuelta a Local
3. Verificar que los logs muestren ambos cambios
4. Enviar mensajes en cada modo y verificar que las respuestas son diferentes

## Debugging

Si algo no funciona, revisar:
1. **Console logs**: Todos los logs empiezan con `[AiChat]` o `[GeminiAiService]`
2. **Network tab**: Verificar que no hay errores 404 o 500
3. **localStorage**: `localStorage.getItem("aiEngine")` debería reflejar el estado actual
4. **Variables de entorno**: Verificar que `import.meta.env.VITE_GEMINI_API_KEY` existe en runtime

