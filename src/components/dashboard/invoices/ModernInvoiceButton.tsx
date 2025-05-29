import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface ModernInvoiceButtonProps {
  invoiceId: string;
}

export function ModernInvoiceButton({ invoiceId }: ModernInvoiceButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="flex items-center gap-1 text-xs p-2"
    >
      <Link to={`/dashboard/invoices/${invoiceId}/modern`}>
        <FileText className="h-3 w-3" /> View Modern Invoice
      </Link>
    </Button>
  );
}
