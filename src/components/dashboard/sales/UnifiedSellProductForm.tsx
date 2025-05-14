import { useState, useEffect } from "react";
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
import { Product } from "@/types/schema";
import { Trash2, Plus, ShoppingCart, FileText, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductSearch } from "./ProductSearch";

type CartItemType = "regular" | "outer";

type CartItem = {
  id: string;
  product_id: string;
  name: string;
  barcode: string | null;
  selling_price: number;
  buying_price: number;
  quantity: number;
  available_quantity: number;
  subtotal: number;
  supplier_name: string;
  supplier_id: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
  type: CartItemType;
  watt: string | null;
  size: string | null;
  color: string | null;
  model: string | null;
};

interface UnifiedSellProductFormProps {
  shopId: string;
  customerName: string;
  customerPhone: string;
}

export function UnifiedSellProductForm({
  shopId,
  customerName,
  customerPhone,
}: UnifiedSellProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [newOuterProduct, setNewOuterProduct] = useState({
    name: "",
    supplier_id: "",
    watt: "",
    size: "",
    color: "",
    model: "",
    buying_price: 0,
    selling_price: 0,
    quantity: 1,
  });
  const [showAddOuterProduct, setShowAddOuterProduct] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (shopId) {
      fetchSuppliers();
    }
  }, [shopId]);

  useEffect(() => {
    calculateTotals();
  }, [cartItems, discountType, discountValue, taxRate, advancePayment]);

  async function fetchSuppliers() {
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
  }

  const calculateTotals = () => {
    // Calculate subtotal after per-product discounts
    const itemsSubtotal = cartItems.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    const perProductDiscounts = cartItems.reduce(
      (sum, item) => sum + (item.discount_amount || 0),
      0,
    );
    const newSubtotal = itemsSubtotal - perProductDiscounts;

    setSubtotal(newSubtotal);

    // Calculate additional cart-level discount
    let newDiscountAmount = 0;
    if (discountType === "percentage") {
      const percentage = parseFloat(discountValue) || 0;
      newDiscountAmount = (newSubtotal * percentage) / 100;
    } else {
      newDiscountAmount = parseFloat(discountValue) || 0;
    }
    setDiscountAmount(newDiscountAmount);

    // Calculate tax on amount after all discounts
    const newTaxAmount =
      ((newSubtotal - newDiscountAmount) * (parseFloat(taxRate) || 0)) / 100;
    setTaxAmount(newTaxAmount);

    // Calculate final total
    const newTotal = newSubtotal - newDiscountAmount + newTaxAmount;
    setTotalAmount(newTotal);

    const advance = parseFloat(advancePayment) || 0;
    setRemainingAmount(Math.max(0, newTotal - advance));
  };

  const handleAddToCart = async (
    product: Product,
    type: CartItemType = "regular",
  ) => {
    if (type === "regular") {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", product.id)
        .single();

      if (productError) {
        toast({
          variant: "destructive",
          title: "Error fetching product details",
          description: productError.message,
        });
        return;
      }

      let supplierName = "Unknown";
      if (productData.supplier_id) {
        const { data: supplierData, error: supplierError } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", productData.supplier_id)
          .single();

        if (supplierError) {
          console.error("Error fetching supplier:", supplierError);
        } else {
          supplierName = supplierData?.name || "Unknown";
        }
      }

      const existingItemIndex = cartItems.findIndex(
        (item) => item.product_id === product.id && item.type === "regular",
      );

      if (existingItemIndex >= 0) {
        const updatedItems = [...cartItems];
        const item = updatedItems[existingItemIndex];

        if (item.quantity >= product.quantity) {
          toast({
            variant: "destructive",
            title: "Insufficient stock",
            description: `Only ${product.quantity} units available for ${product.name}`,
          });
          return;
        }

        item.quantity += 1;
        item.subtotal = item.selling_price * item.quantity;
        // Recalculate discount amount
        if (item.discount_type === "percentage") {
          item.discount_amount = (item.subtotal * item.discount) / 100;
        } else {
          item.discount_amount = Math.min(item.discount, item.subtotal);
        }
        setCartItems(updatedItems);
      } else {
        if (product.quantity <= 0) {
          toast({
            variant: "destructive",
            title: "Out of stock",
            description: `${product.name} is out of stock`,
          });
          return;
        }

        const newItem: CartItem = {
          id: Date.now().toString(),
          product_id: product.id,
          name: product.name || "Unknown Product",
          barcode: product.barcode,
          selling_price: product.selling_price,
          buying_price: product.buying_price || 0,
          quantity: 1,
          available_quantity: product.quantity,
          subtotal: product.selling_price,
          supplier_name: supplierName || "Unknown Supplier",
          supplier_id: product.supplier_id || "",
          discount: 0,
          discount_type: "percentage",
          discount_amount: 0,
          type: "regular",
          watt: product.watt ? product.watt.toString() : null,
          size: product.size,
          color: product.color,
          model: product.model,
        };

        setCartItems([...cartItems, newItem]);
      }

      toast({
        title: "Product added",
        description: `${product.name || "Product"} added to cart`,
      });
    }
  };

  const handleAddOuterProduct = () => {
    if (
      !newOuterProduct.name ||
      !newOuterProduct.supplier_id ||
      newOuterProduct.buying_price <= 0 ||
      newOuterProduct.selling_price <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields for the outer product",
      });
      return;
    }

    const supplierName =
      suppliers.find((s) => s.id === newOuterProduct.supplier_id)?.name ||
      "Unknown";

    const newItem: CartItem = {
      id: Date.now().toString(),
      product_id: `outer-${Date.now()}`,
      name: newOuterProduct.name,
      barcode: null,
      selling_price: newOuterProduct.selling_price,
      buying_price: newOuterProduct.buying_price,
      quantity: newOuterProduct.quantity,
      available_quantity: 999, // Outer products don't have inventory constraints
      subtotal: newOuterProduct.selling_price * newOuterProduct.quantity,
      supplier_name: supplierName,
      supplier_id: newOuterProduct.supplier_id,
      discount: 0,
      discount_type: "percentage",
      discount_amount: 0,
      type: "outer",
      watt: newOuterProduct.watt || null,
      size: newOuterProduct.size || null,
      color: newOuterProduct.color || null,
      model: newOuterProduct.model || null,
    };

    setCartItems([...cartItems, newItem]);

    // Reset form
    setNewOuterProduct({
      name: "",
      supplier_id: "",
      watt: "",
      size: "",
      color: "",
      model: "",
      buying_price: 0,
      selling_price: 0,
      quantity: 1,
    });

    setShowAddOuterProduct(false);

    toast({
      title: "Outer product added",
      description: `${newOuterProduct.name} added to cart`,
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        if (item.type === "regular" && newQuantity > item.available_quantity) {
          toast({
            variant: "destructive",
            title: "Insufficient stock",
            description: `Only ${item.available_quantity} units available for ${item.name}`,
          });
          newQuantity = item.available_quantity;
        }

        if (newQuantity < 1) newQuantity = 1;

        const newSubtotal = item.selling_price * newQuantity;
        let discountAmount = 0;

        if (item.discount_type === "percentage") {
          discountAmount = (newSubtotal * item.discount) / 100;
        } else {
          discountAmount = Math.min(item.discount, newSubtotal);
        }

        return {
          ...item,
          quantity: newQuantity,
          subtotal: newSubtotal,
          discount_amount: discountAmount,
        };
      }
      return item;
    });

    setCartItems(updatedItems);
  };

  const handlePriceChange = (itemId: string, newPrice: number) => {
    if (newPrice <= 0) return;

    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        const newSubtotal = newPrice * item.quantity;
        let discountAmount = 0;

        if (item.discount_type === "percentage") {
          discountAmount = (newSubtotal * item.discount) / 100;
        } else {
          discountAmount = Math.min(item.discount, newSubtotal);
        }

        return {
          ...item,
          selling_price: newPrice,
          subtotal: newSubtotal,
          discount_amount: discountAmount,
        };
      }
      return item;
    });

    setCartItems(updatedItems);
  };

  const handleBuyingPriceChange = (itemId: string, newPrice: number) => {
    if (newPrice < 0) return;

    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          buying_price: newPrice,
        };
      }
      return item;
    });

    setCartItems(updatedItems);
  };

  const handleDiscountChange = (
    itemId: string,
    discount: number,
    discountType: "percentage" | "fixed",
  ) => {
    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        let discountAmount = 0;

        if (discountType === "percentage") {
          discountAmount = (item.subtotal * discount) / 100;
        } else {
          discountAmount = Math.min(discount, item.subtotal);
        }

        return {
          ...item,
          discount,
          discount_type: discountType,
          discount_amount: discountAmount,
        };
      }
      return item;
    });

    setCartItems(updatedItems);
  };

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

    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product to the cart",
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

      // Check if we're adding to an existing invoice
      const urlParams = new URLSearchParams(window.location.search);
      const existingInvoiceId = urlParams.get("invoice_id") || "";

      // Create a variable to store the invoice number for new invoices
      let invoiceNumber = `SALE-${Date.now().toString().slice(-6)}`;

      if (existingInvoiceId) {
        // Update existing invoice
        invoiceNumber = existingInvoiceId;

        // Get current invoice details
        const { data: currentInvoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", existingInvoiceId)
          .single();

        if (invoiceError) throw invoiceError;

        // Calculate new total amount
        const newTotalAmount = currentInvoice.total_amount + totalAmount;
        const newRemainingAmount =
          newTotalAmount - currentInvoice.advance_payment;
        const newStatus =
          newRemainingAmount <= 0
            ? "paid"
            : newRemainingAmount < newTotalAmount
              ? "partially_paid"
              : "unpaid";

        // Update the invoice
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            total_amount: newTotalAmount,
            remaining_amount: newRemainingAmount,
            status: newStatus,
            updated_at: new Date().toISOString(),
            notes: `${currentInvoice.notes || ""} | Additional items added: Discount: ${discountAmount.toFixed(2)}, Tax: ${taxAmount.toFixed(2)}`,
          })
          .eq("id", existingInvoiceId);

        if (updateError) throw updateError;
      } else {
        // Determine payment status based on remaining amount
        const advancePaymentAmount = parseFloat(advancePayment) || 0;
        const paymentStatus =
          advancePaymentAmount >= totalAmount
            ? "paid"
            : advancePaymentAmount > 0
              ? "partially_paid"
              : "unpaid";

        // Calculate separate totals for regular and outer products
        const regularProductsTotal = cartItems
          .filter((item) => item.type === "regular")
          .reduce(
            (sum, item) => sum + (item.subtotal - item.discount_amount),
            0,
          );

        const outerProductsTotal = cartItems
          .filter((item) => item.type === "outer")
          .reduce(
            (sum, item) => sum + (item.subtotal - item.discount_amount),
            0,
          );

        // Apply tax and discount proportionally
        const regularProportion =
          totalAmount > 0
            ? regularProductsTotal / (regularProductsTotal + outerProductsTotal)
            : 0;
        const regularTax = taxAmount * regularProportion;
        const regularDiscount = discountAmount * regularProportion;

        // For dashboard income calculation, we need to separate regular and outer products
        // The total_amount should only include regular products for income calculation purposes
        // Outer products will be tracked separately in invoice_items with is_outer_product flag

        // Calculate the total amount WITHOUT outer products for income calculation
        const regularOnlyTotal =
          regularProductsTotal - regularDiscount + regularTax;

        const { data: invoiceData, error: invoiceError } = await supabase
          .from("invoices")
          .insert({
            invoice_number: invoiceNumber,
            // Store the regular products total only in total_amount for income calculation
            total_amount: regularOnlyTotal,
            // Store the full amount including outer products in the notes for display purposes
            advance_payment: advancePaymentAmount,
            remaining_amount: remainingAmount,
            status: paymentStatus,
            shop_id: shopId,
            customer_name: customerName || null,
            customer_phone: customerPhone || null,
            customer_id: customerId,
            invoice_type: "sales",
            notes: `Discount: ${discountAmount.toFixed(2)}, Tax: ${taxAmount.toFixed(2)}, OuterProductsTotal: ${outerProductsTotal.toFixed(2)}, FullTotal: ${totalAmount.toFixed(2)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        if (invoiceError) throw invoiceError;
        invoiceNumber = invoiceData[0].invoice_number;
      }

      // Process regular products (update inventory)
      const regularProducts = cartItems.filter(
        (item) => item.type === "regular",
      );
      for (const item of regularProducts) {
        // Update product quantity and potentially the selling price
        const { error: updateError } = await supabase
          .from("products")
          .update({
            quantity: item.available_quantity - item.quantity,
            selling_price: item.selling_price, // Update the product's selling price
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.product_id);

        if (updateError) throw updateError;
      }

      // Process outer products - do NOT add them to the products database
      // We'll only track them in the invoice_items table with is_outer_product=true
      // Outer product income is only calculated when payment is received
      const outerProducts = cartItems.filter((item) => item.type === "outer");
      // We're intentionally not adding outer products to the products table
      // This is to keep them separate from the regular inventory

      // Get the invoice ID (either from existing or newly created invoice)
      let invoiceId;
      if (existingInvoiceId) {
        invoiceId = existingInvoiceId;
      } else if (
        typeof invoiceData !== "undefined" &&
        invoiceData &&
        invoiceData.length > 0 &&
        invoiceData[0] &&
        invoiceData[0].id
      ) {
        invoiceId = invoiceData[0].id;
      } else {
        // If we can't get the invoice ID from invoiceData, try to fetch it using the invoice number
        try {
          const { data: fetchedInvoice, error: fetchError } = await supabase
            .from("invoices")
            .select("id")
            .eq("invoice_number", invoiceNumber)
            .single();

          if (fetchError || !fetchedInvoice) {
            throw new Error(
              `Failed to get invoice ID for invoice number ${invoiceNumber}`,
            );
          }

          invoiceId = fetchedInvoice.id;
        } catch (fetchError) {
          console.error("Error fetching invoice ID:", fetchError);
          throw new Error(
            `Failed to get invoice ID: ${fetchError.message || "Unknown error"}`,
          );
        }
      }

      // Create invoice items for all products
      const invoiceItems = cartItems.map((item) => {
        // For outer products, only record profit if payment is received
        // Always store the actual buying price, but we'll calculate profit separately based on payments
        return {
          invoice_id: invoiceId,
          product_id: item.type === "regular" ? item.product_id : null,
          quantity: item.quantity,
          unit_price: item.selling_price,
          total_price: item.subtotal,
          supplier_name: item.supplier_name || "Unknown Supplier",
          created_at: new Date().toISOString(),
          product_name: item.name || "Unknown Product",
          barcode: item.barcode || "",
          watt: item.watt ? parseFloat(item.watt) : null,
          discount: item.discount || 0,
          discount_type: item.discount_type || "percentage",
          discount_amount: item.discount_amount || 0,
          is_outer_product: item.type === "outer",
          buying_price: item.buying_price || 0, // Always store the actual buying price
          size: item.size || null,
          color: item.color || null,
          model: item.model || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Create payment record if advance payment is provided
      const advancePaymentAmount = parseFloat(advancePayment) || 0;
      if (advancePaymentAmount > 0) {
        const { error: paymentError } = await supabase.from("payments").insert({
          invoice_id: invoiceId,
          amount: advancePaymentAmount,
          payment_method: paymentMethod,
          payment_date: new Date().toISOString(),
          notes: "Advance payment during sale",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (paymentError) {
          console.error("Error creating payment record:", paymentError);
          // Don't throw error here, just log it - we don't want to fail the whole transaction
        }
      }

      toast({
        title: existingInvoiceId
          ? "Products added to invoice"
          : "Sale completed",
        description: existingInvoiceId
          ? "Products have been added to the existing invoice successfully"
          : `Invoice #${invoiceNumber} has been generated successfully`,
      });

      // Navigate to the invoice detail page using the invoice ID instead of invoice number
      if (invoiceId) {
        navigate(`/dashboard/invoices/${invoiceId}`);
      } else {
        // Fallback to using invoice number if ID is not available
        navigate(`/dashboard/invoices/${invoiceNumber}`);
      }
    } catch (error) {
      console.error("Error processing sale:", error);
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        errorMessage = JSON.stringify(error);
      }
      toast({
        variant: "destructive",
        title: "Error processing sale",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "products" | "cart")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" id="products-tab">
            Products
          </TabsTrigger>
          <TabsTrigger
            value="cart"
            id="cart-tab"
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {cartItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {cartItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Regular Products</h3>
            <Button
              variant="outline"
              onClick={() => setShowAddOuterProduct(!showAddOuterProduct)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showAddOuterProduct
                ? "Hide Outer Product Form"
                : "Add Outer Product"}
            </Button>
          </div>

          {showAddOuterProduct && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Add Outer Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        placeholder="Enter product name"
                        value={newOuterProduct.name}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="supplier">Supplier *</Label>
                      <Select
                        value={newOuterProduct.supplier_id}
                        onValueChange={(value) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            supplier_id: value,
                          })
                        }
                      >
                        <SelectTrigger id="supplier">
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="buying-price">Buying Price *</Label>
                        <Input
                          id="buying-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={newOuterProduct.buying_price || ""}
                          onChange={(e) =>
                            setNewOuterProduct({
                              ...newOuterProduct,
                              buying_price: parseFloat(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="selling-price">Selling Price *</Label>
                        <Input
                          id="selling-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={newOuterProduct.selling_price || ""}
                          onChange={(e) =>
                            setNewOuterProduct({
                              ...newOuterProduct,
                              selling_price: parseFloat(e.target.value) || 0,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={newOuterProduct.quantity}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="watt">Watt</Label>
                      <Input
                        id="watt"
                        placeholder="Enter watt"
                        value={newOuterProduct.watt}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            watt: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="size">Size</Label>
                      <Input
                        id="size"
                        placeholder="Enter size"
                        value={newOuterProduct.size}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            size: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        placeholder="Enter color"
                        value={newOuterProduct.color}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            color: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="Enter model"
                        value={newOuterProduct.model}
                        onChange={(e) =>
                          setNewOuterProduct({
                            ...newOuterProduct,
                            model: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleAddOuterProduct}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <ProductSearch onAddToCart={handleAddToCart} shopId={shopId} />
        </TabsContent>

        <TabsContent value="cart" className="space-y-6 mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Shopping Cart</h3>
                        <p className="text-sm text-gray-500">
                          {cartItems.length} items in cart
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setActiveTab("products")}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" /> Add More Products
                        </Button>
                      </div>
                    </div>

                    {cartItems.length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-700 mb-1">
                          Your cart is empty
                        </h3>
                        <p className="text-gray-500 mb-4">
                          Add products to proceed with the sale
                        </p>
                        <Button
                          onClick={() => setActiveTab("products")}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Browse Products
                        </Button>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-auto max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Product</TableHead>
                              <TableHead>Supplier</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Buy Price</TableHead>
                              <TableHead>Sell Price</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Discount</TableHead>
                              <TableHead>Subtotal</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cartItems.map((item) => {
                              // Calculate profit margin for this item
                              const profit =
                                item.selling_price - item.buying_price;
                              const profitMargin =
                                item.buying_price > 0
                                  ? (profit / item.buying_price) * 100
                                  : 0;

                              return (
                                <TableRow
                                  key={item.id}
                                  className={
                                    item.type === "outer" ? "bg-blue-50" : ""
                                  }
                                >
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      {item.barcode && (
                                        <p className="text-xs text-gray-500">
                                          Barcode: {item.barcode}
                                        </p>
                                      )}
                                      <div className="text-xs text-gray-500 mt-1">
                                        {item.watt && (
                                          <span className="mr-2">
                                            Watt: {item.watt}
                                          </span>
                                        )}
                                        {item.size && (
                                          <span className="mr-2">
                                            Size: {item.size}
                                          </span>
                                        )}
                                        {item.color && (
                                          <span className="mr-2">
                                            Color: {item.color}
                                          </span>
                                        )}
                                        {item.model && (
                                          <span>Model: {item.model}</span>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{item.supplier_name}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        item.type === "regular"
                                          ? "default"
                                          : "outline"
                                      }
                                      className={
                                        item.type === "outer"
                                          ? "border-blue-200 bg-blue-100 text-blue-700"
                                          : ""
                                      }
                                    >
                                      {item.type === "regular"
                                        ? "Regular"
                                        : "Outer"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.buying_price}
                                      onChange={(e) => {
                                        const newPrice =
                                          parseFloat(e.target.value) || 0;
                                        handleBuyingPriceChange(
                                          item.id,
                                          newPrice,
                                        );
                                      }}
                                      className={`w-24 text-right ${item.type === "outer" ? "border-blue-200" : ""}`}
                                      disabled={item.type === "regular"}
                                    />
                                    {item.type === "outer" &&
                                      item.buying_price > 0 && (
                                        <p className="text-xs text-blue-600 mt-1">
                                          Cost: $
                                          {(
                                            item.buying_price * item.quantity
                                          ).toFixed(2)}
                                        </p>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={item.selling_price}
                                      onChange={(e) => {
                                        const newPrice =
                                          parseFloat(e.target.value) || 0;
                                        handlePriceChange(item.id, newPrice);
                                      }}
                                      className={`w-24 text-right ${item.type === "outer" ? "border-blue-200" : ""}`}
                                    />
                                    {item.buying_price > 0 && (
                                      <p className="text-xs text-green-600 mt-1">
                                        Margin: {Math.round(profitMargin)}%
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          handleQuantityChange(
                                            item.id,
                                            item.quantity - 1,
                                          )
                                        }
                                        disabled={item.quantity <= 1}
                                      >
                                        -
                                      </Button>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={
                                          item.type === "regular"
                                            ? item.available_quantity
                                            : undefined
                                        }
                                        value={item.quantity}
                                        onChange={(e) =>
                                          handleQuantityChange(
                                            item.id,
                                            parseInt(e.target.value) || 1,
                                          )
                                        }
                                        className={`w-16 text-center ${item.type === "outer" ? "border-blue-200" : ""}`}
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() =>
                                          handleQuantityChange(
                                            item.id,
                                            item.quantity + 1,
                                          )
                                        }
                                        disabled={
                                          item.type === "regular" &&
                                          item.quantity >=
                                            item.available_quantity
                                        }
                                      >
                                        +
                                      </Button>
                                    </div>
                                    {item.type === "regular" && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Available: {item.available_quantity}
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Select
                                        value={item.discount_type}
                                        onValueChange={(
                                          value: "percentage" | "fixed",
                                        ) =>
                                          handleDiscountChange(
                                            item.id,
                                            item.discount,
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          className={`w-[80px] ${item.type === "outer" ? "border-blue-200" : ""}`}
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="percentage">
                                            %
                                          </SelectItem>
                                          <SelectItem value="fixed">
                                            $
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        type="number"
                                        min="0"
                                        step={
                                          item.discount_type === "percentage"
                                            ? "1"
                                            : "0.01"
                                        }
                                        value={item.discount}
                                        onChange={(e) =>
                                          handleDiscountChange(
                                            item.id,
                                            parseFloat(e.target.value) || 0,
                                            item.discount_type,
                                          )
                                        }
                                        className={`w-20 ${item.type === "outer" ? "border-blue-200" : ""}`}
                                      />
                                      {item.discount > 0 && (
                                        <p className="text-xs text-green-600">
                                          -${item.discount_amount.toFixed(2)}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      $
                                      {(
                                        item.subtotal - item.discount_amount
                                      ).toFixed(2)}
                                    </div>
                                    {item.type === "outer" &&
                                      item.buying_price > 0 && (
                                        <p className="text-xs text-green-600 mt-1">
                                          Profit: $
                                          {(
                                            item.subtotal -
                                            item.discount_amount -
                                            item.buying_price * item.quantity
                                          ).toFixed(2)}
                                        </p>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleRemoveFromCart(item.id)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {cartItems.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-md">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-sm mb-2">
                              Cart Summary
                            </h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">
                                  Total Items:
                                </span>
                                <span>{cartItems.length}</span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">
                                  Total Quantity:
                                </span>
                                <span>
                                  {cartItems.reduce(
                                    (sum, item) => sum + item.quantity,
                                    0,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">
                                  Regular Products:
                                </span>
                                <span>
                                  {
                                    cartItems.filter(
                                      (item) => item.type === "regular",
                                    ).length
                                  }
                                </span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">
                                  Outer Products:
                                </span>
                                <span>
                                  {
                                    cartItems.filter(
                                      (item) => item.type === "outer",
                                    ).length
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-sm mb-2">
                              Financial Summary
                            </h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">Discount:</span>
                                <span className="text-red-600">
                                  -${discountAmount.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-8">
                                <span className="text-gray-600">Tax:</span>
                                <span>${taxAmount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between gap-8 font-medium">
                                <span>Total:</span>
                                <span>${totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      Payment Details
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subtotal</Label>
                        <div className="flex items-center">
                          <Input
                            value={`${subtotal.toFixed(2)}`}
                            readOnly
                            className="bg-gray-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Discount</Label>
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
                              <SelectItem value="percentage">
                                Percentage
                              </SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min="0"
                            step={discountType === "percentage" ? "1" : "0.01"}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={
                              discountType === "percentage" ? "0%" : "$0.00"
                            }
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
                          onChange={(e) => setTaxRate(e.target.value)}
                          placeholder="0%"
                        />
                        <p className="text-sm text-gray-500">
                          Tax amount: ${taxAmount.toFixed(2)}
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Total Amount</Label>
                        <Input
                          value={`${totalAmount.toFixed(2)}`}
                          readOnly
                          className="bg-gray-50 font-bold text-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">
                              Credit/Debit Card
                            </SelectItem>
                            <SelectItem value="online">
                              Online Payment
                            </SelectItem>
                            <SelectItem value="bank_transfer">
                              Bank Transfer
                            </SelectItem>
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
                          onChange={(e) => setAdvancePayment(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Remaining Amount</Label>
                        <Input
                          value={`${remainingAmount.toFixed(2)}`}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>

                      {/* Profit calculation for outer products */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mt-4">
                        <h4 className="font-medium text-blue-700 mb-2">
                          Combined Financial Summary
                        </h4>
                        <div className="space-y-2 text-sm">
                          {/* Regular Products Summary */}
                          <div className="flex justify-between">
                            <span className="text-blue-700">
                              Regular Products Revenue:
                            </span>
                            <span className="font-medium">
                              $
                              {cartItems
                                .filter((item) => item.type === "regular")
                                .reduce(
                                  (sum, item) =>
                                    sum +
                                    (item.subtotal - item.discount_amount),
                                  0,
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Regular Products Cost (if available) */}
                          <div className="flex justify-between">
                            <span className="text-blue-700">
                              Regular Products Cost:
                            </span>
                            <span className="font-medium">
                              $
                              {cartItems
                                .filter((item) => item.type === "regular")
                                .reduce(
                                  (sum, item) =>
                                    sum + item.buying_price * item.quantity,
                                  0,
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Outer Products Summary */}
                          {cartItems.some((item) => item.type === "outer") && (
                            <>
                              <div className="flex justify-between mt-2 pt-2 border-t border-blue-200">
                                <span className="text-blue-700">
                                  Outer Products Revenue:
                                </span>
                                <span className="font-medium">
                                  $
                                  {cartItems
                                    .filter((item) => item.type === "outer")
                                    .reduce(
                                      (sum, item) =>
                                        sum +
                                        (item.subtotal - item.discount_amount),
                                      0,
                                    )
                                    .toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700">
                                  Outer Products Cost:
                                </span>
                                <span className="font-medium">
                                  $
                                  {cartItems
                                    .filter((item) => item.type === "outer")
                                    .reduce(
                                      (sum, item) =>
                                        sum + item.buying_price * item.quantity,
                                      0,
                                    )
                                    .toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Total Revenue (Combined) */}
                          <div className="flex justify-between pt-2 mt-2 border-t border-blue-200 text-base">
                            <span className="text-blue-700 font-medium">
                              Total Revenue:
                            </span>
                            <span className="font-medium">
                              $
                              {cartItems
                                .reduce(
                                  (sum, item) =>
                                    sum +
                                    (item.subtotal - item.discount_amount),
                                  0,
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Total Cost (Combined) */}
                          <div className="flex justify-between text-base">
                            <span className="text-blue-700 font-medium">
                              Total Cost:
                            </span>
                            <span className="font-medium">
                              $
                              {cartItems
                                .reduce(
                                  (sum, item) =>
                                    sum + item.buying_price * item.quantity,
                                  0,
                                )
                                .toFixed(2)}
                            </span>
                          </div>

                          {/* Estimated Profit - Only shown after payment is received */}
                          <div className="flex justify-between text-base">
                            <span className="text-blue-700 font-medium">
                              {parseFloat(advancePayment) > 0
                                ? "Actual Profit:"
                                : "Estimated Profit:"}
                            </span>
                            <span className="font-medium text-green-600">
                              $
                              {parseFloat(advancePayment) > 0
                                ? // Only calculate actual profit if payment is received
                                  Math.min(
                                    parseFloat(advancePayment),
                                    cartItems.reduce((sum, item) => {
                                      const revenue =
                                        item.subtotal - item.discount_amount;
                                      const cost =
                                        item.buying_price * item.quantity;
                                      return sum + (revenue - cost);
                                    }, 0),
                                  ).toFixed(2)
                                : // Otherwise show as estimated
                                  "0.00 (pending payment)"}
                            </span>
                          </div>

                          {/* Advance Payment */}
                          <div className="flex justify-between pt-2 mt-2 border-t border-blue-200">
                            <span className="text-blue-700 font-medium">
                              Advance Payment:
                            </span>
                            <span className="font-medium">
                              ${parseFloat(advancePayment || "0").toFixed(2)}
                            </span>
                          </div>

                          {/* Remaining Amount */}
                          <div className="flex justify-between">
                            <span className="text-blue-700 font-medium">
                              Remaining Amount:
                            </span>
                            <span className="font-medium text-red-600">
                              ${remainingAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                        disabled={
                          loading ||
                          cartItems.length === 0 ||
                          !customerName ||
                          !customerPhone
                        }
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Processing Sale...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Complete Sale & Generate Invoice
                          </span>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
