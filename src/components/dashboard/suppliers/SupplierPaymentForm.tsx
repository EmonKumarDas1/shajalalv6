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
import { Supplier } from "@/types/schema";

interface SupplierPaymentFormProps {
  supplier: Supplier;
  pendingAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupplierPaymentForm({
  supplier,
  pendingAmount,
  onSuccess,
  onCancel,
}: SupplierPaymentFormProps) {
  const [amount, setAmount] = useState<string>(pendingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Amount must be a positive number",
      });
      return;
    }

    if (Number(amount) > pendingAmount) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Payment amount cannot exceed the pending amount of ${pendingAmount.toFixed(2)}`,
      });
      return;
    }

    try {
      setLoading(true);

      // Try to use the supplier_payments table directly
      // The migration should have created it already
      try {
        // Record the payment
        const { error: paymentError } = await supabase
          .from("supplier_payments")
          .insert({
            supplier_id: supplier.id,
            amount: Number(amount),
            payment_date: new Date().toISOString(),
            payment_method: paymentMethod,
            reference_number: referenceNumber || null,
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (paymentError) {
          if (paymentError.code === "PGRST116") {
            // Table doesn't exist, show a more helpful error
            throw new Error(
              "The supplier_payments table doesn't exist. Please run the migration file to set up the database properly.",
            );
          }
          throw paymentError;
        }
      } catch (error) {
        console.error("Error recording payment:", error);
        throw error;
      }

      // Payment should be recorded by now if the try block succeeded

      // Update the remaining_amount for products from this supplier
      // This is a simplified approach - in a real system, you'd need to track
      // which specific products are being paid for
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, remaining_amount")
        .eq("supplier_id", supplier.id)
        .gt("remaining_amount", 0)
        .order("created_at");

      if (productsError) throw productsError;

      let remainingPayment = Number(amount);

      // Apply payment to products in order (oldest first)
      for (const product of productsData || []) {
        if (remainingPayment <= 0) break;

        const currentRemaining = Number(product.remaining_amount);
        const paymentToApply = Math.min(remainingPayment, currentRemaining);

        // Update this product's remaining amount
        const { error: updateError } = await supabase
          .from("products")
          .update({
            remaining_amount: currentRemaining - paymentToApply,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateError) throw updateError;

        remainingPayment -= paymentToApply;
      }

      toast({
        title: "Payment recorded",
        description: `Payment of ${Number(amount).toFixed(2)} to ${supplier.name} has been recorded successfully.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        variant: "destructive",
        title: "Error recording payment",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Payment Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          max={pendingAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
        <p className="text-xs text-gray-500">
          Maximum amount: ${pendingAmount.toFixed(2)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="credit_card">Credit Card</SelectItem>
            <SelectItem value="online">Online Payment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referenceNumber">Reference Number</Label>
        <Input
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Enter reference number (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter additional notes (optional)"
          rows={3}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Processing Payment...
            </span>
          ) : (
            "Record Payment"
          )}
        </Button>
      </div>
    </form>
  );
}
