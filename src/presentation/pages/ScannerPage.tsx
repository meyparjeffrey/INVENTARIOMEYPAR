/**
 * Página de escáner para búsqueda rápida de productos.
 *
 * Permite escanear códigos de barras o códigos QR para buscar productos.
 * Cuando encuentra un producto, muestra opciones para:
 * - Ver detalle del producto
 * - Añadir un movimiento (entrada/salida/ajuste)
 *
 * Funcionalidades:
 * - Soporte para escáner USB (modo HID Keyboard) con foco permanente
 * - Historial persistente en localStorage (24 horas)
 * - Feedback sonoro y vibración (configurable)
 * - Atajos de teclado (V=Ver, M=Movimiento, Esc=Limpiar)
 * - Estadísticas en tiempo real (escaneos hoy, encontrados, no encontrados)
 * - Indicador visual de "listo para escanear"
 * - Detección automática de entrada rápida (escáner USB vs escritura manual)
 *
 * Preparado para Windows con detección automática de escáneres USB físicos.
 *
 * @module @presentation/pages/ScannerPage
 * @requires @presentation/hooks/useProducts
 * @requires @presentation/hooks/useMovements
 * @requires @presentation/components/movements/MovementForm
 * @requires @presentation/context/AuthContext
 */
import {
  ScanLine,
  Package,
  Search,
  Check,
  X,
  AlertTriangle,
  Eye,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, MovementType, MovementReasonCategory } from '@domain/entities';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useMovements } from '../hooks/useMovements';
import { MovementForm } from '../components/movements/MovementForm';
import { cn } from '../lib/cn';
import { highlightText } from '../utils/highlightText';
import { parseScannedValue } from '../utils/parseScannedValue';

/**
 * Resultado de un escaneo con timestamp para persistencia.
 */
interface ScanResult {
  type: 'product' | 'batch' | 'not_found';
  product?: Product;
  batchCode?: string;
  scannedCode?: string;
  timestamp: number; // Unix timestamp en ms
}

/**
 * Estructura de datos guardada en localStorage.
 */
interface StoredScanHistory {
  scans: ScanResult[];
  userId: string;
  lastCleanup: number;
  stats: {
    totalToday: number;
    foundToday: number;
    notFoundToday: number;
    lastReset: number; // Timestamp del último reset (medianoche)
  };
}

/**
 * Estadísticas del día actual.
 */
interface TodayStats {
  total: number;
  found: number;
  notFound: number;
}

/**
 * Página de escáner mejorada con todas las funcionalidades profesionales.
 */
export function ScannerPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { authContext } = useAuth();
  const { findByCode, getAll: getAllProducts } = useProducts();
  const { recordMovement } = useMovements();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const [scanValue, setScanValue] = React.useState('');
  const scanValueRef = React.useRef('');
  const [lastScan, setLastScan] = React.useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = React.useState<ScanResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const searchingRef = React.useRef(false);
  const [isMovementFormOpen, setIsMovementFormOpen] = React.useState(false);
  const [selectedProductForMovement, setSelectedProductForMovement] =
    React.useState<Product | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [todayStats, setTodayStats] = React.useState<TodayStats>({
    total: 0,
    found: 0,
    notFound: 0,
  });

  // Obtener configuración del usuario
  const scannerSoundEnabled = authContext?.settings?.scannerSoundEnabled ?? true;
  const scannerVibrationEnabled = authContext?.settings?.scannerVibrationEnabled ?? false;
  const userId = authContext?.profile?.id || 'anonymous';

  // Detección de escáner USB (HID): entrada muy rápida sin pulsar Enter.
  const scanTimingRef = React.useRef<{ firstAt: number | null; lastAt: number | null }>({
    firstAt: null,
    lastAt: null,
  });
  const autoScanTimerRef = React.useRef<number | null>(null);
  const pendingScanRef = React.useRef<string | null>(null);
  const lastInputAtRef = React.useRef<number>(0);

  React.useEffect(() => {
    scanValueRef.current = scanValue;
  }, [scanValue]);

  React.useEffect(() => {
    searchingRef.current = searching;
  }, [searching]);

  /**
   * Genera un beep usando Web Audio API.
   *
   * @param type - Tipo de beep: 'success' (800Hz) o 'error' (400Hz)
   */
  const playBeepSound = React.useCallback(
    (type: 'success' | 'error') => {
      if (!scannerSoundEnabled) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass =
          window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configurar frecuencia y duración según el tipo
        oscillator.frequency.value = type === 'success' ? 800 : 400;
        oscillator.type = 'sine';

        // Configurar volumen (fade in/out suave)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + (type === 'success' ? 0.1 : 0.2),
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + (type === 'success' ? 0.1 : 0.2));
      } catch (error) {
        // Silenciar errores de audio (puede fallar en algunos navegadores)
        console.warn('[Scanner] Error reproduciendo sonido:', error);
      }
    },
    [scannerSoundEnabled],
  );

  /**
   * Reproduce vibración si está disponible y habilitada.
   *
   * @param type - Tipo de vibración: 'success' o 'error'
   */
  const playVibration = React.useCallback(
    (type: 'success' | 'error') => {
      if (!scannerVibrationEnabled || !navigator.vibrate) return;

      try {
        if (type === 'success') {
          navigator.vibrate(200);
        } else {
          navigator.vibrate([100, 50, 100]);
        }
      } catch (error) {
        // Silenciar errores de vibración
        console.warn('[Scanner] Error en vibración:', error);
      }
    },
    [scannerVibrationEnabled],
  );

  /**
   * Carga el historial desde localStorage.
   */
  const loadScanHistory = React.useCallback((): ScanResult[] => {
    try {
      const key = `scanner_history_${userId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const data: StoredScanHistory = JSON.parse(stored);
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Filtrar escaneos más antiguos de 24 horas
      const validScans = data.scans.filter((scan) => now - scan.timestamp < oneDayMs);

      // Limpiar si hay escaneos antiguos
      if (validScans.length !== data.scans.length) {
        const cleaned: StoredScanHistory = {
          ...data,
          scans: validScans,
          lastCleanup: now,
        };
        localStorage.setItem(key, JSON.stringify(cleaned));
      }

      // Calcular estadísticas del día
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayScans = validScans.filter((scan) => scan.timestamp >= todayStart);
      const stats: TodayStats = {
        total: todayScans.length,
        found: todayScans.filter((s) => s.type === 'product').length,
        notFound: todayScans.filter((s) => s.type === 'not_found').length,
      };
      setTodayStats(stats);

      return validScans.slice(0, 10); // Mostrar solo los últimos 10
    } catch (error) {
      console.warn('[Scanner] Error cargando historial:', error);
      return [];
    }
  }, [userId]);

  /**
   * Guarda el historial en localStorage.
   */
  const saveScanHistory = React.useCallback(
    (newScan: ScanResult) => {
      try {
        const key = `scanner_history_${userId}`;
        const stored = localStorage.getItem(key);
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        let data: StoredScanHistory;
        if (stored) {
          data = JSON.parse(stored);
          // Limpiar escaneos antiguos
          data.scans = data.scans.filter((scan) => now - scan.timestamp < oneDayMs);
        } else {
          data = {
            scans: [],
            userId,
            lastCleanup: now,
            stats: {
              totalToday: 0,
              foundToday: 0,
              notFoundToday: 0,
              lastReset: now,
            },
          };
        }

        // Añadir nuevo escaneo
        data.scans = [newScan, ...data.scans].slice(0, 100); // Máximo 100 escaneos
        data.lastCleanup = now;

        // Actualizar estadísticas del día
        const todayStart = new Date().setHours(0, 0, 0, 0);
        const todayScans = data.scans.filter((scan) => scan.timestamp >= todayStart);
        data.stats = {
          totalToday: todayScans.length,
          foundToday: todayScans.filter((s) => s.type === 'product').length,
          notFoundToday: todayScans.filter((s) => s.type === 'not_found').length,
          lastReset: todayStart,
        };

        localStorage.setItem(key, JSON.stringify(data));

        // Actualizar estadísticas en estado
        setTodayStats({
          total: data.stats.totalToday,
          found: data.stats.foundToday,
          notFound: data.stats.notFoundToday,
        });
      } catch (error) {
        console.warn('[Scanner] Error guardando historial:', error);
      }
    },
    [userId],
  );

  /**
   * Limpia el historial manualmente.
   */
  const clearHistory = React.useCallback(() => {
    try {
      const key = `scanner_history_${userId}`;
      localStorage.removeItem(key);
      setScanHistory([]);
      setTodayStats({ total: 0, found: 0, notFound: 0 });
    } catch (error) {
      console.warn('[Scanner] Error limpiando historial:', error);
    }
  }, [userId]);

  /**
   * Formatea un timestamp como tiempo relativo ("Hace X minutos").
   */
  const formatTimeAgo = React.useCallback(
    (timestamp: number): string => {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return t('scanner.timeAgo.justNow') || 'Ahora mismo';
      if (minutes < 60)
        return t('scanner.timeAgo.minutes', { count: minutes }) || `Hace ${minutes} min`;
      if (hours < 24)
        return t('scanner.timeAgo.hours', { count: hours }) || `Hace ${hours} h`;
      return t('scanner.timeAgo.days', { count: days }) || `Hace ${days} días`;
    },
    [t],
  );

  // Cargar historial al montar
  React.useEffect(() => {
    const history = loadScanHistory();
    setScanHistory(history);
  }, [loadScanHistory]);

  // Mantener foco en el input (preparado para escáner USB)
  React.useEffect(() => {
    const focusInput = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
        setIsFocused(true);
      }
    };

    focusInput();

    // Re-enfocar cada segundo si perdemos el foco
    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current) {
        focusInput();
      }
    }, 1000);

    // También re-enfocar cuando la ventana recupera el foco
    window.addEventListener('focus', focusInput);
    window.addEventListener('blur', () => setIsFocused(false));

    // Detectar foco en el input
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', focusInput);
      window.removeEventListener('blur', () => setIsFocused(false));
      if (input) {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      }
    };
  }, []);

  // Cargar productos cuando se abre el formulario de movimiento
  React.useEffect(() => {
    if (isMovementFormOpen) {
      getAllProducts({})
        .then((prods) => {
          setProducts(prods);
        })
        .catch(() => {
          // Error silencioso
        });
    }
  }, [isMovementFormOpen, getAllProducts]);

  /**
   * Procesa un código escaneado buscando el producto en la base de datos.
   *
   * Usa findByCodeOrBarcode del repositorio para buscar directamente en Supabase.
   * Incluye feedback sonoro/vibración y guarda en historial persistente.
   */
  const processBarcode = React.useCallback(
    async (barcode: string) => {
      if (!barcode.trim()) return;

      setSearching(true);
      const parsed = parseScannedValue(barcode);
      const scannedCode = parsed.raw;
      const lookupKey = parsed.lookupKey;
      const timestamp = Date.now();

      // DEBUG: log para diagnosticar problemas de escáner
      // eslint-disable-next-line no-console
      console.log('[ScannerPage] processBarcode:', {
        barcodeInput: barcode,
        barcodeLength: barcode.length,
        parsedRaw: scannedCode,
        lookupKey,
        lookupKeyLength: lookupKey.length,
      });

      try {
        // Buscar producto usando el repositorio (búsqueda directa en BD)
        // eslint-disable-next-line no-console
        console.log(
          '[ScannerPage] Buscando producto con lookupKey:',
          JSON.stringify(lookupKey),
        );
        const product = await findByCode(lookupKey);
        // eslint-disable-next-line no-console
        console.log(
          '[ScannerPage] Resultado de búsqueda:',
          product ? `Encontrado: ${product.code}` : 'No encontrado',
        );

        if (product) {
          const result: ScanResult = {
            type: 'product',
            product,
            scannedCode,
            timestamp,
          };
          setLastScan(result);
          setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
          saveScanHistory(result);
          setScanValue('');

          // Feedback sonoro y vibración
          playBeepSound('success');
          playVibration('success');
        } else {
          // No encontrado
          const result: ScanResult = {
            type: 'not_found',
            scannedCode,
            timestamp,
          };
          setLastScan(result);
          setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
          saveScanHistory(result);
          setScanValue('');

          // Feedback sonoro y vibración
          playBeepSound('error');
          playVibration('error');
        }
      } catch {
        // Error en la búsqueda
        const result: ScanResult = {
          type: 'not_found',
          scannedCode,
          timestamp,
        };
        setLastScan(result);
        setScanHistory((prev) => [result, ...prev.slice(0, 9)]);
        saveScanHistory(result);
        setScanValue('');

        // Feedback sonoro y vibración
        playBeepSound('error');
        playVibration('error');
      } finally {
        setSearching(false);
        // Re-enfocar el campo para siguiente escaneo
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    },
    [findByCode, saveScanHistory, playBeepSound, playVibration],
  );

  /**
   * Abre el formulario de movimiento con el producto preseleccionado.
   */
  const handleAddMovement = React.useCallback((product: Product) => {
    setSelectedProductForMovement(product);
    setIsMovementFormOpen(true);
  }, []);

  /**
   * Maneja la entrada de texto.
   */
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setScanValue(value);
      scanValueRef.current = value;

      const now = Date.now();
      lastInputAtRef.current = now;

      // Reset si se vacía
      if (!value.trim()) {
        scanTimingRef.current.firstAt = null;
        scanTimingRef.current.lastAt = null;
        if (autoScanTimerRef.current) {
          window.clearTimeout(autoScanTimerRef.current);
          autoScanTimerRef.current = null;
        }
        return;
      }

      if (scanTimingRef.current.firstAt === null) scanTimingRef.current.firstAt = now;
      scanTimingRef.current.lastAt = now;

      // Auto-búsqueda si parece entrada de escáner (muy rápida) aunque no envíe Enter.
      if (autoScanTimerRef.current) window.clearTimeout(autoScanTimerRef.current);
      autoScanTimerRef.current = window.setTimeout(() => {
        autoScanTimerRef.current = null;
        const current = scanValueRef.current.trim();
        if (!current) return;

        const firstAt = scanTimingRef.current.firstAt ?? now;
        const lastAt = scanTimingRef.current.lastAt ?? now;
        const durationMs = Math.max(0, lastAt - firstAt);
        const chars = current.length;

        const hasLikelySeparator =
          /[|｜∣º°¦│┃︱ǀÇç]/.test(current) || current.includes(' ');
        const looksLikeScanner =
          (chars >= 6 && durationMs > 0 && durationMs <= 300) ||
          (chars >= 12 && durationMs > 0 && durationMs <= 800);

        // Si no parece escáner, no auto-ejecutar (para que escribir manualmente no dispare búsquedas).
        if (!looksLikeScanner && !hasLikelySeparator) return;

        if (searchingRef.current) {
          pendingScanRef.current = current;
          scanTimingRef.current.firstAt = null;
          scanTimingRef.current.lastAt = null;
          return;
        }

        // Ejecutar búsqueda automáticamente
        scanTimingRef.current.firstAt = null;
        scanTimingRef.current.lastAt = null;
        processBarcode(current);
      }, 140);
    },
    [processBarcode],
  );

  // Si llega un segundo escaneo mientras estamos buscando, lo procesamos al terminar.
  React.useEffect(() => {
    if (searching) return;
    const pending = pendingScanRef.current;
    if (!pending) return;
    pendingScanRef.current = null;
    void processBarcode(pending);
  }, [searching, processBarcode]);

  /**
   * Maneja las teclas presionadas, incluyendo Enter y atajos de teclado.
   */
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter: Procesar escaneo
      if (e.key === 'Enter' && scanValue.trim() && !searching) {
        e.preventDefault();
        if (autoScanTimerRef.current) {
          window.clearTimeout(autoScanTimerRef.current);
          autoScanTimerRef.current = null;
        }
        scanTimingRef.current.firstAt = null;
        scanTimingRef.current.lastAt = null;
        processBarcode(scanValue.trim());
        return;
      }

      // Escape: Limpiar campo y último resultado
      if (e.key === 'Escape') {
        e.preventDefault();
        setScanValue('');
        setLastScan(null);
        inputRef.current?.focus();
        return;
      }

      // Evitar que el escáner dispare atajos (V/M) por caracteres del propio código.
      // Solo permitimos atajos si el usuario mantiene ALT.
      const recentTypingMs = Date.now() - (lastInputAtRef.current || 0);
      if (!e.altKey || recentTypingMs < 300) return;

      // Atajos de teclado solo si hay un último escaneo exitoso
      if (!lastScan || lastScan.type !== 'product' || !lastScan.product) return;

      // V: Ver producto
      if (e.key === 'V' || e.key === 'v') {
        e.preventDefault();
        navigate(`/products/${lastScan.product.id}`);
        return;
      }

      // M: Añadir movimiento
      if (e.key === 'M' || e.key === 'm') {
        e.preventDefault();
        handleAddMovement(lastScan.product);
        return;
      }
    },
    [scanValue, searching, lastScan, navigate, processBarcode, handleAddMovement],
  );

  /**
   * Maneja la búsqueda manual (botón "Buscar").
   */
  const handleManualSearch = React.useCallback(() => {
    if (scanValue.trim() && !searching) {
      processBarcode(scanValue.trim());
    }
  }, [scanValue, searching, processBarcode]);

  /**
   * Maneja el envío del formulario de movimiento.
   */
  const handleMovementSubmit = React.useCallback(
    async (data: {
      productId: string;
      movementType: MovementType;
      quantity: number;
      requestReason: string;
      reasonCategory?: MovementReasonCategory;
      comments?: string;
      referenceDocument?: string;
    }) => {
      await recordMovement(data);
      setIsMovementFormOpen(false);
      setSelectedProductForMovement(null);
      // Re-enfocar el campo después de cerrar el formulario
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    [recordMovement],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
          <ScanLine className="h-7 w-7 text-primary-600" />
          {t('scanner.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('scanner.subtitle')}
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('scanner.stats.total') || 'Escaneos hoy'}
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {todayStats.total}
          </div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="text-sm text-green-700 dark:text-green-400">
            {t('scanner.stats.found') || 'Encontrados'}
          </div>
          <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-400">
            {todayStats.found}
          </div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="text-sm text-red-700 dark:text-red-400">
            {t('scanner.stats.notFound') || 'No encontrados'}
          </div>
          <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400">
            {todayStats.notFound}
          </div>
        </div>
      </div>

      {/* Campo de escaneo principal */}
      <div className="rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 p-8 dark:border-primary-700 dark:bg-primary-900/20">
        <div className="flex flex-col items-center gap-4">
          {/* Indicador de estado "Listo" - Mejorado para mayor visibilidad */}
          <div
            className={cn(
              'flex items-center gap-3 rounded-full px-4 py-2 transition-all duration-300',
              isFocused
                ? 'bg-green-100 border-2 border-green-500 shadow-lg shadow-green-500/30 dark:bg-green-900/40 dark:border-green-400'
                : 'bg-red-50 border-2 border-red-300 dark:bg-red-900/20 dark:border-red-700',
            )}
          >
            {isFocused ? (
              <>
                <div className="relative">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  {t('scanner.ready') || 'Listo para escanear'}
                </span>
              </>
            ) : (
              <>
                <Circle className="h-5 w-5 text-red-500 dark:text-red-400" />
                <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {t('scanner.notReady') || 'Campo sin foco'}
                </span>
              </>
            )}
          </div>

          <div className="relative">
            {searching ? (
              <Loader2 className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 animate-spin text-primary-500" />
            ) : (
              <ScanLine className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-primary-500" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={scanValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={searching ? t('scanner.searching') : t('scanner.placeholder')}
              className={cn(
                'h-16 w-96 rounded-xl border-2 bg-white pl-14 pr-4 text-xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-50 transition-all duration-300',
                isFocused
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500/30 shadow-lg shadow-green-500/20'
                  : 'border-red-300 focus:border-red-400 focus:ring-red-500/20 dark:border-red-700',
              )}
              autoComplete="off"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searching ? t('scanner.searching') : t('scanner.instructions')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSearch}
            disabled={!scanValue.trim() || searching}
            className="gap-2"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {t('scanner.manualSearch')}
          </Button>
        </div>
      </div>

      {/* Resultado del último escaneo */}
      {lastScan && (
        <div
          className={cn(
            'rounded-lg border p-4',
            lastScan.type === 'not_found'
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
          )}
        >
          <div className="flex items-center gap-4">
            {lastScan.type === 'not_found' ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {t('scanner.notFound')}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500">
                    {t('scanner.notFoundDesc')}
                  </p>
                  {lastScan.scannedCode && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                      {t('scanner.scannedCode') || 'Código escaneado'}:{' '}
                      {lastScan.scannedCode}
                    </p>
                  )}
                </div>
              </>
            ) : lastScan.product ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {t('scanner.productFound')}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {highlightText(lastScan.product.name, lastScan.scannedCode || '')}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {highlightText(lastScan.product.code, lastScan.scannedCode || '')} ·
                    Stock: {lastScan.product.stockCurrent}
                    {lastScan.product.stockCurrent <= lastScan.product.stockMin && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" />
                        {t('products.alarm')}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {formatTimeAgo(lastScan.timestamp)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/products/${lastScan.product!.id}`)}
                    className="gap-2"
                    title={t('scanner.shortcuts.view') || 'Atajo: V'}
                  >
                    <Eye className="h-4 w-4" />
                    {t('scanner.viewProduct')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddMovement(lastScan.product!)}
                    className="gap-2"
                    title={t('scanner.shortcuts.movement') || 'Atajo: M'}
                  >
                    <Plus className="h-4 w-4" />
                    {t('scanner.addMovement')}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Historial de escaneos */}
      {scanHistory.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-gray-50">
              {t('scanner.history')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Trash2 className="h-4 w-4" />
              {t('scanner.clearHistory') || 'Limpiar'}
            </Button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {scanHistory.slice(0, 10).map((scan, index) => (
              <div
                key={`${scan.timestamp}-${index}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                {scan.type === 'not_found' ? (
                  <>
                    <X className="h-5 w-5 text-red-500" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('scanner.notFound')}
                      </span>
                      {scan.scannedCode && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          ({scan.scannedCode})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(scan.timestamp)}
                    </span>
                  </>
                ) : scan.product ? (
                  <>
                    <Package className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-gray-50">
                        {highlightText(scan.product.name, scan.scannedCode || scanValue)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {highlightText(scan.product.code, scan.scannedCode || scanValue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTimeAgo(scan.timestamp)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/products/${scan.product!.id}`)}
                          className="gap-1 h-7 px-2"
                          title={t('scanner.viewProduct')}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddMovement(scan.product!)}
                          className="gap-1 h-7 px-2"
                          title={t('scanner.addMovement')}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-50">
          {t('scanner.howToUse')}
        </h3>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <li>• {t('scanner.tip1')}</li>
          <li>• {t('scanner.tip2')}</li>
          <li>• {t('scanner.tip3')}</li>
          {lastScan && lastScan.type === 'product' && (
            <>
              <li>• {t('scanner.tip4') || 'Presiona V para ver el producto'}</li>
              <li>• {t('scanner.tip5') || 'Presiona M para añadir movimiento'}</li>
            </>
          )}
          <li>• {t('scanner.tip6') || 'Presiona Esc para limpiar'}</li>
        </ul>
      </div>

      {/* Formulario de movimiento */}
      <MovementForm
        isOpen={isMovementFormOpen}
        onClose={() => {
          setIsMovementFormOpen(false);
          setSelectedProductForMovement(null);
          // Re-enfocar el campo después de cerrar
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }}
        onSubmit={handleMovementSubmit}
        products={products}
        preselectedProduct={selectedProductForMovement || undefined}
        preselectedMovementType={authContext?.settings?.defaultMovementType}
      />
    </div>
  );
}
