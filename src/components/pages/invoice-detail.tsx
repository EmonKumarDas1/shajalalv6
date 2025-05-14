import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { InvoiceDetail } from "../dashboard/invoices/InvoiceDetail";

export default function InvoiceDetailPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <InvoiceDetail />
      </div>
    </DashboardLayout>
  );
}
