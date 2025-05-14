import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { ShopsTable } from "../dashboard/shops/ShopsTable";

export default function Shops() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shops</h1>
          <p className="text-gray-500">Manage your shop locations</p>
        </div>
        <ShopsTable />
      </div>
    </DashboardLayout>
  );
}
