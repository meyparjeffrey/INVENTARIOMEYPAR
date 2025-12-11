# Integración con Google Gemini API

## Resumen

Se ha implementado un sistema de toggle que permite cambiar entre dos motores de IA:

1. **Sistema Local (NLG)**: Sistema híbrido sin LLM que genera respuestas más humanas usando técnicas de generación de lenguaje natural
2. **Google Gemini API**: Integración con el modelo de lenguaje de Google para respuestas más avanzadas

## Funcionalidades Implementadas

### 1. Interfaz Común (`IAiService`)
- Crea una abstracción común para ambos sistemas
- Permite intercambiar entre motores sin cambiar el código del chat

### 2. Servicio Gemini (`GeminiAiService`)
- Integración completa con Google Gemini API
- **Fallback automático**: Si Gemini no está disponible o falla, usa el sistema local
- **Consulta datos de Supabase**: Para consultas de datos, primero obtiene información del servicio local (que consulta directamente las tablas de Supabase) y la usa como contexto para Gemini

### 3. Toggle en UI
- Botón en el header del chat para cambiar entre "Local" y "Gemini"
- La preferencia se guarda en `localStorage`
- El cambio es inmediato y se aplica a los siguientes mensajes

## Configuración

### Variables de Entorno

Añadir en `.env.local`:

```env
VITE_GEMINI_API_KEY=tu_api_key_de_gemini
```

**Cómo obtener la API key:**
1. Ve a https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la key y añádela a `.env.local`

### Sin API Key

Si no configuras la API key, el chat funcionará completamente con el sistema local. El botón de Gemini se mostrará, pero si lo seleccionas, automáticamente usará el sistema local como fallback.

## Arquitectura

```
AiChatContext
    ↓
[IAiService Interface]
    ↓
    ├── AiChatService (Local - NLG)
    └── GeminiAiService (Gemini API)
            └── Fallback a AiChatService si falla
```

## Ventajas del Sistema Híbrido

### Sistema Local (NLG)
- ✅ **Sin costos**: No requiere API externa
- ✅ **Privacidad**: Todo se procesa localmente
- ✅ **Velocidad**: Respuestas instantáneas
- ✅ **Consultas directas**: Consulta directamente las tablas de Supabase
- ✅ **Siempre actualizado**: Ve cambios en tiempo real

### Google Gemini
- ✅ **Respuestas más naturales**: LLM entrenado para conversación
- ✅ **Mejor comprensión**: Entiende contexto más complejo
- ✅ **Adaptabilidad**: Se adapta mejor a preguntas ambiguas
- ⚠️ **Requiere API key**: Necesitas configurar la key
- ⚠️ **Latencia**: Puede ser más lento (llamada externa)
- ⚠️ **Costo**: Puede tener límites según tu plan

## Uso

1. Abre el chat de IA (botón flotante abajo a la izquierda)
2. En el header del chat, verás dos botones: "Local" y "Gemini"
3. Haz clic en el que quieras usar
4. La preferencia se guarda automáticamente

## Notas Técnicas

- Gemini usa el servicio local para consultar datos de Supabase antes de responder
- Si Gemini no puede responder, automáticamente usa el sistema local
- Ambos sistemas respetan los permisos del usuario
- Ambos sistemas responden en el idioma seleccionado (español/catalán)

## Próximos Pasos

- [ ] Añadir indicador visual de qué motor está activo
- [ ] Añadir estadísticas de uso (cuántas respuestas de cada motor)
- [ ] Permitir configurar modelo de Gemini (gemini-pro, gemini-pro-vision, etc.)

