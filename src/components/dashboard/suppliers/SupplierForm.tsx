import { useState } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Supplier } from "@/types/schema";

interface SupplierFormProps {
  supplier?: Supplier;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SupplierForm({
  supplier,
  onSuccess,
  onCancel,
}: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || "");
  const [contact, setContact] = useState(supplier?.contact || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [address, setAddress] = useState(supplier?.address || "");
  const [notes, setNotes] = useState(supplier?.notes || "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier name is required",
      });
      return;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid email address",
      });
      return;
    }

    try {
      setLoading(true);

      // Create a simpler supplier data object with explicit null handling
      const supplierData = {
        name: name.trim(),
        contact: contact.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // Only include created_at for new suppliers
      if (!supplier) {
        supplierData.created_at = new Date().toISOString();
      }

      let result;

      try {
        if (supplier) {
          // Update existing supplier
          result = await supabase
            .from("suppliers")
            .update(supplierData)
            .eq("id", supplier.id)
            .select();
        } else {
          // Create new supplier
          result = await supabase
            .from("suppliers")
            .insert([supplierData])
            .select();
        }

        if (result.error) throw result.error;

        toast({
          title: supplier ? "Supplier updated" : "Supplier created",
          description: supplier
            ? "The supplier has been updated successfully"
            : "The supplier has been created successfully",
        });

        onSuccess();
      } catch (error) {
        console.error("Supabase operation error:", error);
        throw new Error(
          `Database operation failed: ${error.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast({
        variant: "destructive",
        title: `Error ${supplier ? "updating" : "creating"} supplier`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Supplier Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter supplier name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact">Contact Person</Label>
        <Input
          id="contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Enter contact person name"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter additional notes"
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
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              {supplier ? "Updating..." : "Creating..."}
            </span>
          ) : (
            <>{supplier ? "Update Supplier" : "Create Supplier"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
