import type { ProductResponse } from '@/features/products/api';

export interface InventorySummary {
  activeCatalogItems: number;
  stockTrackedItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryValue: number;
}

export function summarizeInventory(products: ProductResponse[]): InventorySummary {
  return products.reduce<InventorySummary>(
    (summary, product) => {
      if (product.active) summary.activeCatalogItems += 1;
      if (!product.active || !product.stockTracked) return summary;

      summary.stockTrackedItems += 1;
      if (product.stockStatus === 'LOW') summary.lowStockItems += 1;
      if (product.stockStatus === 'OUT') summary.outOfStockItems += 1;
      summary.inventoryValue +=
        Number(product.unitPrice ?? 0) * Number(product.stockQuantity ?? 0);
      return summary;
    },
    {
      activeCatalogItems: 0,
      stockTrackedItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      inventoryValue: 0,
    },
  );
}
