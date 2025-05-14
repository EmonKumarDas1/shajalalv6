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
import { Product, Shop } from "@/types/schema";
import { Trash2, Plus, ShoppingCart } from "lucide-react";
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
import { CustomerSelection } from "./CustomerSelection";

type CartItem = {
  id: string;
  product_id: string;
  name: string;
  barcode: string | null;
  selling_price: number;
  quantity: number;
  available_quantity: number;
  subtotal: number;
  supplier_name: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  discount_amount: number;
};

export function SellProductForm() {
  const [shopId, setShopId] = useState<string>("");
  const [shops, setShops] = useState<Shop[]>([]);
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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products"); // Added state for controlling tabs
  const navigate = useNavigate();

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [cartItems, discountType, discountValue, taxRate, advancePayment]);

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      setShops(data || []);

      if (data && data.length > 0) {
        setShopId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        variant: "destructive",
        title: "Error fetching shops",
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

  const handleAddToCart = async (product: Product) => {
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
      (item) => item.product_id === product.id,
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
        quantity: 1,
        available_quantity: product.quantity,
        subtotal: product.selling_price,
        supplier_name: supplierName || "Unknown Supplier",
        discount: 0,
        discount_type: "percentage",
        discount_amount: 0,
      };

      setCartItems([...cartItems, newItem]);
    }

    toast({
      title: "Product added",
      description: `${product.name || "Product"} added to cart`,
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const updatedItems = cartItems.map((item) => {
      if (item.id === itemId) {
        if (newQuantity > item.available_quantity) {
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

  const handleCustomerSelected = (name: string, phone: string) => {
    setCustomerName(name);
    setCustomerPhone(phone);
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

    // require customer details
    if (!customerName || !customerPhone) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Customer name and phone number are required",
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
          notes: `Discount: ${discountAmount.toFixed(2)}, Tax: ${taxAmount.toFixed(2)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;

      const invoiceItems = cartItems.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        total_price: item.subtotal,
        supplier_name: item.supplier_name || "Unknown Supplier",
        created_at: new Date().toISOString(),
        product_name: item.name || "Unknown Product",
        barcode: item.barcode || "",
        watt: 0,
        discount: item.discount || 0,
        discount_type: item.discount_type || "percentage",
        discount_amount: item.discount_amount || 0,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      for (const item of cartItems) {
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

      toast({
        title: "Sale completed",
        description: `Invoice #${invoiceNumber} has been generated successfully`,
      });

      navigate(`/dashboard/invoices/${invoiceId}`);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <ProductSearch onAddToCart={handleAddToCart} shopId={shopId} />
            </div>

            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="shop">Shop *</Label>
                    <Select value={shopId} onValueChange={setShopId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {shops.length === 0 && (
                      <p className="text-xs text-red-500">
                        No shops available. Please add a shop first.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <CustomerSelection
                    onCustomerSelected={handleCustomerSelected}
                    initialName={prefilledCustomerName}
                    initialPhone={prefilledCustomerPhone}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Cart Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Items:</span>
                      <span>{cartItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Quantity:</span>
                      <span>
                        {cartItems.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>
                        $
                        {cartItems
                          .reduce(
                            (sum, item) =>
                              sum + item.subtotal - (item.discount_amount || 0),
                            0,
                          )
                          .toFixed(2)}
                      </span>
                    </div>
                    <Button
                      variant="default"
                      className="w-full mt-2"
                      onClick={() => setActiveTab("cart")}
                    >
                      View Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cart" className="space-y-6 mt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Shopping Cart</h3>

                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Your cart is empty. Add products to proceed with the sale.
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Subtotal</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cartItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  {item.barcode && (
                                    <p className="text-xs text-gray-500">
                                      Barcode: {item.barcode}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{item.supplier_name}</TableCell>
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
                                  className="w-24 text-right"
                                />
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
                                    max={item.available_quantity}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        item.id,
                                        parseInt(e.target.value) || 1,
                                      )
                                    }
                                    className="w-16 text-center"
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
                                      item.quantity >= item.available_quantity
                                    }
                                  >
                                    +
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Available: {item.available_quantity}
                                </p>
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
                                    <SelectTrigger className="w-[80px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">
                                        %
                                      </SelectItem>
                                      <SelectItem value="fixed">$</SelectItem>
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
                                    className="w-20"
                                  />
                                  {item.discount > 0 && (
                                    <p className="text-xs text-green-600">
                                      -${item.discount_amount.toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                $
                                {(item.subtotal - item.discount_amount).toFixed(
                                  2,
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFromCart(item.id)}
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

                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab("products")} // Switch to products tab
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add More Products
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-medium mb-4">Payment Details</h3>

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
                        className="bg-gray-50 font-bold"
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
                          <SelectItem value="online">Online Payment</SelectItem>
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
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
