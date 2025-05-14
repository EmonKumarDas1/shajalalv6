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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ArrowRight,
  RefreshCw,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ReturnProductFormProps {
  invoiceId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type InvoiceItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  barcode?: string;
  is_outer_product?: boolean;
};

type ExchangeProduct = {
  id: string;
  name: string;
  selling_price: number;
  quantity: number;
  barcode?: string;
};

export function ReturnProductForm({
  invoiceId,
  onSuccess,
  onCancel,
}: ReturnProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnType, setReturnType] = useState<"refund" | "exchange">("refund");
  const [exchangeProducts, setExchangeProducts] = useState<ExchangeProduct[]>(
    [],
  );
  const [selectedExchangeProductId, setSelectedExchangeProductId] =
    useState<string>("");
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [priceDifference, setPriceDifference] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("original");
  const [stockAvailable, setStockAvailable] = useState<boolean>(true);
  const [returnCondition, setReturnCondition] = useState<string>("good");
  const [returnFees, setReturnFees] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [invoice, setInvoice] = useState<any>(null);
  const [maxReturnQuantity, setMaxReturnQuantity] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
    }
  }, [invoiceId]);

  useEffect(() => {
    if (returnType === "exchange") {
      fetchExchangeProducts();
    }
  }, [returnType, searchQuery]);

  useEffect(() => {
    calculateRefundAmount();
  }, [selectedItemId, returnQuantity]);

  useEffect(() => {
    calculatePriceDifference();
  }, [selectedExchangeProductId, refundAmount]);

  async function fetchInvoiceDetails() {
    try {
      setLoading(true);
      // Fetch invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) {
        console.error("Error fetching invoice details:", invoiceError);
        throw new Error(
          `Error fetching invoice details: ${invoiceError.message || JSON.stringify(invoiceError)}`,
        );
      }
      setInvoice(invoiceData);

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (itemsError) {
        console.error("Error fetching invoice items:", itemsError);
        throw new Error(
          `Error fetching invoice items: ${itemsError.message || JSON.stringify(itemsError)}`,
        );
      }

      // Check for already returned items - use a safer approach with column existence check
      let returnsData = [];
      try {
        // Try to fetch returned items directly, but catch and handle any column-not-exists errors
        const { data, error: returnsError } = await supabase
          .from("product_returns")
          .select("product_id, quantity")
          .eq("invoice_id", invoiceId);

        if (returnsError) {
          // Check if the error is related to missing column
          if (
            returnsError.message &&
            returnsError.message.includes("column") &&
            returnsError.message.includes("does not exist")
          ) {
            console.warn(
              "product_id column does not exist in product_returns table. Migration may be pending.",
              returnsError.message,
            );
            // Continue with empty returns data
            toast({
              title: "Database Migration Notice",
              description:
                "A database update is in progress. Some return history may not be available until the update completes.",
            });
          } else {
            // Log other errors but don't throw - allow the process to continue with empty returns data
            console.error("Error fetching returned items:", returnsError);
            toast({
              variant: "destructive",
              title: "Warning",
              description:
                "Could not fetch previous returns. Some data may be incomplete.",
            });
          }
        } else {
          returnsData = data || [];
        }
      } catch (returnsError) {
        console.error(
          "Error checking or fetching returned items:",
          returnsError,
        );
        // Continue with empty returns data rather than failing the whole process
        console.warn("Continuing with empty returns data due to error");
      }

      // Calculate remaining quantities that can be returned
      const returnedQuantities: Record<string, number> = {};
      if (returnsData) {
        returnsData.forEach((returnItem) => {
          if (returnedQuantities[returnItem.product_id]) {
            returnedQuantities[returnItem.product_id] += returnItem.quantity;
          } else {
            returnedQuantities[returnItem.product_id] = returnItem.quantity;
          }
        });
      }

      // Adjust available quantities for return
      const adjustedItems = itemsData.map((item) => ({
        ...item,
        max_return_quantity:
          item.quantity - (returnedQuantities[item.product_id] || 0),
      }));

      setInvoiceItems(
        adjustedItems.filter((item) => item.max_return_quantity > 0),
      );
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching invoice details",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchExchangeProducts() {
    try {
      let query = supabase.from("products").select("*").gt("quantity", 0);

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error("Error fetching exchange products:", error);
        throw new Error(
          `Error fetching exchange products: ${error.message || JSON.stringify(error)}`,
        );
      }
      setExchangeProducts(data || []);

      // Check if there are any products available for exchange
      if (data && data.length === 0) {
        setStockAvailable(false);
      } else {
        setStockAvailable(true);
      }
    } catch (error) {
      console.error("Error fetching exchange products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching exchange products",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
      setStockAvailable(false);
    }
  }

  function calculateRefundAmount() {
    const selectedItem = invoiceItems.find(
      (item) => item.id === selectedItemId,
    );
    if (selectedItem) {
      setMaxReturnQuantity(
        selectedItem.max_return_quantity || selectedItem.quantity,
      );
      const amount =
        selectedItem.unit_price * Math.min(returnQuantity, maxReturnQuantity);
      setRefundAmount(parseFloat(amount.toFixed(2)));
    } else {
      setRefundAmount(0);
    }
  }

  function calculatePriceDifference() {
    if (returnType === "exchange" && selectedExchangeProductId) {
      const exchangeProduct = exchangeProducts.find(
        (product) => product.id === selectedExchangeProductId,
      );
      if (exchangeProduct) {
        const exchangeAmount = exchangeProduct.selling_price * returnQuantity;
        // Apply return fees if any
        const adjustedRefundAmount = refundAmount - returnFees;
        const difference = exchangeAmount - adjustedRefundAmount;
        setPriceDifference(parseFloat(difference.toFixed(2)));
      }
    } else {
      setPriceDifference(0);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedItemId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a product to return",
      });
      return;
    }

    if (returnQuantity <= 0 || returnQuantity > maxReturnQuantity) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `Return quantity must be between 1 and ${maxReturnQuantity}`,
      });
      return;
    }

    if (returnType === "exchange" && !selectedExchangeProductId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an exchange product",
      });
      return;
    }

    if (returnType === "exchange" && !stockAvailable) {
      toast({
        variant: "destructive",
        title: "Stock Error",
        description: "No products available for exchange",
      });
      return;
    }

    // Check if we're exchanging for the same product
    const selectedItem = invoiceItems.find(
      (item) => item.id === selectedItemId,
    );
    const exchangeProduct =
      returnType === "exchange"
        ? exchangeProducts.find(
            (product) => product.id === selectedExchangeProductId,
          )
        : null;

    const isSameProductExchange =
      returnType === "exchange" &&
      selectedItem &&
      exchangeProduct &&
      selectedItem.product_id === selectedExchangeProductId;

    try {
      setLoading(true);

      const selectedItem = invoiceItems.find(
        (item) => item.id === selectedItemId,
      );
      if (!selectedItem) throw new Error("Selected item not found");

      // Check if the item is an outer product (not in regular inventory)
      const isOuterProduct = selectedItem.is_outer_product === true;

      // Verify if the exchange product has enough stock
      if (returnType === "exchange" && selectedExchangeProductId) {
        const exchangeProduct = exchangeProducts.find(
          (product) => product.id === selectedExchangeProductId,
        );

        if (!exchangeProduct) {
          throw new Error("Exchange product not found");
        }

        if (exchangeProduct.quantity < returnQuantity) {
          toast({
            variant: "destructive",
            title: "Stock Error",
            description: `Only ${exchangeProduct.quantity} units available for exchange`,
          });
          setLoading(false);
          return;
        }
      }

      // Calculate final refund amount after deducting fees
      const finalRefundAmount =
        returnType === "refund" ? refundAmount - returnFees : 0;

      // For same product exchanges, set price difference to 0
      if (isSameProductExchange) {
        setPriceDifference(0);
      }

      // Create return record with explicit string values for text fields to avoid null constraint issues
      const returnData = {
        invoice_id: invoiceId,
        product_id: selectedItem.product_id,
        customer_id: invoice.customer_id,
        quantity: returnQuantity,
        // CRITICAL: Always use a non-null string value for reason
        reason: returnReason || "No reason provided",
        return_type: returnType,
        status: "pending",
        refund_amount: finalRefundAmount,
        exchange_product_id:
          returnType === "exchange" ? selectedExchangeProductId : null,
        price_difference: returnType === "exchange" ? priceDifference : 0,
        payment_method: priceDifference > 0 ? paymentMethod : "none",
        condition: returnCondition || "good",
        return_fees: returnFees,
        admin_notes: adminNotes || "No additional notes",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_amount:
          returnType === "refund" ? finalRefundAmount : priceDifference,
      };

      // Try to insert with explicit error handling
      let insertResult;
      try {
        insertResult = await supabase
          .from("product_returns")
          .insert([returnData])
          .select();

        if (insertResult.error) {
          console.error("Error details:", insertResult.error);
          throw new Error(
            `Error creating return record: ${insertResult.error.message}`,
          );
        }
      } catch (insertError) {
        console.error("Exception during insert:", insertError);
        throw new Error(`Failed to create return: ${insertError.message}`);
      }

      const { data, error } = insertResult;

      // Update original product quantity (add back to inventory for refund)
      // Only update inventory for regular products (not outer products)
      if (!selectedItem.is_outer_product) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", selectedItem.product_id)
          .single();

        if (productError) {
          console.error("Error fetching product data:", productError);
          throw new Error(
            `Error fetching product data: ${productError.message || JSON.stringify(productError)}`,
          );
        }

        await supabase
          .from("products")
          .update({
            quantity: (productData.quantity || 0) + returnQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedItem.product_id);
      }

      // Add entry to product history
      await supabase.from("product_history").insert([
        {
          product_id: selectedItem.product_id,
          quantity: returnQuantity,
          action_type: "return",
          notes: `Returned from invoice #${invoice.invoice_number}`,
          created_at: new Date().toISOString(),
        },
      ]);

      // If exchange, also add entry for the exchange product
      if (returnType === "exchange" && selectedExchangeProductId) {
        const exchangeProduct = exchangeProducts.find(
          (product) => product.id === selectedExchangeProductId,
        );

        if (exchangeProduct) {
          // Update product quantities - only for regular products
          // For same product exchanges, we need to be careful with the quantity updates
          if (isSameProductExchange) {
            // For same product exchange, we don't need to decrease quantity since we already added it back
            console.log(
              "Same product exchange - no additional quantity updates needed",
            );
          } else {
            // For different product exchange, decrease the quantity of the exchanged product
            await supabase
              .from("products")
              .update({
                quantity: Math.max(
                  0,
                  exchangeProduct.quantity - returnQuantity,
                ),
                updated_at: new Date().toISOString(),
              })
              .eq("id", selectedExchangeProductId);
          }

          // Add to product history
          await supabase.from("product_history").insert([
            {
              product_id: selectedExchangeProductId,
              quantity: returnQuantity,
              action_type: "remove",
              notes: `Exchanged for returned product from invoice #${invoice.invoice_number}`,
              created_at: new Date().toISOString(),
            },
          ]);

          // Create a new invoice for the exchange if there's a price difference to pay
          // Skip this for same product exchanges
          if (priceDifference > 0 && !isSameProductExchange) {
            const { data: invoiceData, error: invoiceError } = await supabase
              .from("invoices")
              .insert({
                customer_id: invoice.customer_id,
                customer_phone: invoice.customer_phone,
                invoice_type: "exchange",
                total_amount: priceDifference,
                status: "pending",
                notes: `Exchange invoice for return #${data?.[0]?.id}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select();

            if (invoiceError) {
              console.error("Error creating exchange invoice:", invoiceError);
              throw new Error(
                `Error creating exchange invoice: ${invoiceError.message || JSON.stringify(invoiceError)}`,
              );
            }

            if (invoiceData && invoiceData.length > 0) {
              // Add invoice item for the exchanged product
              await supabase.from("invoice_items").insert({
                invoice_id: invoiceData[0].id,
                product_id: selectedExchangeProductId,
                product_name: exchangeProduct.name,
                quantity: returnQuantity,
                unit_price: exchangeProduct.selling_price,
                total_price: exchangeProduct.selling_price * returnQuantity,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      }

      // For refund, create a payment record with negative amount (refund)
      if (returnType === "refund" && finalRefundAmount > 0) {
        await supabase.from("payments").insert({
          invoice_id: invoiceId,
          amount: -finalRefundAmount, // Negative amount for refund
          payment_method: paymentMethod,
          notes: `Refund for return #${data?.[0]?.id}`,
          payment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      toast({
        title: "Return processed",
        description: `Return request has been submitted successfully`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error processing return:", error);
      toast({
        variant: "destructive",
        title: "Error processing return",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Select Product to Return *</Label>
            <Select
              value={selectedItemId}
              onValueChange={(value) => {
                setSelectedItemId(value);
                setReturnQuantity(1); // Reset quantity when product changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {invoiceItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.product_name} - ${item.unit_price.toFixed(2)} (Max:{" "}
                    {item.max_return_quantity || item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Return Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={maxReturnQuantity}
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
              required
            />
            {maxReturnQuantity > 0 && (
              <p className="text-xs text-gray-500">
                Maximum returnable quantity: {maxReturnQuantity}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Return Reason</Label>
            <Textarea
              id="reason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Please provide a reason for the return"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Return Type *</Label>
            <RadioGroup
              value={returnType}
              onValueChange={(value: "refund" | "exchange") =>
                setReturnType(value)
              }
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="refund" id="refund" />
                <Label htmlFor="refund" className="cursor-pointer">
                  Refund
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exchange" id="exchange" />
                <Label htmlFor="exchange" className="cursor-pointer">
                  Exchange
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Product Condition</Label>
            <Select value={returnCondition} onValueChange={setReturnCondition}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select product condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Like New</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnFees">Return Fees (if applicable)</Label>
            <Input
              id="returnFees"
              type="number"
              min="0"
              step="0.01"
              value={returnFees}
              onChange={(e) => setReturnFees(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">
              Any applicable fees for processing the return
            </p>
          </div>

          {returnType === "refund" && (
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Refund Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select refund method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">
                    Original Payment Method
                  </SelectItem>
                  <SelectItem value="store_credit">Store Credit</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {returnType === "exchange" && (
            <div className="space-y-4">
              {!stockAvailable && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stock Unavailable</AlertTitle>
                  <AlertDescription>
                    No products are currently available for exchange. Please
                    choose refund option instead.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="exchangeSearch">Search Exchange Products</Label>
                <Input
                  id="exchangeSearch"
                  placeholder="Search by product name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchangeProduct">
                  Select Exchange Product *
                </Label>
                <Select
                  value={selectedExchangeProductId}
                  onValueChange={setSelectedExchangeProductId}
                  disabled={!stockAvailable}
                >
                  <SelectTrigger id="exchangeProduct">
                    <SelectValue placeholder="Select exchange product" />
                  </SelectTrigger>
                  <SelectContent>
                    {exchangeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - ${product.selling_price.toFixed(2)}{" "}
                        (Stock: {product.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {exchangeProducts.length === 0 && (
                  <p className="text-xs text-red-500">
                    No products available for exchange. Try a different search
                    term.
                  </p>
                )}
              </div>

              {selectedExchangeProductId && (
                <div className="mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Original Product:</span>
                          <span>${refundAmount.toFixed(2)}</span>
                        </div>
                        {returnFees > 0 && (
                          <div className="flex justify-between text-red-500">
                            <span className="font-medium">Return Fees:</span>
                            <span>-${returnFees.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="font-medium">Exchange Product:</span>
                          <span>
                            $
                            {(
                              exchangeProducts.find(
                                (p) => p.id === selectedExchangeProductId,
                              )?.selling_price * returnQuantity
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>
                            {priceDifference > 0
                              ? "Additional Payment:"
                              : "Store Credit:"}
                          </span>
                          <span
                            className={`${priceDifference > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            ${Math.abs(priceDifference).toFixed(2)}
                          </span>
                        </div>

                        {priceDifference > 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Additional Payment Required</AlertTitle>
                            <AlertDescription>
                              The customer needs to pay an additional $
                              {Math.abs(priceDifference).toFixed(2)} for this
                              exchange.
                            </AlertDescription>
                          </Alert>
                        ) : priceDifference < 0 ? (
                          <Alert className="bg-green-50 text-green-800 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle>Store Credit Available</AlertTitle>
                            <AlertDescription>
                              The customer will receive $
                              {Math.abs(priceDifference).toFixed(2)} as store
                              credit.
                            </AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {returnType === "refund" && (
            <div className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Unit Price:</span>
                      <span>
                        $
                        {(
                          invoiceItems.find(
                            (item) => item.id === selectedItemId,
                          )?.unit_price || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Return Quantity:</span>
                      <span>{returnQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Subtotal:</span>
                      <span>${refundAmount.toFixed(2)}</span>
                    </div>
                    {returnFees > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span className="font-medium">Return Fees:</span>
                        <span>-${returnFees.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>Total Refund Amount:</span>
                      <span className="text-green-600">
                        ${(refundAmount - returnFees).toFixed(2)}
                      </span>
                    </div>

                    <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle>
                        Refund Method:{" "}
                        {paymentMethod === "original"
                          ? "Original Payment Method"
                          : paymentMethod === "store_credit"
                            ? "Store Credit"
                            : "Cash"}
                      </AlertTitle>
                      <AlertDescription>
                        The refund will be processed via{" "}
                        {paymentMethod === "original"
                          ? "the original payment method"
                          : paymentMethod === "store_credit"
                            ? "store credit"
                            : "cash payment"}
                        .
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-blue-800 font-medium">Return Process</h3>
              <ol className="mt-2 space-y-2 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Submit this form to initiate the return request</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>The return will be reviewed by management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Once approved, the customer can return the product
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    After inspection, the refund/exchange will be processed
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any additional notes for this return"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-1">
              {returnType === "refund" ? (
                <>
                  <DollarSign className="h-4 w-4" />
                  Process Refund
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Process Exchange
                </>
              )}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
