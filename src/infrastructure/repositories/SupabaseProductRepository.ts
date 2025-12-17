import type {
  BatchDefectReport,
  Product,
  ProductBatch,
  ProductLocation,
  ProductStockByWarehouse,
} from '@domain/entities';
import type {
  BatchFilters,
  CreateBatchInput,
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateBatchInput,
  UpdateProductInput,
} from '@domain/repositories/ProductRepository';
import type { PaginationParams } from '@domain/repositories/types';
import { BaseSupabaseRepository } from './BaseSupabaseRepository';
import { buildPagination, toPaginatedResult } from './pagination';
import { processSearchTerm } from './searchUtils';

type ProductRow = {
  id: string;
  code: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  stock_current: number;
  stock_min: number;
  stock_max: number | null;
  aisle: string;
  shelf: string;
  location_extra: string | null;
  warehouse: string | null;
  cost_price: number;
  sale_price: number | null;
  purchase_url: string | null;
  image_url: string | null;
  supplier_code: string | null; // Código de Proveedor
  is_active: boolean;
  is_batch_tracked: boolean;
  unit_of_measure: string | null;
  weight_kg: number | null;
  dimensions_cm: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string; // Fecha de modificación
  created_by: string | null;
  updated_by: string | null; // Usuario que hizo la modificación
  created_by_profile?:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | { first_name: string | null; last_name: string | null }[];
  updated_by_profile?:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | { first_name: string | null; last_name: string | null }[];
};

type BatchRow = {
  id: string;
  product_id: string;
  supplier_id: string | null;
  batch_code: string;
  batch_barcode: string | null;
  quantity_total: number;
  quantity_available: number;
  quantity_reserved: number;
  defective_qty: number;
  status: ProductBatch['status'];
  blocked_reason: string | null;
  quality_score: number;
  received_at: string;
  expiry_date: string | null;
  manufacture_date: string | null;
  cost_per_unit: number | null;
  location_override: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

type DefectRow = {
  id: string;
  batch_id: string;
  reported_by: string | null;
  defect_type: BatchDefectReport['defectType'];
  affected_quantity: number;
  severity: BatchDefectReport['severity'];
  description: string | null;
  images: string[] | null;
  resolution_status: BatchDefectReport['resolutionStatus'];
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

type ProductLocationRow = {
  id: string;
  product_id: string;
  warehouse: string;
  aisle: string;
  shelf: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type ProductStockByWarehouseRow = {
  id: string;
  product_id: string;
  warehouse: string;
  quantity: number;
  location_aisle: string | null;
  location_shelf: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

const parseDimensions = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const mapLocation = (row: ProductLocationRow): ProductLocation => ({
  id: row.id,
  productId: row.product_id,
  warehouse: row.warehouse as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
  aisle: row.aisle,
  shelf: row.shelf,
  isPrimary: row.is_primary,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
});

const mapStockByWarehouse = (
  row: ProductStockByWarehouseRow,
): ProductStockByWarehouse => ({
  id: row.id,
  productId: row.product_id,
  warehouse: row.warehouse as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
  quantity: row.quantity,
  locationAisle: row.location_aisle,
  locationShelf: row.location_shelf,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
});

const mapProduct = (
  row: ProductRow,
  locations?: ProductLocationRow[],
  stocksByWarehouse?: ProductStockByWarehouseRow[],
): Product => ({
  id: row.id,
  // Si code está vacío o es "-", usar notes como código
  code:
    row.code && row.code.trim() !== '' && row.code !== '-' ? row.code : row.notes || '-',
  barcode: row.barcode,
  name: row.name,
  description: row.description,
  category: row.category,
  stockCurrent: row.stock_current,
  stockMin: row.stock_min,
  stockMax: row.stock_max,
  aisle: row.aisle,
  shelf: row.shelf,
  locations:
    locations && Array.isArray(locations) ? locations.map(mapLocation) : undefined,
  locationExtra: row.location_extra,
  warehouse: (row.warehouse as 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA') || undefined,
  stocksByWarehouse:
    stocksByWarehouse && Array.isArray(stocksByWarehouse)
      ? stocksByWarehouse.map(mapStockByWarehouse)
      : undefined,
  costPrice: row.cost_price,
  salePrice: row.sale_price,
  purchaseUrl: row.purchase_url,
  imageUrl: row.image_url,
  supplierCode: row.supplier_code, // Código de Proveedor
  isActive: row.is_active,
  isBatchTracked: row.is_batch_tracked,
  unitOfMeasure: row.unit_of_measure,
  weightKg: row.weight_kg,
  dimensionsCm: parseDimensions(row.dimensions_cm),
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at, // Fecha de modificación
  createdBy: row.created_by,
  updatedBy: row.updated_by, // Usuario que hizo la modificación
  createdByProfile: row.created_by_profile
    ? Array.isArray(row.created_by_profile)
      ? {
          firstName: row.created_by_profile[0]?.first_name ?? null,
          lastName: row.created_by_profile[0]?.last_name ?? null,
        }
      : {
          firstName: row.created_by_profile.first_name ?? null,
          lastName: row.created_by_profile.last_name ?? null,
        }
    : undefined,
  updatedByProfile: row.updated_by_profile
    ? Array.isArray(row.updated_by_profile)
      ? {
          firstName: row.updated_by_profile[0]?.first_name ?? null,
          lastName: row.updated_by_profile[0]?.last_name ?? null,
        }
      : {
          firstName: row.updated_by_profile.first_name ?? null,
          lastName: row.updated_by_profile.last_name ?? null,
        }
    : undefined,
});

const mapBatch = (row: BatchRow): ProductBatch => ({
  id: row.id,
  productId: row.product_id,
  supplierId: row.supplier_id,
  batchCode: row.batch_code,
  batchBarcode: row.batch_barcode,
  quantityTotal: row.quantity_total,
  quantityAvailable: row.quantity_available,
  quantityReserved: row.quantity_reserved,
  defectiveQty: row.defective_qty,
  status: row.status,
  blockedReason: row.blocked_reason,
  qualityScore: row.quality_score,
  receivedAt: row.received_at,
  expiryDate: row.expiry_date,
  manufactureDate: row.manufacture_date,
  costPerUnit: row.cost_per_unit,
  locationOverride: row.location_override,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by ?? undefined,
});

const mapDefect = (row: DefectRow): BatchDefectReport => ({
  id: row.id,
  batchId: row.batch_id,
  reportedBy: row.reported_by,
  defectType: row.defect_type,
  affectedQuantity: row.affected_quantity,
  severity: row.severity,
  description: row.description,
  images: row.images ?? [],
  resolutionStatus: row.resolution_status,
  resolutionNotes: row.resolution_notes,
  resolvedAt: row.resolved_at,
  resolvedBy: row.resolved_by,
  createdAt: row.created_at,
});

export class SupabaseProductRepository
  extends BaseSupabaseRepository
  implements ProductRepository
{
  async list(filters?: ProductFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from('products')
      .select(
        `*,
        created_by_profile:profiles!products_created_by_fkey(first_name, last_name),
        updated_by_profile:profiles!products_updated_by_fkey(first_name, last_name)
      `,
        { count: 'exact' },
      )
      .order('name', { ascending: true });

    if (!filters?.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (typeof filters?.isBatchTracked === 'boolean') {
      query = query.eq('is_batch_tracked', filters.isBatchTracked);
    }

    // Filtros por rango de stock
    if (filters?.stockMin !== undefined) {
      query = query.gte('stock_current', filters.stockMin);
    }
    if (filters?.stockMax !== undefined) {
      query = query.lte('stock_current', filters.stockMax);
    }

    // Filtros por rango de precio (cost_price)
    if (filters?.priceMin !== undefined) {
      query = query.gte('cost_price', filters.priceMin);
    }
    if (filters?.priceMax !== undefined) {
      query = query.lte('cost_price', filters.priceMax);
    }

    // Filtro por código de proveedor
    if (filters?.supplierCode) {
      query = query.ilike('supplier_code', `%${filters.supplierCode}%`);
    }

    // Filtro por almacén y/o ubicación: buscar en product_locations
    // IMPORTANTE: Cuando hay múltiples filtros (warehouse Y aisle), deben cumplirse TODOS en la MISMA ubicación
    let productIdsFromLocations: string[] = [];

    if (filters?.warehouse || filters?.aisle || filters?.shelf) {
      const locationQuery = this.client.from('product_locations').select('product_id');

      // Aplicar TODOS los filtros como condiciones AND en la misma query
      // Esto asegura que solo se encuentren ubicaciones que cumplan TODAS las condiciones
      if (filters.warehouse) {
        locationQuery.eq('warehouse', filters.warehouse);
      }
      if (filters.aisle) {
        // Usar comparación exacta (eq) para valores específicos del select
        // Esto evita que "1" encuentre "10", "11", "15", etc.
        // Solo usar ilike si el valor contiene caracteres especiales o es una búsqueda parcial
        const aisleValue = filters.aisle.trim();
        // Si es un número simple (1-30) o un valor exacto, usar eq
        // Si contiene caracteres especiales o es una búsqueda parcial, usar ilike
        if (/^\d+$/.test(aisleValue) || aisleValue.length <= 3) {
          // Valor exacto: usar eq para búsqueda precisa
          locationQuery.eq('aisle', aisleValue);
        } else {
          // Búsqueda parcial: usar ilike
          locationQuery.ilike('aisle', `%${aisleValue}%`);
        }
      }
      if (filters.shelf) {
        // Usar comparación exacta (eq) para valores específicos del select (A-G)
        // Esto evita que "A" encuentre "A1", "A2", etc.
        const shelfValue = filters.shelf.trim();
        // Si es una letra única (A-G) o un valor exacto corto, usar eq
        if (/^[A-G]$/i.test(shelfValue) || shelfValue.length === 1) {
          // Valor exacto: usar eq para búsqueda precisa
          locationQuery.eq('shelf', shelfValue);
        } else {
          // Búsqueda parcial: usar ilike
          locationQuery.ilike('shelf', `%${shelfValue}%`);
        }
      }

      const { data: locationProducts } = await locationQuery;
      if (locationProducts) {
        // Obtener IDs únicos de productos que tienen ubicaciones que cumplen TODAS las condiciones
        productIdsFromLocations = [
          ...new Set(locationProducts.map((lp: { product_id: string }) => lp.product_id)),
        ];
      }
    }

    // Si hay filtros de ubicación, también buscar en la tabla products (compatibilidad con datos antiguos)
    let productIdsFromProducts: string[] = [];
    if ((filters?.aisle || filters?.shelf) && !filters?.warehouse) {
      const productsQuery = this.client.from('products').select('id');
      if (filters.aisle) {
        productsQuery.ilike('aisle', `%${filters.aisle}%`);
      }
      if (filters.shelf) {
        productsQuery.ilike('shelf', `%${filters.shelf}%`);
      }

      const { data: productsData } = await productsQuery;
      if (productsData) {
        productIdsFromProducts = productsData.map((p: { id: string }) => p.id);
      }
    }

    // Combinar IDs de ambas fuentes
    if (productIdsFromLocations.length > 0 || productIdsFromProducts.length > 0) {
      const allProductIds = [
        ...new Set([...productIdsFromLocations, ...productIdsFromProducts]),
      ];
      if (allProductIds.length > 0) {
        query = query.in('id', allProductIds);
      } else {
        // No hay coincidencias
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    } else if (filters?.warehouse) {
      // Solo filtro de almacén sin ubicación específica: buscar en product_locations
      const locationQuery = this.client
        .from('product_locations')
        .select('product_id')
        .eq('warehouse', filters.warehouse);

      const { data: locationProducts } = await locationQuery;
      if (locationProducts && locationProducts.length > 0) {
        const productIds = locationProducts.map(
          (lp: { product_id: string }) => lp.product_id,
        );
        query = query.in('id', productIds);
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    // Filtro por rango de stock mínimo
    if (filters?.stockMinMin !== undefined) {
      query = query.gte('stock_min', filters.stockMinMin);
    }
    if (filters?.stockMinMax !== undefined) {
      query = query.lte('stock_min', filters.stockMinMax);
    }

    // Filtros por fecha de creación
    // Lógica:
    // - Si hay createdAtFrom Y createdAtTo: productos creados en el rango (recientes, período corto)
    // - Si solo hay createdAtTo: productos creados ANTES de esta fecha (antiguos, período largo)
    if (filters?.createdAtFrom && filters?.createdAtTo) {
      // Período corto: productos creados RECIENTEMENTE (en el rango)
      query = query
        .gte('created_at', filters.createdAtFrom + 'T00:00:00.000Z')
        .lte('created_at', filters.createdAtTo + 'T23:59:59.999Z');
    } else if (filters?.createdAtTo && !filters?.createdAtFrom) {
      // Período largo: productos creados ANTES de esta fecha (antiguos)
      query = query.lte('created_at', filters.createdAtTo + 'T23:59:59.999Z');
    }

    if (filters?.search) {
      const searchTerm = filters.search.trim();
      if (searchTerm) {
        // Usar utilidad de búsqueda avanzada con operadores lógicos (AND, OR, NOT, *, comillas)
        const searchCondition = processSearchTerm(searchTerm, [
          'code',
          'name',
          'barcode',
        ]);
        if (searchCondition) {
          query = query.or(searchCondition);
        }
      }
    }

    // Filtros por fecha de modificación
    // Lógica:
    // - Si hay lastModifiedFrom Y lastModifiedTo: productos modificados en el rango (recientes, período corto)
    // - Si solo hay lastModifiedTo: productos modificados ANTES de esta fecha (antiguos, período largo)
    if (filters?.lastModifiedFrom && filters?.lastModifiedTo) {
      // Período corto: productos modificados RECIENTEMENTE (en el rango)
      query = query
        .gte('updated_at', filters.lastModifiedFrom + 'T00:00:00.000Z')
        .lte('updated_at', filters.lastModifiedTo + 'T23:59:59.999Z');
    } else if (filters?.lastModifiedTo && !filters?.lastModifiedFrom) {
      // Período largo: productos modificados ANTES de esta fecha (antiguos, no modificados)
      query = query.lte('updated_at', filters.lastModifiedTo + 'T23:59:59.999Z');
    }

    // Para filtros que requieren comparación entre columnas o consultas complejas,
    // necesitamos obtener todos los productos primero y filtrar en el cliente
    const needsClientFiltering =
      filters?.lowStock ||
      filters?.stockNearMinimum ||
      (filters?.lastModifiedType && filters.lastModifiedType !== 'both') ||
      (filters?.batchStatus && filters.batchStatus.length > 0);

    if (needsClientFiltering) {
      // Obtener TODOS los productos que cumplan los filtros básicos (sin paginación)
      // Supabase tiene un límite por defecto de 1000 registros, así que necesitamos leer en lotes
      const BATCH_SIZE = 1000;
      let allProducts: Product[] = [];
      let currentBatch = 0;
      let hasMore = true;

      while (hasMore) {
        const fromBatch = currentBatch * BATCH_SIZE;
        const toBatch = fromBatch + BATCH_SIZE - 1;

        const { data: batchData, error: batchError } = await query.range(
          fromBatch,
          toBatch,
        );
        this.handleError('listar productos', batchError);

        // Cargar ubicaciones para todos los productos del lote en una sola consulta
        const batchProductIds = (batchData ?? []).map((row: ProductRow) => row.id);
        const batchLocationsMap: Map<string, ProductLocationRow[]> = new Map();

        if (batchProductIds.length > 0) {
          try {
            const { data: batchLocationsData } = await this.client
              .from('product_locations')
              .select('*')
              .in('product_id', batchProductIds)
              .order('is_primary', { ascending: false })
              .order('created_at', { ascending: true });

            if (batchLocationsData && Array.isArray(batchLocationsData)) {
              batchLocationsData.forEach((loc: ProductLocationRow) => {
                if (!batchLocationsMap.has(loc.product_id)) {
                  batchLocationsMap.set(loc.product_id, []);
                }
                batchLocationsMap.get(loc.product_id)!.push(loc);
              });
            }
          } catch (err) {
            console.warn('Error al cargar ubicaciones del lote:', err);
          }
        }

        const batchProducts = (batchData ?? []).map((row: ProductRow) => {
          const locations = batchLocationsMap.get(row.id);
          return mapProduct(row, locations);
        });
        allProducts = [...allProducts, ...batchProducts];

        // Si recibimos menos productos que el tamaño del lote, no hay más
        if (batchProducts.length < BATCH_SIZE) {
          hasMore = false;
        } else {
          currentBatch++;
        }
      }

      // Filtrar por stock bajo (por debajo o igual al stock mínimo)
      if (filters?.lowStock) {
        allProducts = allProducts.filter((p) => p.stockCurrent <= p.stockMin);
      }

      // Filtrar por stock cerca del mínimo (15%)
      // Solo productos que están POR ENCIMA del mínimo pero hasta el 15% por encima
      // Excluye los que ya están en alarma (por debajo del mínimo)
      if (filters?.stockNearMinimum) {
        allProducts = allProducts.filter(
          (p) => p.stockCurrent > p.stockMin && p.stockCurrent <= p.stockMin * 1.15,
        );
      }

      // Filtrar por tipo de modificación (entradas/salidas)
      if (filters?.lastModifiedType && filters.lastModifiedType !== 'both') {
        const movementType = filters.lastModifiedType === 'entries' ? 'IN' : 'OUT';
        const dateFrom =
          filters.lastModifiedFrom ||
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dateTo = filters.lastModifiedTo || new Date().toISOString().split('T')[0];

        // Obtener productos con movimientos del tipo especificado en el rango de fechas
        const { data: movementsData } = await this.client
          .from('inventory_movements')
          .select('product_id')
          .eq('movement_type', movementType)
          .gte('movement_date', dateFrom + 'T00:00:00.000Z')
          .lte('movement_date', dateTo + 'T23:59:59.999Z');

        if (movementsData && movementsData.length > 0) {
          const productIdsWithMovements = new Set(
            movementsData.map((m: { product_id: string }) => m.product_id),
          );
          allProducts = allProducts.filter((p) => productIdsWithMovements.has(p.id));
        } else {
          // Si no hay movimientos, no hay productos que mostrar
          allProducts = [];
        }
      }

      // Filtrar por estado de lote
      if (filters?.batchStatus && filters.batchStatus.length > 0) {
        // Obtener productos que tengan lotes con los estados especificados
        const { data: batchesData } = await this.client
          .from('product_batches')
          .select('product_id')
          .in('status', filters.batchStatus);

        if (batchesData && batchesData.length > 0) {
          const productIdsWithBatches = new Set(
            batchesData.map((b: { product_id: string }) => b.product_id),
          );
          allProducts = allProducts.filter((p) => productIdsWithBatches.has(p.id));
        } else {
          // Si no hay lotes con esos estados, no hay productos que mostrar
          allProducts = [];
        }
      }

      // Aplicar paginación después del filtro
      const totalCount = allProducts.length;
      const paginatedProducts = allProducts.slice(from, to + 1);

      return toPaginatedResult(paginatedProducts, totalCount, page, pageSize);
    }

    // Si no hay filtros que requieran procesamiento en el cliente, usar paginación normal
    const { data, error, count } = await query.range(from, to);
    this.handleError('listar productos', error);

    // Cargar ubicaciones para todos los productos obtenidos en una sola consulta
    const productIds = (data ?? []).map((row: ProductRow) => row.id);
    const locationsMap: Map<string, ProductLocationRow[]> = new Map();

    if (productIds.length > 0) {
      try {
        const { data: allLocationsData } = await this.client
          .from('product_locations')
          .select('*')
          .in('product_id', productIds)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true });

        if (allLocationsData && Array.isArray(allLocationsData)) {
          // Agrupar ubicaciones por product_id
          allLocationsData.forEach((loc: ProductLocationRow) => {
            if (!locationsMap.has(loc.product_id)) {
              locationsMap.set(loc.product_id, []);
            }
            locationsMap.get(loc.product_id)!.push(loc);
          });
        }
      } catch (err) {
        console.warn('Error al cargar ubicaciones de productos:', err);
      }
    }

    // Mapear productos con sus ubicaciones
    const products = (data ?? []).map((row: ProductRow) => {
      const locations = locationsMap.get(row.id);
      return mapProduct(row, locations);
    });

    return toPaginatedResult(products, count ?? null, page, pageSize);
  }

  async getAll(filters?: ProductFilters): Promise<Product[]> {
    // Supabase tiene un límite por defecto de 1000 registros
    // Para obtener TODOS los productos, necesitamos hacer peticiones en lotes
    const BATCH_SIZE = 1000;
    let allProducts: Product[] = [];
    let currentBatch = 0;
    let hasMore = true;

    while (hasMore) {
      const from = currentBatch * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;

      let query = this.client
        .from('products')
        .select(
          `*,
          created_by_profile:profiles!products_created_by_fkey(first_name, last_name),
          updated_by_profile:profiles!products_updated_by_fkey(first_name, last_name)
        `,
          { count: 'exact' },
        )
        .order('name', { ascending: true })
        .range(from, to);

      if (!filters?.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (typeof filters?.isBatchTracked === 'boolean') {
        query = query.eq('is_batch_tracked', filters.isBatchTracked);
      }

      // Filtros por rango de stock
      if (filters?.stockMin !== undefined) {
        query = query.gte('stock_current', filters.stockMin);
      }
      if (filters?.stockMax !== undefined) {
        query = query.lte('stock_current', filters.stockMax);
      }

      // Filtros por rango de precio (cost_price)
      if (filters?.priceMin !== undefined) {
        query = query.gte('cost_price', filters.priceMin);
      }
      if (filters?.priceMax !== undefined) {
        query = query.lte('cost_price', filters.priceMax);
      }

      // Filtro por código de proveedor
      if (filters?.supplierCode) {
        query = query.ilike('supplier_code', `%${filters.supplierCode}%`);
      }

      // Filtro por almacén y/o ubicación: buscar en product_locations
      // IMPORTANTE: Cuando hay múltiples filtros (warehouse Y aisle), deben cumplirse TODOS en la MISMA ubicación
      let productIdsFromLocations: string[] = [];

      if (filters?.warehouse || filters?.aisle || filters?.shelf) {
        const locationQuery = this.client.from('product_locations').select('product_id');

        // Aplicar TODOS los filtros como condiciones AND en la misma query
        // Esto asegura que solo se encuentren ubicaciones que cumplan TODAS las condiciones
        if (filters.warehouse) {
          locationQuery.eq('warehouse', filters.warehouse);
        }
        if (filters.aisle) {
          locationQuery.ilike('aisle', `%${filters.aisle}%`);
        }
        if (filters.shelf) {
          locationQuery.ilike('shelf', `%${filters.shelf}%`);
        }

        const { data: locationProducts } = await locationQuery;
        if (locationProducts) {
          // Obtener IDs únicos de productos que tienen ubicaciones que cumplen TODAS las condiciones
          productIdsFromLocations = [
            ...new Set(
              locationProducts.map((lp: { product_id: string }) => lp.product_id),
            ),
          ];
        }
      }

      // Si hay filtros de ubicación, también buscar en la tabla products (compatibilidad)
      let productIdsFromProducts: string[] = [];
      if ((filters?.aisle || filters?.shelf) && !filters?.warehouse) {
        const productsQuery = this.client.from('products').select('id');
        if (filters.aisle) {
          productsQuery.ilike('aisle', `%${filters.aisle}%`);
        }
        if (filters.shelf) {
          productsQuery.ilike('shelf', `%${filters.shelf}%`);
        }

        const { data: productsData } = await productsQuery;
        if (productsData) {
          productIdsFromProducts = productsData.map((p: { id: string }) => p.id);
        }
      }

      // Combinar IDs de ambas fuentes
      if (productIdsFromLocations.length > 0 || productIdsFromProducts.length > 0) {
        const allProductIds = [
          ...new Set([...productIdsFromLocations, ...productIdsFromProducts]),
        ];
        if (allProductIds.length > 0) {
          query = query.in('id', allProductIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else if (filters?.warehouse) {
        // Solo filtro de almacén sin ubicación específica
        const locationQuery = this.client
          .from('product_locations')
          .select('product_id')
          .eq('warehouse', filters.warehouse);

        const { data: locationProducts } = await locationQuery;
        if (locationProducts && locationProducts.length > 0) {
          const productIds = locationProducts.map(
            (lp: { product_id: string }) => lp.product_id,
          );
          query = query.in('id', productIds);
        } else {
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      // Filtro por rango de stock mínimo
      if (filters?.stockMinMin !== undefined) {
        query = query.gte('stock_min', filters.stockMinMin);
      }
      if (filters?.stockMinMax !== undefined) {
        query = query.lte('stock_min', filters.stockMinMax);
      }

      // Filtros por fecha de modificación
      // lastModifiedFrom: productos modificados ANTES de esta fecha (hace más de X tiempo)
      if (filters?.lastModifiedFrom) {
        query = query.lte('updated_at', filters.lastModifiedFrom + 'T23:59:59.999Z');
      }
      if (filters?.lastModifiedTo) {
        query = query.gte('updated_at', filters.lastModifiedTo);
      }

      // Filtros por fecha de creación
      // createdAtFrom: productos creados ANTES de esta fecha (hace más de X tiempo)
      if (filters?.createdAtFrom) {
        query = query.lte('created_at', filters.createdAtFrom + 'T23:59:59.999Z');
      }
      if (filters?.createdAtTo) {
        query = query.gte('created_at', filters.createdAtTo);
      }

      if (filters?.search) {
        const searchTerm = filters.search.trim();
        if (searchTerm) {
          // Usar utilidad de búsqueda avanzada con operadores lógicos (AND, OR, NOT, *, comillas)
          const searchCondition = processSearchTerm(searchTerm, [
            'code',
            'name',
            'barcode',
          ]);
          if (searchCondition) {
            query = query.or(searchCondition);
          }
        }
      }

      const { data, error, count } = await query;
      this.handleError('obtener todos los productos', error);

      // Cargar ubicaciones para todos los productos del lote en una sola consulta
      const batchProductIds = (data ?? []).map((row: ProductRow) => row.id);
      const batchLocationsMap: Map<string, ProductLocationRow[]> = new Map();

      if (batchProductIds.length > 0) {
        try {
          const { data: batchLocationsData } = await this.client
            .from('product_locations')
            .select('*')
            .in('product_id', batchProductIds)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

          if (batchLocationsData && Array.isArray(batchLocationsData)) {
            batchLocationsData.forEach((loc: ProductLocationRow) => {
              if (!batchLocationsMap.has(loc.product_id)) {
                batchLocationsMap.set(loc.product_id, []);
              }
              batchLocationsMap.get(loc.product_id)!.push(loc);
            });
          }
        } catch (err) {
          console.warn('Error al cargar ubicaciones del lote:', err);
        }
      }

      const batchProducts = (data ?? []).map((row: ProductRow) => {
        const locations = batchLocationsMap.get(row.id);
        return mapProduct(row, locations);
      });
      allProducts = [...allProducts, ...batchProducts];

      // Si recibimos menos productos que el tamaño del lote, no hay más
      // O si el total de productos obtenidos es igual al count
      if (
        batchProducts.length < BATCH_SIZE ||
        (count !== null && allProducts.length >= count)
      ) {
        hasMore = false;
      } else {
        currentBatch++;
      }
    }

    // Filtrar por stock bajo en el cliente
    if (filters?.lowStock) {
      allProducts = allProducts.filter((p) => p.stockCurrent <= p.stockMin);
    }

    return allProducts;
  }

  /**
   * Obtiene las ubicaciones de un producto.
   */
  async getProductLocations(productId: string): Promise<ProductLocation[]> {
    try {
      const { data, error } = await this.client
        .from('product_locations')
        .select('*')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      // Si hay error pero es porque la tabla no existe o no hay datos, retornar array vacío
      if (error) {
        // Si es un error de tabla no encontrada, retornar array vacío en lugar de lanzar error
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return [];
        }
        this.handleError('obtener ubicaciones del producto', error);
      }
      return (data ?? []).map(mapLocation);
    } catch (err) {
      // Si hay cualquier error, retornar array vacío para no romper el flujo
      console.warn('Error al obtener ubicaciones del producto:', err);
      return [];
    }
  }

  /**
   * Añade una nueva ubicación a un producto.
   */
  async addProductLocation(
    productId: string,
    warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
    aisle: string,
    shelf: string,
    isPrimary: boolean = false,
    userId?: string,
  ): Promise<ProductLocation> {
    // Si se marca como primaria, desmarcar las demás
    if (isPrimary) {
      await this.client
        .from('product_locations')
        .update({ is_primary: false })
        .eq('product_id', productId)
        .eq('is_primary', true);
    }

    const { data, error } = await this.client
      .from('product_locations')
      .insert({
        product_id: productId,
        warehouse,
        aisle,
        shelf,
        is_primary: isPrimary,
        created_by: userId,
      })
      .select('*')
      .single();

    this.handleError('añadir ubicación al producto', error);
    return mapLocation(data as ProductLocationRow);
  }

  /**
   * Elimina una ubicación de un producto.
   */
  async removeProductLocation(locationId: string, userId?: string): Promise<void> {
    const { error } = await this.client
      .from('product_locations')
      .update({ updated_by: userId })
      .eq('id', locationId);

    if (error) {
      console.warn('Error al actualizar updated_by antes de eliminar:', error);
    }

    const { error: deleteError } = await this.client
      .from('product_locations')
      .delete()
      .eq('id', locationId);

    this.handleError('eliminar ubicación del producto', deleteError);
  }

  /**
   * Marca una ubicación como primaria.
   */
  async setPrimaryLocation(
    productId: string,
    locationId: string,
    isPrimary: boolean,
    userId?: string,
  ): Promise<ProductLocation> {
    // Desmarcar todas las primarias si se está marcando como primaria
    if (isPrimary) {
      await this.client
        .from('product_locations')
        .update({ is_primary: false, updated_by: userId })
        .eq('product_id', productId);
    }

    // Marcar la nueva como primaria o desmarcarla
    const { data, error } = await this.client
      .from('product_locations')
      .update({ is_primary: isPrimary, updated_by: userId })
      .eq('id', locationId)
      .select('*')
      .single();

    this.handleError('marcar ubicación como primaria', error);
    return mapLocation(data as ProductLocationRow);
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from('products')
      .select(
        `*,
        created_by_profile:profiles!products_created_by_fkey(first_name, last_name),
        updated_by_profile:profiles!products_updated_by_fkey(first_name, last_name)
      `,
      )
      .eq('id', id)
      .maybeSingle();

    this.handleError('buscar producto por id', error);
    if (!data) return null;

    // Cargar ubicaciones (si falla, continuar sin ubicaciones)
    let locationsData: ProductLocationRow[] | undefined;
    try {
      const { data: locData } = await this.client
        .from('product_locations')
        .select('*')
        .eq('product_id', id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      locationsData = locData && Array.isArray(locData) ? locData : undefined;
    } catch (err) {
      // Si falla cargar ubicaciones, continuar sin ellas
      console.warn('No se pudieron cargar las ubicaciones del producto:', err);
    }

    // Cargar stocks por almacén (si falla, continuar sin stocks)
    let stocksData: ProductStockByWarehouseRow[] | undefined;
    try {
      const { data: stockData } = await this.client
        .from('product_stock_by_warehouse')
        .select('*')
        .eq('product_id', id)
        .order('warehouse', { ascending: true });

      stocksData = stockData && Array.isArray(stockData) ? stockData : undefined;
    } catch (err) {
      // Si falla cargar stocks, continuar sin ellos
      console.warn('No se pudieron cargar los stocks por almacén del producto:', err);
    }

    return mapProduct(data as ProductRow, locationsData, stocksData);
  }

  async findByCodeOrBarcode(term: string) {
    // Evitar construir filtros `.or()` con interpolación de texto del usuario/escáner.
    // Esto previene fallos con caracteres especiales (p.ej. `|`, `:`, saltos de línea).
    const selectExpr = `*,
        created_by_profile:profiles!products_created_by_fkey(first_name, last_name),
        updated_by_profile:profiles!products_updated_by_fkey(first_name, last_name)`;

    // 1) Buscar por código exacto
    const byCode = await this.client
      .from('products')
      .select(selectExpr)
      .eq('code', term)
      .maybeSingle();

    this.handleError('buscar producto por código', byCode.error);

    // 2) Si no hay resultado, buscar por barcode exacto
    const byBarcode = byCode.data
      ? byCode
      : await this.client
          .from('products')
          .select(selectExpr)
          .eq('barcode', term)
          .maybeSingle();

    if (!byCode.data) {
      this.handleError('buscar producto por barcode', byBarcode.error);
    }

    if (!byBarcode.data) return null;

    // Cargar ubicaciones (si falla, continuar sin ubicaciones)
    let locationsData: ProductLocationRow[] | undefined;
    try {
      const { data: locData } = await this.client
        .from('product_locations')
        .select('*')
        .eq('product_id', byBarcode.data.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      locationsData = locData && Array.isArray(locData) ? locData : undefined;
    } catch (err) {
      // Si falla cargar ubicaciones, continuar sin ellas
      console.warn('No se pudieron cargar las ubicaciones del producto:', err);
    }

    // Cargar stocks por almacén (si falla, continuar sin stocks)
    let stocksData: ProductStockByWarehouseRow[] | undefined;
    try {
      const { data: stockData } = await this.client
        .from('product_stock_by_warehouse')
        .select('*')
        .eq('product_id', byBarcode.data.id)
        .order('warehouse', { ascending: true });

      stocksData = stockData && Array.isArray(stockData) ? stockData : undefined;
    } catch (err) {
      // Si falla cargar stocks, continuar sin ellos
      console.warn('No se pudieron cargar los stocks por almacén del producto:', err);
    }

    return mapProduct(byBarcode.data as ProductRow, locationsData, stocksData);
  }

  async getBatches(productId: string, filters?: BatchFilters) {
    let query = this.client
      .from('product_batches')
      .select('*')
      .eq('product_id', productId)
      .order('received_at', { ascending: false });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters?.expiryBefore) {
      query = query.lte('expiry_date', filters.expiryBefore);
    }

    if (filters?.expiryAfter) {
      query = query.gte('expiry_date', filters.expiryAfter);
    }

    if (filters?.onlyAvailable) {
      query = query.gt('quantity_available', 0);
    }

    const { data, error } = await query;
    this.handleError('listar lotes por producto', error);
    return (data ?? []).map((row) => mapBatch(row as BatchRow));
  }

  async getDefectReports(batchId: string) {
    const { data, error } = await this.client
      .from('batch_defect_reports')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    this.handleError('listar reportes de defecto', error);
    return (data ?? []).map((row) => mapDefect(row as DefectRow));
  }

  async create(input: CreateProductInput): Promise<Product> {
    const row: Partial<ProductRow> = {
      code: input.code,
      barcode: input.barcode ?? null,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      stock_current: input.stockCurrent ?? 0,
      stock_min: input.stockMin,
      stock_max: input.stockMax ?? null,
      aisle: input.aisle,
      shelf: input.shelf,
      location_extra: input.locationExtra ?? null,
      warehouse: input.warehouse ?? null,
      cost_price: input.costPrice,
      sale_price: input.salePrice ?? null,
      purchase_url: input.purchaseUrl ?? null,
      image_url: input.imageUrl ?? null,
      supplier_code: input.supplierCode ?? null, // Código de Proveedor
      is_active: input.isActive ?? true,
      is_batch_tracked: input.isBatchTracked,
      unit_of_measure: input.unitOfMeasure ?? null,
      weight_kg: input.weightKg ?? null,
      dimensions_cm: input.dimensionsCm ? JSON.stringify(input.dimensionsCm) : null,
      notes: input.notes ?? null,
      created_by: input.createdBy,
    };

    const { data, error } = await this.client
      .from('products')
      .insert(row)
      .select('*')
      .single();

    this.handleError('crear producto', error);
    const product = data as ProductRow;

    // Las ubicaciones se manejan desde el formulario después de crear el producto
    // No creamos ubicaciones aquí porque ahora se gestionan desde ProductForm.tsx

    // Cargar ubicaciones (puede estar vacío si no se han añadido aún)
    const locations = await this.getProductLocations(product.id);
    return mapProduct(product, locations);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const row: Partial<ProductRow> = {};

    if (input.code !== undefined) row.code = input.code;
    if (input.barcode !== undefined) row.barcode = input.barcode;
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description;
    if (input.category !== undefined) row.category = input.category;
    if (input.stockCurrent !== undefined) row.stock_current = input.stockCurrent;
    if (input.stockMin !== undefined) row.stock_min = input.stockMin;
    if (input.stockMax !== undefined) row.stock_max = input.stockMax;
    if (input.aisle !== undefined) row.aisle = input.aisle;
    if (input.shelf !== undefined) row.shelf = input.shelf;
    if (input.locationExtra !== undefined) row.location_extra = input.locationExtra;
    if (input.warehouse !== undefined) row.warehouse = input.warehouse;
    if (input.costPrice !== undefined) row.cost_price = input.costPrice;
    if (input.salePrice !== undefined) row.sale_price = input.salePrice;
    if (input.purchaseUrl !== undefined) row.purchase_url = input.purchaseUrl;
    if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
    if (input.supplierCode !== undefined) row.supplier_code = input.supplierCode; // Código de Proveedor
    if (input.isActive !== undefined) row.is_active = input.isActive;
    if (input.isBatchTracked !== undefined) row.is_batch_tracked = input.isBatchTracked;
    if (input.unitOfMeasure !== undefined) row.unit_of_measure = input.unitOfMeasure;
    if (input.weightKg !== undefined) row.weight_kg = input.weightKg;
    if (input.dimensionsCm !== undefined)
      row.dimensions_cm = input.dimensionsCm ? JSON.stringify(input.dimensionsCm) : null;
    if (input.notes !== undefined) row.notes = input.notes;
    if (input.updatedBy !== undefined) row.updated_by = input.updatedBy;

    row.updated_at = new Date().toISOString();

    const { data, error } = await this.client
      .from('products')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();

    this.handleError('actualizar producto', error);
    return mapProduct(data as ProductRow);
  }

  /**
   * Elimina físicamente un producto de la base de datos.
   *
   * IMPORTANTE: Esta es una eliminación permanente e irreversible.
   * El producto y sus relaciones (lotes, movimientos, historial, etc.)
   * se eliminarán automáticamente según las políticas CASCADE de la base de datos.
   *
   * @param {string} id - ID del producto a eliminar
   * @throws {Error} Si hay un error al eliminar el producto
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('products').delete().eq('id', id);

    this.handleError('eliminar producto', error);
  }

  /**
   * Lista todos los lotes con filtros opcionales y paginación.
   */
  async listBatches(filters?: BatchFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from('product_batches')
      .select('*', { count: 'exact' })
      .order('received_at', { ascending: false });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters?.expiryBefore) {
      query = query.lte('expiry_date', filters.expiryBefore);
    }

    if (filters?.expiryAfter) {
      query = query.gte('expiry_date', filters.expiryAfter);
    }

    if (filters?.onlyAvailable) {
      query = query.gt('quantity_available', 0);
    }

    if (filters?.search) {
      query = query.or(
        `batch_code.ilike.%${filters.search}%,batch_barcode.ilike.%${filters.search}%`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    this.handleError('listar todos los lotes', error);

    return toPaginatedResult(
      (data ?? []).map((row) => mapBatch(row as BatchRow)),
      count ?? null,
      page,
      pageSize,
    );
  }

  /**
   * Actualiza el estado de un lote.
   */
  async updateBatchStatus(
    batchId: string,
    status: ProductBatch['status'],
    reason?: string,
  ): Promise<ProductBatch> {
    const updateData: Partial<BatchRow> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'BLOCKED' && reason) {
      updateData.blocked_reason = reason;
    }

    const { data, error } = await this.client
      .from('product_batches')
      .update(updateData)
      .eq('id', batchId)
      .select('*')
      .single();

    this.handleError('actualizar estado de lote', error);
    return mapBatch(data as BatchRow);
  }

  /**
   * Busca un lote por su código o barcode.
   */
  async findByBatchCodeOrBarcode(term: string): Promise<ProductBatch | null> {
    const { data, error } = await this.client
      .from('product_batches')
      .select('*')
      .or(`batch_code.ilike.%${term}%,batch_barcode.eq.${term}`)
      .limit(1)
      .single();

    this.handleError('buscar lote por código/barcode', error);
    return data ? mapBatch(data as BatchRow) : null;
  }

  /**
   * Verifica si un código de lote ya existe.
   */
  async batchCodeExists(batchCode: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('product_batches')
      .select('id')
      .eq('batch_code', batchCode.toUpperCase())
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", que es válido
      this.handleError('verificar código de lote', error);
    }

    return !!data;
  }

  /**
   * Crea un nuevo lote.
   */
  async createBatch(input: CreateBatchInput): Promise<ProductBatch> {
    const row: Partial<BatchRow> = {
      product_id: input.productId,
      supplier_id: input.supplierId ?? null,
      batch_code: input.batchCode,
      batch_barcode: input.batchBarcode ?? null,
      quantity_total: input.quantityTotal,
      quantity_available: input.quantityAvailable,
      quantity_reserved: input.quantityReserved ?? 0,
      defective_qty: input.defectiveQty ?? 0,
      status: input.status ?? 'OK',
      blocked_reason: input.blockedReason ?? null,
      quality_score: input.qualityScore ?? 1.0,
      received_at: input.receivedAt ?? new Date().toISOString(),
      expiry_date: input.expiryDate ?? null,
      manufacture_date: input.manufactureDate ?? null,
      cost_per_unit: input.costPerUnit ?? null,
      location_override: input.locationOverride ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy,
    };

    const { data, error } = await this.client
      .from('product_batches')
      .insert(row)
      .select('*')
      .single();

    this.handleError('crear lote', error);
    return mapBatch(data as BatchRow);
  }

  /**
   * Actualiza un lote existente.
   */
  async updateBatch(batchId: string, input: UpdateBatchInput): Promise<ProductBatch> {
    const row: Partial<BatchRow> = {
      updated_at: new Date().toISOString(),
    };

    if (input.batchCode !== undefined) row.batch_code = input.batchCode;
    if (input.batchBarcode !== undefined) row.batch_barcode = input.batchBarcode;
    if (input.quantityTotal !== undefined) row.quantity_total = input.quantityTotal;
    if (input.quantityAvailable !== undefined)
      row.quantity_available = input.quantityAvailable;
    if (input.quantityReserved !== undefined)
      row.quantity_reserved = input.quantityReserved;
    if (input.defectiveQty !== undefined) row.defective_qty = input.defectiveQty;
    if (input.status !== undefined) row.status = input.status;
    if (input.blockedReason !== undefined) row.blocked_reason = input.blockedReason;
    if (input.qualityScore !== undefined) row.quality_score = input.qualityScore;
    if (input.receivedAt !== undefined) row.received_at = input.receivedAt;
    if (input.expiryDate !== undefined) row.expiry_date = input.expiryDate;
    if (input.manufactureDate !== undefined) row.manufacture_date = input.manufactureDate;
    if (input.costPerUnit !== undefined) row.cost_per_unit = input.costPerUnit;
    if (input.locationOverride !== undefined)
      row.location_override = input.locationOverride;
    if (input.notes !== undefined) row.notes = input.notes;

    const { data, error } = await this.client
      .from('product_batches')
      .update(row)
      .eq('id', batchId)
      .select('*')
      .single();

    this.handleError('actualizar lote', error);
    return mapBatch(data as BatchRow);
  }

  /**
   * Obtiene todos los stocks por almacén de un producto.
   */
  async getProductStocksByWarehouse(
    productId: string,
  ): Promise<ProductStockByWarehouse[]> {
    const { data, error } = await this.client
      .from('product_stock_by_warehouse')
      .select('*')
      .eq('product_id', productId)
      .order('warehouse', { ascending: true });

    this.handleError('obtener stocks por almacén', error);
    return (data || []).map(mapStockByWarehouse);
  }

  /**
   * Establece o actualiza el stock de un producto en un almacén específico.
   * Si el registro existe, lo actualiza; si no, lo crea (UPSERT).
   */
  async setProductStockByWarehouse(
    productId: string,
    warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
    quantity: number,
    locationAisle?: string | null,
    locationShelf?: string | null,
    userId?: string,
  ): Promise<ProductStockByWarehouse> {
    // Verificar que el producto existe
    const { data: productExists } = await this.client
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();

    if (!productExists) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }

    // UPSERT: insertar o actualizar
    const row: Partial<ProductStockByWarehouseRow> = {
      product_id: productId,
      warehouse,
      quantity: Math.max(0, quantity), // Asegurar que no sea negativo
      location_aisle: locationAisle ?? null,
      location_shelf: locationShelf ?? null,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      row.updated_by = userId;
      // Si es creación, también establecer created_by
      const { data: existing } = await this.client
        .from('product_stock_by_warehouse')
        .select('id')
        .eq('product_id', productId)
        .eq('warehouse', warehouse)
        .maybeSingle();

      if (!existing && userId) {
        row.created_by = userId;
      }
    }

    const { data, error } = await this.client
      .from('product_stock_by_warehouse')
      .upsert(row, {
        onConflict: 'product_id,warehouse',
      })
      .select('*')
      .single();

    this.handleError('establecer stock por almacén', error);
    return mapStockByWarehouse(data as ProductStockByWarehouseRow);
  }

  /**
   * Elimina el stock de un producto en un almacén específico (establece quantity a 0).
   */
  async removeProductStockByWarehouse(
    productId: string,
    warehouse: 'MEYPAR' | 'OLIVA_TORRAS' | 'FURGONETA',
    userId?: string,
  ): Promise<void> {
    // Establecer quantity a 0 en lugar de eliminar el registro
    const row: Partial<ProductStockByWarehouseRow> = {
      quantity: 0,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      row.updated_by = userId;
    }

    const { error } = await this.client
      .from('product_stock_by_warehouse')
      .update(row)
      .eq('product_id', productId)
      .eq('warehouse', warehouse);

    // Si no existe el registro, no es un error (ya está "eliminado")
    if (error && error.code !== 'PGRST116') {
      this.handleError('eliminar stock por almacén', error);
    }
  }
}
