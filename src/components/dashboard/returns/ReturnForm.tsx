import { useState } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const RETURN_REASONS = [
  "Defective Product",
  "Wrong Item Received",
  "Size/Fit Issue",
  "Changed Mind",
  "Damaged in Transit",
  "Quality Issue",
  "Other",
];

const PRODUCT_CONDITIONS = [
  "New/Unused",
  "Like New",
  "Used",
  "Damaged",
  "Defective",
];

export function ReturnForm({ invoice, onSuccess, onCancel }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProductSelect = (product, quantity, condition) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity, condition } : p,
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity,
          condition,
          // Ensure we're using the correct product_id from the products table
          product_id: product.product_id || product.id,
        },
      ];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast({
        variant: "destructive",
        title: "No products selected",
        description: "Please select at least one product to return",
      });
      return;
    }

    try {
      setLoading(true);

      // Validate quantities
      const invalidQuantities = selectedProducts.some(
        (product) =>
          product.quantity <= 0 || product.quantity > product.max_quantity,
      );

      if (invalidQuantities) {
        throw new Error("Invalid quantities selected");
      }

      // Calculate total return amount
      const totalAmount = selectedProducts.reduce(
        (sum, product) => sum + product.unit_price * product.quantity,
        0,
      );

      // Create return record
      const { data: returnData, error: returnError } = await supabase
        .from("product_returns")
        .insert({
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          total_amount: totalAmount,
          refund_amount: totalAmount, // Can be adjusted based on policy
          status: "pending",
          return_reason: returnReason,
          notes: notes,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (returnError) throw returnError;

      // Create return items
      const returnItems = selectedProducts.map((product) => ({
        return_id: returnData.id,
        product_id: product.product_id || product.id,
        quantity: product.quantity,
        unit_price: product.unit_price,
        total_price: product.unit_price * product.quantity,
        return_reason: returnReason,
        condition: product.condition,
      }));

      const { error: itemsError } = await supabase
        .from("return_items")
        .insert(returnItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Return initiated",
        description: "Return request has been created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        variant: "destructive",
        title: "Error processing return",
        description:
          error.message || "An error occurred while processing the return",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Products to Return</Label>
          <div className="mt-2 space-y-4">
            {invoice.invoice_items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <Input
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleProductSelect(item, 1, "New/Unused");
                    } else {
                      setSelectedProducts((prev) =>
                        prev.filter((p) => p.id !== item.id),
                      );
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-sm text-gray-500">
                    Unit Price: ${item.unit_price}
                  </p>
                </div>
                <Input
                  type="number"
                  min="1"
                  max={item.quantity}
                  className="w-20"
                  placeholder="Qty"
                  onChange={(e) =>
                    handleProductSelect(
                      item,
                      parseInt(e.target.value),
                      "New/Unused",
                    )
                  }
                />
                <Select
                  value={
                    selectedProducts.find((p) => p.id === item.id)?.condition ||
                    "New/Unused"
                  }
                  onValueChange={(value) => handleProductSelect(item, 1, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Return Reason</Label>
          <Select value={returnReason} onValueChange={setReturnReason} required>
            <SelectTrigger>
              <SelectValue placeholder="Select return reason" />
            </SelectTrigger>
            <SelectContent>
              {RETURN_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional details about the return"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || selectedProducts.length === 0}
        >
          {loading ? "Processing..." : "Submit Return"}
        </Button>
      </div>
    </form>
  );
}
