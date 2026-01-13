/**
 * Traducciones de respuestas del motor de IA
 * Todas las respuestas del chat deben estar aquí en ambos idiomas
 */

type LanguageCode = 'es-ES' | 'ca-ES';

export const aiResponses: Record<LanguageCode, Record<string, string>> = {
  'es-ES': {
    // Errores generales
    'error.invalidQuestion': 'Por favor, escribe una pregunta válida.',
    'error.generic':
      'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
    'error.dataQuery':
      'Lo siento, hubo un error al consultar los datos. Por favor, inténtalo de nuevo.',
    'error.noPermission':
      "No tienes permisos para consultar información de productos. Necesitas el permiso 'products.view'.",

    // Crear producto
    'howTo.createProduct': `Para crear un nuevo producto:

1. **Navega a la página de productos**: Haz clic en "Productos" en el menú lateral o ve a \`/products\`.

2. **Haz clic en "Nuevo Producto"**: Verás un botón en la parte superior derecha de la lista de productos.

3. **Completa el formulario**:
   - **Código** (obligatorio): Código único del producto
   - **Nombre** (obligatorio): Nombre descriptivo
   - **Descripción**: Información adicional opcional
   - **Stock mínimo**: Nivel de alarma
   - **Ubicación**: Pasillo y estante
   - **Precios**: Precio de coste y venta
   - Y otros campos opcionales

4. **Guarda el producto**: Haz clic en "Crear Producto" al final del formulario.

Una vez creado, serás redirigido a la lista de productos.`,

    // Editar producto
    'howTo.editProduct': `Para editar un producto existente:

1. **Ve a la lista de productos**: Navega a \`/products\` desde el menú lateral.

2. **Busca el producto** que quieres editar usando el campo de búsqueda o navegando por la tabla.

3. **Haz clic en el botón de editar** en la fila del producto (icono de lápiz) o haz clic directamente en el producto para ver sus detalles.

4. **Desde la página de detalle**: Haz clic en el botón "Editar" que aparece en la parte superior.

5. **Modifica los campos** que necesites cambiar en el formulario.

6. **Guarda los cambios** haciendo clic en "Actualizar".

**Nota**: Solo puedes editar productos si tienes el permiso "products.edit".`,

    // Escáner
    'howTo.useScanner': `Para usar el escáner en la aplicación:

1. **Navega al módulo de Escáner**: Haz clic en "Escáner" en el menú lateral o ve a \`/scanner\`.

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

**Tip**: El escáner USB se comporta como un teclado, escribe el código y envía Enter automáticamente.`,

    // Movimientos
    'howTo.createMovement': `Para registrar un movimiento de inventario:

1. **Opción 1 - Desde el escáner**:
   - Escanea el código del producto o lote
   - Selecciona la acción "Registrar entrada" o "Registrar salida"
   - Completa el formulario con la cantidad y el motivo

2. **Opción 2 - Desde la página de movimientos**:
   - Navega a \`/movements\` desde el menú
   - Haz clic en "Nuevo Movimiento"
   - Selecciona el producto y, si aplica, el lote
   - Elige el tipo: Entrada, Salida, Ajuste o Transferencia
   - Completa la cantidad y el motivo (requerido)

3. **Campos importantes**:
   - **Motivo** (requerido): Explica por qué se realiza el movimiento
   - **Cantidad**: Número de unidades
   - **Lote**: Si el producto tiene control por lotes, selecciona el lote

**Nota**: El stock se actualiza automáticamente después de registrar el movimiento.`,

    // Respuesta general
    'howTo.general': `Puedo ayudarte con varias tareas en la aplicación:

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

¿Sobre qué funcionalidad específica te gustaría saber más?`,

    // Consultas de datos
    'dataQuery.noAlarms':
      'No hay productos en alarma actualmente. Todos los productos tienen stock suficiente.',
    'dataQuery.alarmsFound': 'Encontré {count} producto(s) en alarma de stock:\n\n',
    'dataQuery.moreAlarms':
      '\n... y {count} producto(s) más. Puedes ver todos en la página de Alarmas.',
    'dataQuery.productNotFound':
      'No se encontró ningún producto con el código "{code}". Verifica que el código sea correcto.',
    'dataQuery.generic': `Puedo ayudarte a consultar:

- Productos en alarma de stock
- Información de un producto por código
- Lista de productos

Ejemplos de preguntas:
- ¿Qué productos están en alarma?
- ¿Cuál es el stock del producto con código ABC-123?
- Muestra productos con stock bajo`,

    // Permisos
    'permissions.hasPermission': 'Sí, tienes permiso para "{desc}" ({key}).',
    'permissions.noPermission':
      'No, no tienes permiso para "{desc}".\n\nEste permiso está disponible para los roles: {roles}.',
    'permissions.currentRole': '\n\nTu rol actual es: {role}.',
    'permissions.contactAdmin':
      '\n\nContacta a un administrador si necesitas este permiso.',
    'permissions.askSpecific':
      'Para saber qué permisos tienes, puedo ayudarte. ¿Qué acción específica quieres realizar? Por ejemplo: "¿Puedo crear productos?" o "¿Puedo usar el escáner?"',
    'permissions.list':
      'Tu rol actual es: {role}.\n\nTienes los siguientes permisos:\n{permissions}',

    // Respuesta de bienvenida
    'general.welcome': `Hola, soy tu asistente de IA. Puedo ayudarte con:

- **Cómo usar la aplicación**: Explicarte paso a paso cómo realizar acciones
- **Consultar datos**: Buscar información sobre productos, lotes, movimientos
- **Permisos**: Explicarte qué puedes hacer según tu rol
- **Funcionalidades**: Mostrarte qué características están disponibles

¿En qué puedo ayudarte específicamente?`,

    // Permiso denegado
    'permissionDenied.message':
      'No puedes {action} porque no tienes el permiso necesario.\n\n**Permiso requerido**: {permission}\n**Descripción**: {desc}\n**Tu rol actual**: {role}\n**Roles permitidos**: {allowedRoles}\n\nContacta a un administrador si necesitas acceso a esta funcionalidad.',
  },

  'ca-ES': {
    // Errores generales
    'error.invalidQuestion': 'Si us plau, escriu una pregunta vàlida.',
    'error.generic':
      'Ho sento, hi ha hagut un error en processar el teu missatge. Si us plau, torna-ho a intentar.',
    'error.dataQuery':
      'Ho sento, hi ha hagut un error en consultar les dades. Si us plau, torna-ho a intentar.',
    'error.noPermission':
      "No tens permisos per consultar informació de productes. Necessites el permís 'products.view'.",

    // Crear producte
    'howTo.createProduct': `Per crear un nou producte:

1. **Navega a la pàgina de productes**: Fes clic a "Producte" al menú lateral o ves a \`/products\`.

2. **Fes clic a "Nou Producte"**: Veuràs un botó a la part superior dreta de la llista de productes.

3. **Completa el formulari**:
   - **Codi** (obligatori): Codi únic del producte
   - **Nom** (obligatori): Nom descriptiu
   - **Descripció**: Informació addicional opcional
   - **Estoc mínim**: Nivell d'alarma
   - **Ubicació**: Passadís i prestatge
   - **Preus**: Preu de cost i venda
   - I altres camps opcionals

4. **Desa el producte**: Fes clic a "Crear Producte" al final del formulari.

Un cop creat, seràs redirigit a la llista de productes.`,

    // Editar producte
    'howTo.editProduct': `Per editar un producte existent:

1. **Ves a la llista de productes**: Navega a \`/products\` des del menú lateral.

2. **Cerca el producte** que vols editar usant el camp de cerca o navegant per la taula.

3. **Fes clic al botó d'editar** a la fila del producte (icona de llapis) o fes clic directament al producte per veure'n els detalls.

4. **Des de la pàgina de detall**: Fes clic al botó "Editar" que apareix a la part superior.

5. **Modifica els camps** que necessitis canviar al formulari.

6. **Desa els canvis** fent clic a "Actualitzar".

**Nota**: Només pots editar productes si tens el permís "products.edit".`,

    // Escàner
    'howTo.useScanner': `Per utilitzar l'escàner a l'aplicació:

1. **Navega al mòdul d'Escàner**: Fes clic a "Escàner" al menú lateral o ves a \`/scanner\`.

2. **Tria el mode d'escaneig**:
   - **Escàner USB**: El camp d'escaneig estarà actiu automàticament. Simplement escaneja el codi i es detectarà automàticament.
   - **Càmera**: Fes clic al botó "Activar càmera" per usar la càmera del dispositiu.

3. **Després d'escanejar**:
   - Si és un codi de producte, veuràs la fitxa del producte amb opcions per veure detalls, registrar entrada o sortida.
   - Si és un codi de lot, veuràs la informació del lot i el producte associat.

4. **Accions disponibles**:
   - Veure detall del producte/lot
   - Registrar un moviment (entrada o sortida)
   - Si trobes un defecte, pots reportar-lo directament.

**Consell**: L'escàner USB es comporta com un teclat, escriu el codi i envia Enter automàticament.`,

    // Moviments
    'howTo.createMovement': `Per registrar un moviment d'inventari:

1. **Opció 1 - Des de l'escàner**:
   - Escaneja el codi del producte o lot
   - Selecciona l'acció "Registrar entrada" o "Registrar sortida"
   - Completa el formulari amb la quantitat i el motiu

2. **Opció 2 - Des de la pàgina de moviments**:
   - Navega a \`/movements\` des del menú
   - Fes clic a "Nou Moviment"
   - Selecciona el producte i, si s'aplica, el lot
   - Tria el tipus: Entrada, Sortida, Ajust o Transferència
   - Completa la quantitat i el motiu (requerit)

3. **Camps importants**:
   - **Motiu** (requerit): Explica per què es realitza el moviment
   - **Quantitat**: Nombre d'unitats
   - **Lot**: Si el producte té control per lots, selecciona el lot

**Nota**: L'estoc s'actualitza automàticament després de registrar el moviment.`,

    // Keywords para clasificación
    'keywords.howTo':
      'com, cómo, como, com fer, com crear, com utilitzar, com usar, como hacer, cómo hacer, como crear, cómo crear, como editar, cómo editar, como usar, cómo usar, como escanear, cómo escanear, com escanejar, como modificar, cómo modificar, com modificar, crear, editar, modificar, eliminar, esborrar, afegir, añadir, registrar, escanear, escanejar, escáner, escàner, pasos, passos, explicar, explicar-me, ayuda con, ajuda amb, necesito, necessito, quiero, vull',
    'keywords.dataQuery':
      'quins, quines, quin, quina, qué, que, què, quins productes, qué productos, quins productes estan, qué productos están, productes en alarma, productos en alarma, estoc baix, stock bajo, estoc actual, stock actual, informació, información, consultar, consulta, buscar, cercar, mostrar, mostrar-me, llista, lista, quant, cuánto, cuántos, quants, quantes',
    'keywords.permissions':
      'permís, permiso, permisos, permisos, puc, puedo, puc crear, puedo crear, puc editar, puedo editar, puc eliminar, puedo eliminar, puc escanear, puedo escanear, quins permisos, qué permisos, quins permisos tinc, qué permisos tengo, rol, role, rols, roles',
    'keywords.features':
      'funcionalitats, funcionalidades, característiques, características, què pot fer, qué puede hacer, què fa, qué hace, com funciona, cómo funciona, quines opcions, qué opciones, quines accions, qué acciones',

    // Resposta general
    'howTo.general': `Puc ajudar-te amb diverses tasques a l'aplicació:

**Gestió de Productes**:
- Crear, editar i veure productes
- Cercar productes per codi o nom

**Escàner**:
- Utilitzar escàner USB o càmera
- Escanejar codis de barres i QR

**Moviments**:
- Registrar entrades i sortides
- Veure historial de moviments

**Informes**:
- Exportar dades a Excel
- Veure alarmes d'estoc

Sobre quina funcionalitat específica t'agradaria saber més?`,

    // Consultes de dades
    'dataQuery.noAlarms':
      'No hi ha productes en alarma actualment. Tots els productes tenen estoc suficient.',
    'dataQuery.alarmsFound': "He trobat {count} producte(s) en alarma d'estoc:\n\n",
    'dataQuery.moreAlarms':
      "\n... i {count} producte(s) més. Pots veure'ls tots a la pàgina d'Alarmes.",
    'dataQuery.productNotFound':
      'No s\'ha trobat cap producte amb el codi "{code}". Verifica que el codi sigui correcte.',
    'dataQuery.generic': `Puc ajudar-te a consultar:

- Productes en alarma d'estoc
- Informació d'un producte per codi
- Llista de productes

Exemples de preguntes:
- Quins productes estan en alarma?
- Quin és l'estoc del producte amb codi ABC-123?
- Mostra productes amb estoc baix`,

    // Permisos
    'permissions.hasPermission': 'Sí, tens permís per "{desc}" ({key}).',
    'permissions.noPermission':
      'No, no tens permís per "{desc}".\n\nAquest permís està disponible per als rols: {roles}.',
    'permissions.currentRole': '\n\nEl teu rol actual és: {role}.',
    'permissions.contactAdmin':
      '\n\nContacta amb un administrador si necessites aquest permís.',
    'permissions.askSpecific':
      'Per saber quins permisos tens, puc ajudar-te. Quina acció específica vols realitzar? Per exemple: "Puc crear productes?" o "Puc utilitzar l\'escàner?"',
    'permissions.list':
      'El teu rol actual és: {role}.\n\nTens els següents permisos:\n{permissions}',

    // Resposta de benvinguda
    'general.welcome': `Hola, sóc el teu assistent d'IA. Puc ajudar-te amb:

- **Com utilitzar l'aplicació**: Explicar-te pas a pas com realitzar accions
- **Consultar dades**: Buscar informació sobre productes, lots, moviments
- **Permisos**: Explicar-te què pots fer segons el teu rol
- **Funcionalitats**: Mostrar-te quines característiques estan disponibles

En què et puc ajudar específicament?`,

    // Permís denegat
    'permissionDenied.message':
      'No pots {action} perquè no tens el permís necessari.\n\n**Permís requerit**: {permission}\n**Descripció**: {desc}\n**El teu rol actual**: {role}\n**Rols permessos**: {allowedRoles}\n\nContacta amb un administrador si necessites accés a aquesta funcionalitat.',
  },
};

/**
 * Obtiene una traducción de respuesta con soporte para parámetros
 */
export function getAiResponse(
  language: LanguageCode,
  key: string,
  params?: Record<string, string | number>,
): string {
  const translations = aiResponses[language];
  let template = translations[key];

  if (!template) {
    // Fallback a español si no existe la traducción
    template = aiResponses['es-ES'][key] || key;
  }

  if (!params) {
    return template;
  }

  // Reemplazar placeholders {key} con valores
  let result = template;
  for (const [paramKey, value] of Object.entries(params)) {
    const placeholder = `{${paramKey}}`;
    if (typeof value === 'string') {
      result = result.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        value,
      );
    } else if (Array.isArray(value)) {
      result = result.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        value.join(', '),
      );
    } else {
      result = result.replace(
        new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
        String(value),
      );
    }
  }

  return result;
}
