import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { CustomerSelection } from "../sales/CustomerSelection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NewInvoiceFormProps {
  onClose: () => void;
  open: boolean;
}

type InvoiceItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_watt?: number | null;
  product_size?: string | null;
  product_color?: string | null;
  product_model?: string | null;
};

export function NewInvoiceForm({ onClose, open }: NewInvoiceFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string>("");
  const [shops, setShops] = useState<any[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(
    "fixed",
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [amountAfterDiscount, setAmountAfterDiscount] = useState(0);
  const [previousDues, setPreviousDues] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchShops();
      addNewItem();
    }
  }, [open]);

  useEffect(() => {
    // Calculate total amount
    const total = invoiceItems.reduce((sum, item) => sum + item.total_price, 0);
    setTotalAmount(total);

    // Calculate discount amount
    let finalDiscount = discount;
    if (discountType === "percentage") {
      finalDiscount = (total * discount) / 100;
    }
    setDiscountAmount(finalDiscount);

    // Calculate amount after discount
    setAmountAfterDiscount(total - finalDiscount);
  }, [invoiceItems, discount, discountType]);

  useEffect(() => {
    // Calculate remaining amount
    setRemainingAmount(Math.max(0, amountAfterDiscount - advancePayment));
  }, [amountAfterDiscount, advancePayment]);

  useEffect(() => {
    if (customerName && customerPhone) {
      fetchCustomerDetails();
    }
  }, [customerName, customerPhone]);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase.from("shops").select("*");
      if (error) throw error;
      setShops(data || []);
      if (data && data.length > 0) {
        setShopId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch shops",
      });
    }
  };

  const fetchCustomerDetails = async () => {
    try {
      // Check if customer exists
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", customerPhone)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerId(data.id);

        // Fetch previous dues
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("remaining_amount")
          .eq("customer_id", data.id)
          .eq("status", "unpaid")
          .or("status.eq.partially_paid");

        if (invoicesError) throw invoicesError;

        const totalDues =
          invoices?.reduce(
            (sum, inv) => sum + (inv.remaining_amount || 0),
            0,
          ) || 0;

        setPreviousDues(totalDues);
      } else {
        setCustomerId(null);
        setPreviousDues(0);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
    }
  };

  const handleCustomerSelected = (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
  };

  const addNewItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      product_name: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const removeItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(
      invoiceItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };

          // Recalculate total price if quantity or unit price changes
          if (field === "quantity" || field === "unit_price") {
            updatedItem.total_price =
              updatedItem.quantity * updatedItem.unit_price;
          }

          return updatedItem;
        }
        return item;
      }),
    );
  };

  const handleFullPay = () => {
    setAdvancePayment(amountAfterDiscount);
  };

  const handleSubmit = async () => {
    // Validation
    if (!customerName) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Customer name is required",
      });
      return;
    }

    if (!shopId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Shop is required",
      });
      return;
    }

    if (invoiceItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one item is required",
      });
      return;
    }

    const invalidItems = invoiceItems.filter(
      (item) =>
        !item.product_name || item.quantity <= 0 || item.unit_price <= 0,
    );

    if (invalidItems.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "All items must have a name, quantity, and price",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Create or update customer
      let customerId = null;
      if (customerName && customerPhone) {
        const { data: existingCustomer, error: customerCheckError } =
          await supabase
            .from("customers")
            .select("id")
            .eq("phone", customerPhone)
            .maybeSingle();

        if (customerCheckError) throw customerCheckError;

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: createCustomerError } =
            await supabase
              .from("customers")
              .insert({
                name: customerName,
                phone: customerPhone,
                created_at: new Date().toISOString(),
              })
              .select();

          if (createCustomerError) throw createCustomerError;
          if (newCustomer && newCustomer.length > 0) {
            customerId = newCustomer[0].id;
          }
        }
      }

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // Determine invoice status
      const invoiceStatus =
        advancePayment <= 0
          ? "unpaid"
          : advancePayment >= amountAfterDiscount
            ? "paid"
            : "partially_paid";

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          advance_payment: advancePayment,
          remaining_amount: remainingAmount,
          discount: discountAmount,
          discount_percentage: discountType === "percentage" ? discount : null,
          amount_after_discount: amountAfterDiscount,
          status: invoiceStatus,
          shop_id: shopId,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customerPhone,
          invoice_type: "sales",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes:
            previousDues > 0 ? `Previous Due: ${previousDues.toFixed(2)}` : "",
        })
        .select();

      if (invoiceError) throw invoiceError;
      if (!invoiceData || invoiceData.length === 0)
        throw new Error("Failed to create invoice");

      const invoiceId = invoiceData[0].id;

      // Create invoice items
      const invoiceItemsData = invoiceItems.map((item) => ({
        invoice_id: invoiceId,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        watt: item.product_watt,
        size: item.product_size,
        color: item.product_color,
        model: item.product_model,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsData);

      if (itemsError) throw itemsError;

      // Create payment record if advance payment is provided
      if (advancePayment > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          invoice_id: invoiceId,
          amount: advancePayment,
          payment_method: "cash",
          payment_date: new Date().toISOString(),
        });

        if (paymentError) throw paymentError;
      }

      toast({
        title: "Success",
        description: `Invoice #${invoiceNumber} created successfully`,
      });

      // Navigate to the invoice detail page
      navigate(`/dashboard/invoices/${invoiceId}`);
      onClose();
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create invoice",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Customer Information</h3>
            <CustomerSelection
              onCustomerSelected={handleCustomerSelected}
              initialName={customerName}
              initialPhone={customerPhone}
            />

            {previousDues > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-yellow-800 font-medium">
                  Previous Due: ${previousDues.toFixed(2)}
                </p>
                <p className="text-xs text-yellow-600">
                  This customer has outstanding dues from previous invoices
                </p>
              </div>
            )}
          </div>

          {/* Shop Selection */}
          <div className="space-y-2">
            <Label htmlFor="shop">Shop</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger id="shop">
                <SelectValue placeholder="Select shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invoice Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Invoice Items</h3>
              <Button
                type="button"
                size="sm"
                onClick={addNewItem}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoiceItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.product_name}
                          onChange={(e) =>
                            updateItem(item.id, "product_name", e.target.value)
                          }
                          placeholder="Product name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                          min="1"
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              "unit_price",
                              Number(e.target.value),
                            )
                          }
                          min="0"
                          step="0.01"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>${item.total_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={invoiceItems.length <= 1}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  value={totalAmount.toFixed(2)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    min="0"
                    className="flex-1"
                  />
                  <Select
                    value={discountType}
                    onValueChange={(value: "fixed" | "percentage") =>
                      setDiscountType(value)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountAfterDiscount">
                  Amount After Discount
                </Label>
                <Input
                  id="amountAfterDiscount"
                  value={amountAfterDiscount.toFixed(2)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advancePayment">Advance Payment</Label>
                <div className="flex gap-2">
                  <Input
                    id="advancePayment"
                    type="number"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(Number(e.target.value))}
                    min="0"
                    max={amountAfterDiscount}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFullPay}
                  >
                    Full Pay
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remainingAmount">Remaining Amount</Label>
                <Input
                  id="remainingAmount"
                  value={remainingAmount.toFixed(2)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              {previousDues > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="totalDue">
                    Total Due (Current + Previous)
                  </Label>
                  <Input
                    id="totalDue"
                    value={(remainingAmount + previousDues).toFixed(2)}
                    readOnly
                    className="bg-gray-50 font-medium text-red-600"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
