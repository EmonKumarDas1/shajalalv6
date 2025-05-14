import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { BatchProductForm } from "../dashboard/products/BatchProductForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Clipboard, Upload } from "lucide-react";

export default function AddProduct() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6 h-full overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Add New Products
              </h1>
              <p className="text-muted-foreground mt-1">
                Add multiple products to your inventory with a single invoice
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/products")}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </div>

        <div className="w-full">
          <div className="bg-white shadow-md rounded-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clipboard className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Product Information</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Fill in the details for all products you want to add or upload
                an Excel file
              </p>
            </div>
            <div className="p-6">
              <BatchProductForm
                onSuccess={() => navigate("/dashboard/products")}
                onCancel={() => navigate("/dashboard/products")}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
