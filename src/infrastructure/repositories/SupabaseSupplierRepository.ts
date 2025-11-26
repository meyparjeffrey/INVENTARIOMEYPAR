import type {
  ProductSupplier,
  Supplier
} from "@domain/entities";
import type {
  SupplierFilters,
  SupplierRepository
} from "@domain/repositories/SupplierRepository";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";

type SupplierRow = {
  id: string;
  code: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  tax_id: string | null;
  payment_terms: string | null;
  lead_time_days: number;
  quality_rating: number;
  total_batches_supplied: number;
  defective_batches_count: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductSupplierRow = {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_product_code: string | null;
  cost_price: number | null;
  is_preferred: boolean;
  min_order_quantity: number;
  created_at: string;
};

const mapSupplier = (row: SupplierRow): Supplier => ({
  id: row.id,
  code: row.code,
  name: row.name,
  contactName: row.contact_name,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  address: row.address,
  city: row.city,
  country: row.country,
  taxId: row.tax_id,
  paymentTerms: row.payment_terms,
  leadTimeDays: row.lead_time_days,
  qualityRating: row.quality_rating,
  totalBatchesSupplied: row.total_batches_supplied,
  defectiveBatchesCount: row.defective_batches_count,
  notes: row.notes,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapProductSupplier = (row: ProductSupplierRow): ProductSupplier => ({
  id: row.id,
  productId: row.product_id,
  supplierId: row.supplier_id,
  supplierProductCode: row.supplier_product_code,
  costPrice: row.cost_price,
  isPreferred: row.is_preferred,
  minOrderQuantity: row.min_order_quantity,
  createdAt: row.created_at
});

export class SupabaseSupplierRepository
  extends BaseSupabaseRepository
  implements SupplierRepository
{
  async list(filters?: SupplierFilters) {
    let query = this.client
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (filters?.city) {
      query = query.eq("city", filters.city);
    }

    if (typeof filters?.isActive === "boolean") {
      query = query.eq("is_active", filters.isActive);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${term},code.ilike.${term},contact_name.ilike.${term}`
      );
    }

    const { data, error } = await query;
    this.handleError("listar proveedores", error);
    return (data ?? []).map((row) => mapSupplier(row as SupplierRow));
  }

  async findById(id: string) {
    const { data, error } = await this.client
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    this.handleError("buscar proveedor por id", error);
    return data ? mapSupplier(data as SupplierRow) : null;
  }

  async listProductSuppliers(productId: string) {
    const { data, error } = await this.client
      .from("product_suppliers")
      .select("*")
      .eq("product_id", productId)
      .order("is_preferred", { ascending: false });
    this.handleError("listar proveedores por producto", error);
    return (data ?? []).map((row) =>
      mapProductSupplier(row as ProductSupplierRow)
    );
  }
}

