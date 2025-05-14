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
import { OthersCost } from "@/types/schema";

interface CostFormProps {
  cost?: OthersCost;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  "Office Supplies",
  "Utilities",
  "Rent",
  "Maintenance",
  "Transportation",
  "Marketing",
  "Miscellaneous",
];

const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check",
  "Mobile Payment",
  "Other",
];

export function CostForm({ cost, onSuccess, onCancel }: CostFormProps) {
  const [description, setDescription] = useState(cost?.description || "");
  const [amount, setAmount] = useState<string>(cost?.amount?.toString() || "");
  const [date, setDate] = useState(
    cost?.date
      ? new Date(cost.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState(cost?.category || "");
  const [paymentMethod, setPaymentMethod] = useState(
    cost?.payment_method || "",
  );
  const [referenceNumber, setReferenceNumber] = useState(
    cost?.reference_number || "",
  );
  const [notes, setNotes] = useState(cost?.notes || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!description.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Description is required",
      });
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Amount must be a positive number",
      });
      return;
    }

    if (!date) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Date is required",
      });
      return;
    }

    try {
      setLoading(true);

      const costData = {
        description: description.trim(),
        amount: Number(amount),
        date: new Date(date).toISOString(),
        category: category || null,
        payment_method: paymentMethod || null,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (cost) {
        // Update existing cost
        result = await supabase
          .from("others_costs")
          .update(costData)
          .eq("id", cost.id)
          .select();
      } else {
        // Create new cost
        result = await supabase
          .from("others_costs")
          .insert([costData])
          .select();
      }

      if (result.error) throw result.error;

      toast({
        title: cost ? "Cost updated" : "Cost created",
        description: cost
          ? "The cost has been updated successfully"
          : "The cost has been created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving cost:", error);
      toast({
        variant: "destructive",
        title: `Error ${cost ? "updating" : "creating"} cost`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter cost description"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference Number</Label>
          <Input
            id="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Enter reference number"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter additional notes"
            rows={3}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {cost ? "Updating..." : "Creating..."}
            </span>
          ) : (
            <>{cost ? "Update Cost" : "Create Cost"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
