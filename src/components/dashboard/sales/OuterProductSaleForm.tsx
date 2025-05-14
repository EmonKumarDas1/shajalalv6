import { useState } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

type OuterProduct = {
  id: string;
  name: string;
  supplier_id: string;
  supplier_name: string;
  watt: string;
  size: string;
  color: string;
  model: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  subtotal: number;
  discount: number;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
};

interface OuterProductSaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  shopId: string;
  customerName: string;
  customerPhone: string;
}

export function OuterProductSaleForm({
  onSuccess,
  onCancel,
  shopId,
  customerName,
  customerPhone,
}: OuterProductSaleFormProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<OuterProduct[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [subtotal, setSubtotal] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage",
  );
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState<string>("0");
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState<string>("0");
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const navigate = useNavigate();

  // Add a new empty product to the list
  const addNewProduct = () => {
    const newProduct: OuterProduct = {
      id: Date.now().toString(),
      name: "",
      supplier_id: "",
      supplier_name: "",
      watt: "",
      size: "",
      color: "",
      model: "",
      buying_price: 0,
      selling_price: 0,
      quantity: 1,
      subtotal: 0,
      discount: 0,
      discount_type: "percentage",
      discount_amount: 0,
    };

    setProducts([...products, newProduct]);
  };

  // Remove a product from the list
  const removeProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
    calculateTotals(products.filter((product) => product.id !== id));
  };

  // Update product field
  const updateProductField = (
    id: string,
    field: keyof OuterProduct,
    value: string | number,
  ) => {
    const updatedProducts = products.map((product) => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };

        // Recalculate subtotal if quantity or selling_price changes
        if (field === "quantity" || field === "selling_price") {
          const newSubtotal =
            updatedProduct.selling_price * updatedProduct.quantity;
          updatedProduct.subtotal = newSubtotal;

          // Recalculate discount amount
          if (updatedProduct.discount_type === "percentage") {
            updatedProduct.discount_amount =
              (newSubtotal * updatedProduct.discount) / 100;
          } else {
            updatedProduct.discount_amount = Math.min(
              updatedProduct.discount,
              newSubtotal,
            );
          }
        }

        // Recalculate discount amount if discount or discount_type changes
        if (field === "discount" || field === "discount_type") {
          if (updatedProduct.discount_type === "percentage") {
            updatedProduct.discount_amount =
              (updatedProduct.subtotal * updatedProduct.discount) / 100;
          } else {
            updatedProduct.discount_amount = Math.min(
              updatedProduct.discount,
              updatedProduct.subtotal,
            );
          }
        }

        return updatedProduct;
      }
      return product;
    });

    setProducts(updatedProducts);
    calculateTotals(updatedProducts);
  };

  // Calculate totals
  const calculateTotals = (productsList: OuterProduct[]) => {
    const newSubtotal = productsList.reduce(
      (sum, product) => sum + product.subtotal - product.discount_amount,
      0,
    );
    setSubtotal(newSubtotal);

    let newDiscountAmount = 0;
    if (discountType === "percentage") {
      const percentage = parseFloat(discountValue) || 0;
      newDiscountAmount = (newSubtotal * percentage) / 100;
    } else {
      newDiscountAmount = parseFloat(discountValue) || 0;
    }
    setDiscountAmount(newDiscountAmount);

    const newTaxAmount =
      ((newSubtotal - newDiscountAmount) * (parseFloat(taxRate) || 0)) / 100;
    setTaxAmount(newTaxAmount);

    const newTotal = newSubtotal - newDiscountAmount + newTaxAmount;
    setTotalAmount(newTotal);

    const advance = parseFloat(advancePayment) || 0;
    setRemainingAmount(Math.max(0, newTotal - advance));
  };

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching suppliers",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a shop",
      });
      return;
    }

    if (products.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product",
      });
      return;
    }

    // Validate all products have required fields
    const invalidProducts = products.filter(
      (product) =>
        !product.name ||
        !product.supplier_id ||
        product.buying_price <= 0 ||
        product.selling_price <= 0 ||
        product.quantity <= 0,
    );

    if (invalidProducts.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields for all products",
      });
      return;
    }

    try {
      setLoading(true);

      let customerId = null;
      if (customerName && customerPhone) {
        const { data: existingCustomer, error: customerCheckError } =
          await supabase
            .from("customers")
            .select("id")
            .eq("phone", customerPhone)
            .maybeSingle();

        if (customerCheckError) {
          console.error("Error checking customer:", customerCheckError);
        }

        if (!existingCustomer) {
          const { data: newCustomer, error: createCustomerError } =
            await supabase
              .from("customers")
              .insert({
                name: customerName,
                phone: customerPhone,
                created_at: new Date().toISOString(),
              })
              .select();

          if (createCustomerError) {
            console.error("Error creating customer:", createCustomerError);
          } else if (newCustomer && newCustomer.length > 0) {
            customerId = newCustomer[0].id;
          }
        } else {
          customerId = existingCustomer.id;
        }
      }

      // Create products in the database
      for (const product of products) {
        // First, create or get the supplier
        let supplierId = product.supplier_id;
        if (!supplierId) {
          const { data: supplierData, error: supplierError } = await supabase
            .from("suppliers")
            .insert({
              name: product.supplier_name,
              created_at: new Date().toISOString(),
            })
            .select();

          if (supplierError) throw supplierError;
          supplierId = supplierData[0].id;
        }

        // Create the product
        const { data: productData, error: productError } = await supabase
          .from("products")
          .insert({
            name: product.name,
            supplier_id: supplierId,
            shop_id: shopId,
            buying_price: product.buying_price,
            selling_price: product.selling_price,
            quantity: product.quantity,
            watt: product.watt ? parseFloat(product.watt) : null,
            size: product.size || null,
            color: product.color || null,
            model: product.model || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        if (productError) throw productError;

        // Add entry to product_history
        await supabase.from("product_history").insert({
          product_id: productData[0].id,
          quantity: product.quantity,
          action_type: "create",
          notes: "Created during outer product sale",
          created_at: new Date().toISOString(),
        });
      }

      // Create the invoice
      const invoiceNumber = `SALE-${Date.now().toString().slice(-6)}`;
      const paymentStatus =
        parseFloat(advancePayment) <= 0
          ? "unpaid"
          : parseFloat(advancePayment) >= totalAmount
            ? "paid"
            : "partially_paid";

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          total_amount: totalAmount,
          advance_payment: parseFloat(advancePayment) || 0,
          remaining_amount: remainingAmount,
          status: paymentStatus,
          shop_id: shopId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_id: customerId,
          invoice_type: "sales",
          notes: `Outer Product Sale. Discount: ${discountAmount.toFixed(2)}, Tax: ${taxAmount.toFixed(2)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;

      // Create invoice items
      const invoiceItems = products.map((product) => ({
        invoice_id: invoiceId,
        product_id: null, // This will be updated after product creation
        product_name: product.name,
        quantity: product.quantity,
        unit_price: product.selling_price,
        total_price: product.subtotal,
        supplier_name: product.supplier_name,
        created_at: new Date().toISOString(),
        barcode: null,
        watt: product.watt ? parseFloat(product.watt) : null,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Sale completed",
        description: `Invoice #${invoiceNumber} has been generated successfully`,
      });

      navigate(`/dashboard/invoices/${invoiceId}`);
      onSuccess();
    } catch (error) {
      console.error("Error processing sale:", error);
      toast({
        variant: "destructive",
        title: "Error processing sale",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Outer Product Sale</h3>
          <Button
            type="button"
            onClick={addNewProduct}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8 border rounded-md text-gray-500">
            No products added yet. Click "Add Product" to start.
          </div>
        ) : (
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Input
                        placeholder="Product Name"
                        value={product.name}
                        onChange={(e) =>
                          updateProductField(product.id, "name", e.target.value)
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={product.supplier_id}
                        onValueChange={(value) =>
                          updateProductField(product.id, "supplier_id", value)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Input
                          placeholder="Watt"
                          value={product.watt}
                          onChange={(e) =>
                            updateProductField(
                              product.id,
                              "watt",
                              e.target.value,
                            )
                          }
                          className="mb-1"
                        />
                        <Input
                          placeholder="Size"
                          value={product.size}
                          onChange={(e) =>
                            updateProductField(
                              product.id,
                              "size",
                              e.target.value,
                            )
                          }
                          className="mb-1"
                        />
                        <Input
                          placeholder="Color"
                          value={product.color}
                          onChange={(e) =>
                            updateProductField(
                              product.id,
                              "color",
                              e.target.value,
                            )
                          }
                          className="mb-1"
                        />
                        <Input
                          placeholder="Model"
                          value={product.model}
                          onChange={(e) =>
                            updateProductField(
                              product.id,
                              "model",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={product.buying_price || ""}
                        onChange={(e) =>
                          updateProductField(
                            product.id,
                            "buying_price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={product.selling_price || ""}
                        onChange={(e) =>
                          updateProductField(
                            product.id,
                            "selling_price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={product.quantity}
                        onChange={(e) =>
                          updateProductField(
                            product.id,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={product.discount_type}
                          onValueChange={(value: "percentage" | "fixed") =>
                            updateProductField(
                              product.id,
                              "discount_type",
                              value,
                            )
                          }
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">$</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step={
                            product.discount_type === "percentage"
                              ? "1"
                              : "0.01"
                          }
                          value={product.discount}
                          onChange={(e) =>
                            updateProductField(
                              product.id,
                              "discount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-20"
                        />
                      </div>
                      {product.discount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          -${product.discount_amount.toFixed(2)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      ${(product.subtotal - product.discount_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProduct(product.id)}
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
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div></div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Subtotal</Label>
            <Input
              value={`$${subtotal.toFixed(2)}`}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Discount</Label>
            <div className="flex items-center space-x-2">
              <Select
                value={discountType}
                onValueChange={(value: "percentage" | "fixed") =>
                  setDiscountType(value)
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step={discountType === "percentage" ? "1" : "0.01"}
                value={discountValue}
                onChange={(e) => {
                  setDiscountValue(e.target.value);
                  calculateTotals(products);
                }}
                placeholder={discountType === "percentage" ? "0%" : "$0.00"}
              />
            </div>
            <p className="text-sm text-gray-500">
              Discount amount: ${discountAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={(e) => {
                setTaxRate(e.target.value);
                calculateTotals(products);
              }}
              placeholder="0%"
            />
            <p className="text-sm text-gray-500">
              Tax amount: ${taxAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Total Amount</Label>
            <Input
              value={`$${totalAmount.toFixed(2)}`}
              readOnly
              className="bg-gray-50 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="online">Online Payment</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Advance Payment</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              max={totalAmount}
              value={advancePayment}
              onChange={(e) => {
                setAdvancePayment(e.target.value);
                calculateTotals(products);
              }}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Remaining Amount</Label>
            <Input
              value={`$${remainingAmount.toFixed(2)}`}
              readOnly
              className="bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
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
          disabled={loading || products.length === 0}
          className="min-w-[200px]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Processing Sale...
            </span>
          ) : (
            "Complete Sale & Generate Invoice"
          )}
        </Button>
      </div>
    </form>
  );
}
