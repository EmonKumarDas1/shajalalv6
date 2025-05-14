import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { OrdersTable } from "../dashboard/orders/OrdersTable";

export default function Orders() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-gray-500">Manage customer orders</p>
        </div>
        <OrdersTable />
      </div>
    </DashboardLayout>
  );
}
