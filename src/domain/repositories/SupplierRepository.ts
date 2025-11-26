import type { Supplier, ProductSupplier, UUID } from "@domain/entities";

export interface SupplierFilters {
  search?: string;
  city?: string;
  isActive?: boolean;
}

export interface SupplierRepository {
  /**
   * Devuelve proveedores filtrados opcionalmente por texto o ciudad.
   */
  list(filters?: SupplierFilters): Promise<Supplier[]>;

  /**
   * Recupera un proveedor por su identificador.
   */
  findById(id: UUID): Promise<Supplier | null>;

  /**
   * Lista las relaciones proveedor-producto para un producto concreto.
   */
  listProductSuppliers(productId: UUID): Promise<ProductSupplier[]>;
}

