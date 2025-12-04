import type {
  BatchDefectReport,
  Product,
  ProductBatch
} from "@domain/entities";
import type {
  BatchFilters,
  CreateBatchInput,
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateBatchInput,
  UpdateProductInput
} from "@domain/repositories/ProductRepository";
import type { PaginationParams } from "@domain/repositories/types";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";
import { buildPagination, toPaginatedResult } from "./pagination";

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
  status: ProductBatch["status"];
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
  defect_type: BatchDefectReport["defectType"];
  affected_quantity: number;
  severity: BatchDefectReport["severity"];
  description: string | null;
  images: string[] | null;
  resolution_status: BatchDefectReport["resolutionStatus"];
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

const parseDimensions = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  code: row.code,
  barcode: row.barcode,
  name: row.name,
  description: row.description,
  category: row.category,
  stockCurrent: row.stock_current,
  stockMin: row.stock_min,
  stockMax: row.stock_max,
  aisle: row.aisle,
  shelf: row.shelf,
  locationExtra: row.location_extra,
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
  updatedBy: row.updated_by // Usuario que hizo la modificación
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
  createdBy: row.created_by ?? undefined
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
  createdAt: row.created_at
});

export class SupabaseProductRepository
  extends BaseSupabaseRepository
  implements ProductRepository
{
  async list(filters?: ProductFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from("products")
      .select("*", { count: "exact" })
      .order("name", { ascending: true });

    if (!filters?.includeInactive) {
      query = query.eq("is_active", true);
    }

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (typeof filters?.isBatchTracked === "boolean") {
      query = query.eq("is_batch_tracked", filters.isBatchTracked);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `code.ilike.${term},name.ilike.${term},barcode.ilike.${term}`
      );
    }

    // Filtros por fecha de modificación
    if (filters?.lastModifiedFrom) {
      query = query.gte("updated_at", filters.lastModifiedFrom);
    }
    if (filters?.lastModifiedTo) {
      query = query.lte("updated_at", filters.lastModifiedTo + "T23:59:59.999Z");
    }

    // Para filtros que requieren comparación entre columnas o consultas complejas,
    // necesitamos obtener todos los productos primero y filtrar en el cliente
    const needsClientFiltering = filters?.lowStock || filters?.stockNearMinimum || 
                                  (filters?.lastModifiedType && filters.lastModifiedType !== "both");

    if (needsClientFiltering) {
      // Obtener todos los productos que cumplan los filtros básicos (sin paginación)
      const { data: allData, error: allError } = await query;
      this.handleError("listar productos", allError);
      
      let allProducts = (allData ?? []).map(mapProduct);
      
      // Filtrar por stock bajo
      if (filters?.lowStock) {
        allProducts = allProducts.filter((p) => p.stockCurrent <= p.stockMin);
      }
      
      // Filtrar por stock cerca del mínimo (15%)
      if (filters?.stockNearMinimum) {
        allProducts = allProducts.filter((p) => p.stockCurrent <= p.stockMin * 1.15);
      }
      
      // Filtrar por tipo de modificación (entradas/salidas)
      if (filters?.lastModifiedType && filters.lastModifiedType !== "both") {
        const movementType = filters.lastModifiedType === "entries" ? "IN" : "OUT";
        const dateFrom = filters.lastModifiedFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const dateTo = filters.lastModifiedTo || new Date().toISOString().split("T")[0];
        
        // Obtener productos con movimientos del tipo especificado en el rango de fechas
        const { data: movementsData } = await this.client
          .from("inventory_movements")
          .select("product_id")
          .eq("movement_type", movementType)
          .gte("movement_date", dateFrom + "T00:00:00.000Z")
          .lte("movement_date", dateTo + "T23:59:59.999Z");
        
        if (movementsData && movementsData.length > 0) {
          const productIdsWithMovements = new Set(movementsData.map((m: any) => m.product_id));
          allProducts = allProducts.filter((p) => productIdsWithMovements.has(p.id));
        } else {
          // Si no hay movimientos, no hay productos que mostrar
          allProducts = [];
        }
      }
      
      // Aplicar paginación después del filtro
      const totalCount = allProducts.length;
      const paginatedProducts = allProducts.slice(from, to + 1);
      
      return toPaginatedResult(
        paginatedProducts,
        totalCount,
        page,
        pageSize
      );
    }

    // Si no hay filtros que requieran procesamiento en el cliente, usar paginación normal
    const { data, error, count } = await query.range(from, to);
    this.handleError("listar productos", error);

    const products = (data ?? []).map(mapProduct);

    return toPaginatedResult(
      products,
      count ?? null,
      page,
      pageSize
    );
  }

  async getAll(filters?: ProductFilters): Promise<Product[]> {
    let query = this.client
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (!filters?.includeInactive) {
      query = query.eq("is_active", true);
    }

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    if (typeof filters?.isBatchTracked === "boolean") {
      query = query.eq("is_batch_tracked", filters.isBatchTracked);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `code.ilike.${term},name.ilike.${term},barcode.ilike.${term}`
      );
    }

    const { data, error } = await query;
    this.handleError("obtener todos los productos", error);

    let products = (data ?? []).map(mapProduct);

    // Filtrar por stock bajo en el cliente
    if (filters?.lowStock) {
      products = products.filter((p) => p.stockCurrent <= p.stockMin);
    }

    return products;
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    this.handleError("buscar producto por id", error);
    return data ? mapProduct(data as ProductRow) : null;
  }

  async findByCodeOrBarcode(term: string) {
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .or(`code.eq.${term},barcode.eq.${term}`)
      .maybeSingle();

    this.handleError("buscar producto por código/barcode", error);
    return data ? mapProduct(data as ProductRow) : null;
  }

  async getBatches(productId: string, filters?: BatchFilters) {
    let query = this.client
      .from("product_batches")
      .select("*")
      .eq("product_id", productId)
      .order("received_at", { ascending: false });

    if (filters?.status?.length) {
      query = query.in("status", filters.status);
    }

    if (filters?.expiryBefore) {
      query = query.lte("expiry_date", filters.expiryBefore);
    }

    if (filters?.expiryAfter) {
      query = query.gte("expiry_date", filters.expiryAfter);
    }

    if (filters?.onlyAvailable) {
      query = query.gt("quantity_available", 0);
    }

    const { data, error } = await query;
    this.handleError("listar lotes por producto", error);
    return (data ?? []).map((row) => mapBatch(row as BatchRow));
  }

  async getDefectReports(batchId: string) {
    const { data, error } = await this.client
      .from("batch_defect_reports")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    this.handleError("listar reportes de defecto", error);
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
      cost_price: input.costPrice,
      sale_price: input.salePrice ?? null,
      purchase_url: input.purchaseUrl ?? null,
      image_url: input.imageUrl ?? null,
      supplier_code: input.supplierCode ?? null, // Código de Proveedor
      is_active: input.isActive ?? true,
      is_batch_tracked: input.isBatchTracked,
      unit_of_measure: input.unitOfMeasure ?? null,
      weight_kg: input.weightKg ?? null,
      dimensions_cm: input.dimensionsCm
        ? JSON.stringify(input.dimensionsCm)
        : null,
      notes: input.notes ?? null,
      created_by: input.createdBy
    };

    const { data, error } = await this.client
      .from("products")
      .insert(row)
      .select("*")
      .single();

    this.handleError("crear producto", error);
    return mapProduct(data as ProductRow);
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
    if (input.locationExtra !== undefined)
      row.location_extra = input.locationExtra;
    if (input.costPrice !== undefined) row.cost_price = input.costPrice;
    if (input.salePrice !== undefined) row.sale_price = input.salePrice;
    if (input.purchaseUrl !== undefined) row.purchase_url = input.purchaseUrl;
    if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
    if (input.supplierCode !== undefined) row.supplier_code = input.supplierCode; // Código de Proveedor
    if (input.isActive !== undefined) row.is_active = input.isActive;
    if (input.isBatchTracked !== undefined)
      row.is_batch_tracked = input.isBatchTracked;
    if (input.unitOfMeasure !== undefined)
      row.unit_of_measure = input.unitOfMeasure;
    if (input.weightKg !== undefined) row.weight_kg = input.weightKg;
    if (input.dimensionsCm !== undefined)
      row.dimensions_cm = input.dimensionsCm
        ? JSON.stringify(input.dimensionsCm)
        : null;
    if (input.notes !== undefined) row.notes = input.notes;
    if (input.updatedBy !== undefined) row.updated_by = input.updatedBy;

    row.updated_at = new Date().toISOString();

    const { data, error } = await this.client
      .from("products")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    this.handleError("actualizar producto", error);
    return mapProduct(data as ProductRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    this.handleError("eliminar producto", error);
  }

  /**
   * Lista todos los lotes con filtros opcionales y paginación.
   */
  async listBatches(filters?: BatchFilters, pagination?: PaginationParams) {
    const { page, pageSize, from, to } = buildPagination(pagination);
    let query = this.client
      .from("product_batches")
      .select("*", { count: "exact" })
      .order("received_at", { ascending: false });

    if (filters?.status?.length) {
      query = query.in("status", filters.status);
    }

    if (filters?.expiryBefore) {
      query = query.lte("expiry_date", filters.expiryBefore);
    }

    if (filters?.expiryAfter) {
      query = query.gte("expiry_date", filters.expiryAfter);
    }

    if (filters?.onlyAvailable) {
      query = query.gt("quantity_available", 0);
    }

    if (filters?.search) {
      query = query.or(`batch_code.ilike.%${filters.search}%,batch_barcode.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query.range(from, to);
    this.handleError("listar todos los lotes", error);

    return toPaginatedResult(
      (data ?? []).map((row) => mapBatch(row as BatchRow)),
      count ?? null,
      page,
      pageSize
    );
  }

  /**
   * Actualiza el estado de un lote.
   */
  async updateBatchStatus(
    batchId: string,
    status: ProductBatch["status"],
    reason?: string
  ): Promise<ProductBatch> {
    const updateData: Partial<BatchRow> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === "BLOCKED" && reason) {
      updateData.blocked_reason = reason;
    }

    const { data, error } = await this.client
      .from("product_batches")
      .update(updateData)
      .eq("id", batchId)
      .select("*")
      .single();

    this.handleError("actualizar estado de lote", error);
    return mapBatch(data as BatchRow);
  }

  /**
   * Busca un lote por su código o barcode.
   */
  async findByBatchCodeOrBarcode(term: string): Promise<ProductBatch | null> {
    const { data, error } = await this.client
      .from("product_batches")
      .select("*")
      .or(`batch_code.ilike.%${term}%,batch_barcode.eq.${term}`)
      .limit(1)
      .single();

    this.handleError("buscar lote por código/barcode", error);
    return data ? mapBatch(data as BatchRow) : null;
  }

  /**
   * Verifica si un código de lote ya existe.
   */
  async batchCodeExists(batchCode: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("product_batches")
      .select("id")
      .eq("batch_code", batchCode.toUpperCase())
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 es "no rows returned", que es válido
      this.handleError("verificar código de lote", error);
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
      status: input.status ?? "OK",
      blocked_reason: input.blockedReason ?? null,
      quality_score: input.qualityScore ?? 1.0,
      received_at: input.receivedAt ?? new Date().toISOString(),
      expiry_date: input.expiryDate ?? null,
      manufacture_date: input.manufactureDate ?? null,
      cost_per_unit: input.costPerUnit ?? null,
      location_override: input.locationOverride ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy
    };

    const { data, error } = await this.client
      .from("product_batches")
      .insert(row)
      .select("*")
      .single();

    this.handleError("crear lote", error);
    return mapBatch(data as BatchRow);
  }

  /**
   * Actualiza un lote existente.
   */
  async updateBatch(batchId: string, input: UpdateBatchInput): Promise<ProductBatch> {
    const row: Partial<BatchRow> = {
      updated_at: new Date().toISOString()
    };

    if (input.batchCode !== undefined) row.batch_code = input.batchCode;
    if (input.batchBarcode !== undefined) row.batch_barcode = input.batchBarcode;
    if (input.quantityTotal !== undefined) row.quantity_total = input.quantityTotal;
    if (input.quantityAvailable !== undefined) row.quantity_available = input.quantityAvailable;
    if (input.quantityReserved !== undefined) row.quantity_reserved = input.quantityReserved;
    if (input.defectiveQty !== undefined) row.defective_qty = input.defectiveQty;
    if (input.status !== undefined) row.status = input.status;
    if (input.blockedReason !== undefined) row.blocked_reason = input.blockedReason;
    if (input.qualityScore !== undefined) row.quality_score = input.qualityScore;
    if (input.receivedAt !== undefined) row.received_at = input.receivedAt;
    if (input.expiryDate !== undefined) row.expiry_date = input.expiryDate;
    if (input.manufactureDate !== undefined) row.manufacture_date = input.manufactureDate;
    if (input.costPerUnit !== undefined) row.cost_per_unit = input.costPerUnit;
    if (input.locationOverride !== undefined) row.location_override = input.locationOverride;
    if (input.notes !== undefined) row.notes = input.notes;

    const { data, error } = await this.client
      .from("product_batches")
      .update(row)
      .eq("id", batchId)
      .select("*")
      .single();

    this.handleError("actualizar lote", error);
    return mapBatch(data as BatchRow);
  }
}

