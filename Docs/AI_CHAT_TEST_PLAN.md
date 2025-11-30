# Plan de Pruebas Exhaustivas del Chat de IA

## Objetivo
Verificar que el chat de IA responde correctamente, con lógica y coherencia a diferentes tipos de preguntas.

## Tablas de Supabase Disponibles

### Productos y Almacén
- `products` - Productos del inventario
- `product_batches` - Lotes de productos
- `batch_defect_reports` - Reportes de defectos
- `inventory_movements` - Movimientos de inventario
- `suppliers` - Proveedores

### Usuarios y Permisos
- `profiles` - Perfiles de usuario
- `user_settings` - Configuración de usuario
- `user_permissions` - Permisos granulares
- `user_login_events` - Eventos de login

### Otros
- `ai_suggestions` - Sugerencias de IA
- `chat_rooms` - Salas de chat
- `chat_messages` - Mensajes de chat
- `audit_logs` - Logs de auditoría

## Pruebas a Realizar

### Grupo 1: Preguntas Lógicas sobre Productos
1. ✅ "editar un producto existente" → Debe explicar paso a paso cómo editar
2. ✅ "com creo un producte?" → Debe explicar en catalán
3. ✅ "crear producto" → Debe explicar cómo crear
4. ✅ "modificar producto" → Debe explicar cómo editar
5. ✅ "quins productes estan en alarma?" → Debe consultar productos con stock bajo
6. ✅ "qué productos están en alarma?" → Debe consultar productos con stock bajo

### Grupo 2: Consultas de Datos
1. "cuántos productos hay?" → Debe consultar tabla products
2. "qué lotes hay?" → Debe explicar cómo ver lotes
3. "qué movimientos hubo hoy?" → Debe consultar inventory_movements
4. "qué productos tienen lotes defectuosos?" → Debe consultar product_batches con status='DEFECTIVE'

### Grupo 3: Preguntas sobre Funcionalidades
1. "cómo funciona el escáner?" → Explicar funcionalidad
2. "qué puedo hacer con lotes?" → Explicar funcionalidades de lotes
3. "cómo exporto datos?" → Explicar exportación

### Grupo 4: Preguntas sobre Permisos
1. "puedo crear productos?" → Verificar permisos y explicar
2. "qué permisos tengo?" → Listar permisos del usuario
3. "puedo editar lotes?" → Verificar y explicar

### Grupo 5: Conversaciones Largas (Coherencia)
1. Usuario: "editar un producto existente"
   IA: Explica cómo editar
   
2. Usuario: "y si quiero cambiar solo el nombre?"
   IA: Debe responder coherentemente sobre editar nombre

3. Usuario: "qué otros campos puedo modificar?"
   IA: Debe listar campos editables

### Grupo 6: Preguntas Sin Sentido
1. "hola" → Mensaje de bienvenida útil
2. "quiero pizza" → Respuesta educada sobre capacidades
3. "abc123" → Respuesta útil preguntando qué necesita

### Grupo 7: Preguntas con Contexto de Tablas
1. "cómo se almacenan los productos en la base de datos?" → Explicar tabla products
2. "qué información tiene un lote?" → Explicar tabla product_batches
3. "cómo se registran los movimientos?" → Explicar tabla inventory_movements

## Criterios de Éxito

✅ **Lógica**: Las respuestas deben tener sentido según la pregunta
✅ **Coherencia**: En conversaciones largas, las respuestas deben ser coherentes
✅ **Idioma**: Todas las respuestas en el idioma activo (catalán/español)
✅ **Precisión**: Las respuestas deben ser correctas según el sistema
✅ **Utilidad**: Las respuestas deben ser útiles para el usuario

## Notas
- Todas las pruebas deben verificarse en catalán Y español
- Verificar que no hay errores en consola
- Verificar que las respuestas son coherentes en conversaciones largas

