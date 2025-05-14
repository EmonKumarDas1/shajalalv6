import React from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { CustomersTable } from "../dashboard/customers/CustomersTable";

export default function Customers() {
  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-gray-500">
            Manage your customers, view purchase history, and track payments.
          </p>
        </div>
        <CustomersTable />
      </div>
    </DashboardLayout>
  );
}
