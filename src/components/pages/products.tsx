import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { ProductsTable } from "../dashboard/products/ProductsTable";

export default function Products() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-gray-500">Manage your product inventory</p>
        </div>
        <ProductsTable />
      </div>
    </DashboardLayout>
  );
}
