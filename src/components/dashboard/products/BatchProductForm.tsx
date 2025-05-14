import { useState, useEffect, useRef } from "react";
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
import { Supplier, Shop, Product } from "@/types/schema";
import {
  Trash2,
  Plus,
  Calendar,
  Search,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

interface BatchProductFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProductRow {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  quantity: string;
  barcode: string;
  watt: string;
  size: string;
  color: string;
  model: string;
  totalPrice?: string;
}

export function BatchProductForm({
  onSuccess,
  onCancel,
}: BatchProductFormProps) {
  const [supplierId, setSupplierId] = useState<string>("");
  const [shopId, setShopId] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [advancePayment, setAdvancePayment] = useState<string>("0");
  const [remainingAmount, setRemainingAmount] = useState<string>("0");
  const [discount, setDiscount] = useState<string>("0");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [amountAfterDiscount, setAmountAfterDiscount] = useState<string>("0");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRowId, setActiveRowId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
    addNewRow();
  }, []);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 1) {
      searchProducts(searchQuery);
    } else if (searchQuery === "") {
      fetchRecentProducts();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    let total = 0;
    productRows.forEach((row) => {
      const price = Number(row.buyingPrice) || 0;
      const quantity = Number(row.quantity) || 0;
      total += price * quantity;
    });
    setTotalAmount(total.toFixed(2));
    let finalDiscount = Number(discount) || 0;
    if (discountType === "percentage") {
      finalDiscount = (total * finalDiscount) / 100;
    }
    setDiscountAmount(finalDiscount.toFixed(2));
    setAmountAfterDiscount((total - finalDiscount).toFixed(2));
  }, [productRows, discount, discountType]);

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const discountAmt = Number(discountAmount) || 0;
    const advance = Number(advancePayment) || 0;
    setRemainingAmount(Math.max(0, total - discountAmt - advance).toFixed(2));
  }, [totalAmount, discountAmount, advancePayment]);

  async function fetchRecentProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error fetching recent products:", error);
    }
  }

  async function searchProducts(query: string) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(
          `name.ilike.%${query}%,barcode.ilike.%${query}%,model.ilike.%${query}%`,
        )
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to search products. Please try again.",
      });
    }
  }

  const handleSelectProduct = (selectedProduct: Product, rowId: string) => {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const buyingPrice = selectedProduct.buying_price?.toString() || "";
          return {
            ...row,
            name: selectedProduct.name || "",
            buyingPrice,
            sellingPrice: selectedProduct.selling_price?.toString() || "",
            barcode: selectedProduct.barcode || "",
            watt: selectedProduct.watt?.toString() || "",
            size: selectedProduct.size || "",
            color: selectedProduct.color || "",
            model: selectedProduct.model || "",
            quantity: selectedProduct.quantity?.toString() || row.quantity,
            totalPrice: (
              (Number(buyingPrice) || 0) *
              (Number(selectedProduct.quantity) || Number(row.quantity) || 0)
            ).toFixed(2),
          };
        }
        return row;
      }),
    );

    if (selectedProduct.supplier_id && !supplierId) {
      setSupplierId(selectedProduct.supplier_id);
      toast({
        title: "Supplier auto-filled",
        description: `Supplier has been automatically selected based on the product.`,
      });
    }

    if (selectedProduct.shop_id && !shopId) {
      setShopId(selectedProduct.shop_id);
      toast({
        title: "Shop auto-filled",
        description: `Shop has been automatically selected based on the product.`,
      });
    }

    setIsSearchOpen(false);
    setSearchQuery("");
    setActiveRowId("");

    toast({
      title: "Product selected",
      description: `${selectedProduct.name} has been loaded into the form.`,
    });
  };

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
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

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        variant: "destructive",
        title: "Error fetching shops",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function addNewRow() {
    const newRow: ProductRow = {
      id: Date.now().toString(),
      name: "",
      buyingPrice: "",
      sellingPrice: "",
      quantity: "0",
      barcode: "",
      watt: "",
      size: "",
      color: "",
      model: "",
      totalPrice: "0",
    };
    setProductRows((prev) => [...prev, newRow]);
  }

  function removeRow(id: string) {
    setProductRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRowField(id: string, field: keyof ProductRow, value: string) {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === "buyingPrice" || field === "quantity") {
            const price = Number(field === "buyingPrice" ? value : row.buyingPrice) || 0;
            const quantity = Number(field === "quantity" ? value : row.quantity) || 0;
            updatedRow.totalPrice = (price * quantity).toFixed(2);
          }
          return updatedRow;
        }
        return row;
      }),
    );
  }

  function handleFullPay() {
    setAdvancePayment(amountAfterDiscount);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier is required",
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

    const invalidRows = productRows.filter(
      (row) =>
        !row.name.trim() ||
        !row.buyingPrice ||
        isNaN(Number(row.buyingPrice)) ||
        Number(row.buyingPrice) <= 0 ||
        !row.sellingPrice ||
        isNaN(Number(row.sellingPrice)) ||
        Number(row.sellingPrice) <= 0 ||
        !row.quantity ||
        isNaN(Number(row.quantity)) ||
        Number(row.quantity) < 0 ||
        (row.watt && (isNaN(Number(row.watt)) || Number(row.watt) <= 0))
    );

    if (invalidRows.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `${invalidRows.length} product(s) have invalid data. Please check all fields.`,
      });
      return;
    }

    let total = Number(totalAmount) || 0;
    let finalDiscount = Number(discountAmount) || 0;
    if (finalDiscount < 0 || finalDiscount > total) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Discount cannot be negative or greater than total amount.",
      });
      return;
    }

    try {
      setLoading(true);

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceStatus =
        Number(advancePayment) <= 0
          ? "unpaid"
          : Number(advancePayment) >= Number(amountAfterDiscount)
            ? "paid"
            : "partially_paid";

      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", supplierId)
        .single();

      if (supplierError)
        console.error("Error fetching supplier:", supplierError);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          total_amount: Number(totalAmount),
          advance_payment: Number(advancePayment),
          remaining_amount: Number(remainingAmount),
          discount: Number(discountAmount),
          discount_percentage: discountType === "percentage" ? Number(discount) : null,
          amount_after_discount: Number(amountAfterDiscount),
          status: invoiceStatus,
          supplier_id: supplierId,
          shop_id: shopId,
          invoice_type: "product_addition",
          created_at: date
            ? new Date(date).toISOString()
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;
      setInvoiceId(invoiceId);

      for (const row of productRows) {
        const { data: existingProducts, error: searchError } = await supabase
          .from("products")
          .select("*, shops(name)")
          .ilike("name", row.name.trim())
          .eq("supplier_id", supplierId);

        if (searchError) throw searchError;

        const matchingProduct = existingProducts?.find((p) => {
          const productWatt = row.watt ? Number(row.watt) : null;
          const productBuyingPrice = Number(row.buyingPrice);
          const productSize = row.size.trim() || null;
          const productColor = row.color.trim() || null;
          const productModel = row.model.trim() || null;

          return (
            p.name.toLowerCase() === row.name.trim().toLowerCase() &&
            p.watt === productWatt &&
            p.buying_price === productBuyingPrice &&
            p.size === productSize &&
            p.color === productColor &&
            p.model === productModel
          );
        });

        if (matchingProduct) {
          const { error: updateError } = await supabase
            .from("products")
            .update({
              quantity: matchingProduct.quantity + Number(row.quantity),
              buying_price: Number(row.buyingPrice),
              selling_price: Number(row.sellingPrice),
              barcode: row.barcode.trim() || null,
              watt: row.watt ? Number(row.watt) : null,
              size: row.size.trim() || null,
              color: row.color.trim() || null,
              model: row.model.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchingProduct.id);

          if (updateError) throw updateError;

          const { error: historyError } = await supabase
            .from("product_history")
            .insert({
              product_id: matchingProduct.id,
              quantity: Number(row.quantity),
              action_type: "restock",
              notes: `Added ${row.quantity} units via batch import`,
              created_at: date
                ? new Date(date).toISOString()
                : new Date().toISOString(),
            });

          if (historyError) {
            console.error("Error creating history entry:", historyError);
          }
        } else {
          const { data: newProduct, error: insertError } = await supabase
            .from("products")
            .insert({
              name: row.name.trim(),
              buying_price: Number(row.buyingPrice),
              selling_price: Number(row.sellingPrice),
              quantity: Number(row.quantity),
              barcode: row.barcode.trim() || null,
              supplier_id: supplierId,
              shop_id: shopId,
              watt: row.watt ? Number(row.watt) : null,
              size: row.size.trim() || null,
              color: row.color.trim() || null,
              model: row.model.trim() || null,
              invoice_id: invoiceId,
              created_at: date
                ? new Date(date).toISOString()
                : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select();

          if (insertError) throw insertError;

          if (newProduct && newProduct.length > 0) {
            const { error: historyError } = await supabase
              .from("product_history")
              .insert({
                product_id: newProduct[0].id,
                quantity: Number(row.quantity),
                action_type: "create",
                notes: "Initial product creation via batch import",
                created_at: date
                  ? new Date(date).toISOString()
                  : new Date().toISOString(),
              });

            if (historyError) {
              console.error("Error creating history entry:", historyError);
            }
          }
        }
      }

      const invoiceItemsData = productRows.map((row) => ({
        invoice_id: invoiceId,
        product_name: row.name.trim(),
        quantity: Number(row.quantity),
        unit_price: Number(row.buyingPrice),
        total_price: Number(row.buyingPrice) * Number(row.quantity),
        supplier_name: supplierData?.name || "Unknown Supplier",
        created_at: new Date().toISOString(),
        barcode: row.barcode.trim() || null,
        watt: row.watt ? Number(row.watt) : null,
      }));

      const { error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsData);

      if (invoiceItemsError) throw invoiceItemsError;

      toast({
        title: "Products processed",
        description: `Successfully processed ${productRows.length} product(s) and generated invoice #${invoiceNumber}`,
      });

      navigate(`/dashboard/invoices/${invoiceId}`);
      onSuccess();
    } catch (error) {
      console.error("Error processing products:", error);
      toast({
        variant: "destructive",
        title: "Error processing products",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast({
            variant: "destructive",
            title: "Empty Excel File",
            description: "The uploaded Excel file doesn't contain any data.",
          });
          setIsUploading(false);
          return;
        }

        const newProductRows = jsonData.map((row: any) => {
          const buyingPrice = (
            row.buying_price ||
            row.BuyingPrice ||
            row.cost ||
            row.Cost ||
            0
          ).toString();
          return {
            id:
              Date.now().toString() +
              Math.random().toString(36).substring(2, 9),
            name:
              row.name || row.Name || row.product_name || row.ProductName || "",
            buyingPrice,
            sellingPrice: (
              row.selling_price ||
              row.SellingPrice ||
              row.price ||
              row.Price ||
              0
            ).toString(),
            quantity: (
              row.quantity ||
              row.Quantity ||
              row.qty ||
              row.Qty ||
              0
            ).toString(),
            barcode: (
              row.barcode ||
              row.Barcode ||
              row.code ||
              row.Code ||
              ""
            ).toString(),
            watt: (
              row.watt ||
              row.Watt ||
              row.power ||
              row.Power ||
              ""
            ).toString(),
            size: (row.size || row.Size || "").toString(),
            color: (row.color || row.Color || "").toString(),
            model: (row.model || row.Model || "").toString(),
            totalPrice: (
              (Number(buyingPrice) || 0) *
              (Number(row.quantity) ||
                Number(row.Quantity) ||
                Number(row.qty) ||
                Number(row.Qty) ||
                0)
            ).toFixed(2),
          };
        });

        setProductRows(newProductRows);
        toast({
          title: "Excel File Processed",
          description: `Successfully loaded ${newProductRows.length} products from the Excel file.`,
        });
      } catch (error) {
        console.error("Error processing Excel file:", error);
        toast({
          variant: "destructive",
          title: "Error Processing Excel File",
          description:
            "There was an error processing the Excel file. Please check the format and try again.",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error Reading File",
        description: "There was an error reading the file. Please try again.",
      });
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label
              htmlFor="date"
              className="flex items-center gap-1 text-sm font-medium"
            >
              <Calendar className="h-4 w-4 text-primary" />
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-white"
            />
            <p className="text-xs text-gray-500">
              Date for all products being added
            </p>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label htmlFor="supplier" className="text-sm font-medium">
              Supplier *
            </Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="bg-white">
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
            <p className="text-xs text-gray-500">
              All products will be assigned to this supplier
            </p>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label htmlFor="shop" className="text-sm font-medium">
              Shop *
            </Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger className="bg-white">
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
            <p className="text-xs text-gray-500">
              All products will be assigned to this shop
            </p>
            {shops.length === 0 && (
              <p className="text-xs text-red-500">
                No shops available. Please add a shop first.
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <Label className="font-medium">Excel Upload</Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 bg-white hover:bg-primary hover:text-white transition-colors"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Processing..." : "Upload Excel File"}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Upload an Excel file with product details to automatically
              populate the form.
              <br />
              <span className="text-xs italic">
                Supported columns: name, buying_price, selling_price, quantity,
                barcode, watt, size, color, model
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <Label className="font-medium">Products</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNewRow}
              className="flex items-center gap-1 bg-white hover:bg-primary hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[20%] font-semibold">
                      Product Name
                    </TableHead>
                    <TableHead className="w-[10%] font-semibold">
                      Buying Price
                    </TableHead>
                    <TableHead className="w-[10%] font-semibold">
                      Selling Price
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Quantity
                    </TableHead>
                    <TableHead className="w-[10%] font-semibold">
                      Total Price
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">Watt</TableHead>
                    <TableHead className="w-[10%] font-semibold">Size</TableHead>
                    <TableHead className="w-[10%] font-semibold">Color</TableHead>
                    <TableHead className="w-[10%] font-semibold">Model</TableHead>
                    <TableHead className="w-[4%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateRowField(row.id, "name", e.target.value)
                            }
                            placeholder="Product name"
                            required
                            className="w-full pr-10"
                            style={{ width: `${Math.max(100, row.name.length * 10)}px` }}
                          />
                          <Popover
                            open={isSearchOpen && activeRowId === row.id}
                            onOpenChange={(open) => {
                              setIsSearchOpen(open);
                              if (open) setActiveRowId(row.id);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 bg-transparent"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setActiveRowId(row.id);
                                  setIsSearchOpen(true);
                                  fetchRecentProducts();
                                }}
                              >
                                <Search className="h-4 w-4 text-gray-600" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                             urgency="bottom"
                              sideOffset={5}
                              alignOffset={-10}
                              className="w-[300px] p-0"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Search by name, barcode, or model..."
                                  value={searchQuery}
                                  onValueChange={setSearchQuery}
                                  autoFocus
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="p-2 text-center">
                                      <p>No products found</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Try a different search term or add a new
                                        product
                                      </p>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup heading="Products">
                                    {searchResults.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.id}
                                        onSelect={() =>
                                          handleSelectProduct(product, row.id)
                                        }
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {product.name}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {product.watt &&
                                              `${product.watt}W • `}
                                            {product.barcode &&
                                              `${product.barcode} • `}
                                            {product.quantity !== undefined &&
                                              `Stock: ${product.quantity} • `}
                                            {product.size &&
                                              `Size: ${product.size} • `}
                                            {product.color &&
                                              `Color: ${product.color} • `}
                                            {product.model &&
                                              `Model: ${product.model} • `}
                                            {product.company_name &&
                                              `Company: ${product.company_name}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          pattern="[0-9]*\.?[0-9]+"
                          value={row.buyingPrice}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "buyingPrice",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          required
                          className="w-full"
                          style={{ width: `${Math.max(60, row.buyingPrice.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          pattern="[0-9]*\.?[0-9]+"
                          value={row.sellingPrice}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "sellingPrice",
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                          required
                          className="w-full"
                          style={{ width: `${Math.max(60, row.sellingPrice.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          pattern="[0-9]+"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRowField(row.id, "quantity", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-full"
                          style={{ width: `${Math.max(50, row.quantity.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.totalPrice || "0.00"}
                          readOnly
                          className="bg-gray-50 w-full"
                          style={{ width: `${Math.max(60, (row.totalPrice || "0.00").length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          pattern="[0-9]*\.?[0-9]+"
                          value={row.watt}
                          onChange={(e) =>
                            updateRowField(row.id, "watt", e.target.value)
                          }
                          placeholder="Watt"
                          className="w-20"
                          style={{ width: `${Math.max(60, row.watt.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={row.size}
                          onChange={(e) =>
                            updateRowField(row.id, "size", e.target.value)
                          }
                          placeholder="Size"
                          className="w-full"
                          style={{ width: `${Math.max(60, row.size.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.color}
                          onChange={(e) =>
                            updateRowField(row.id, "color", e.target.value)
                          }
                          placeholder="Color"
                          className="w-full"
                          style={{ width: `${Math.max(60, row.color.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.model}
                          onChange={(e) =>
                            updateRowField(row.id, "model", e.target.value)
                          }
                          placeholder="Model"
                          className="w-full"
                          style={{ width: `${Math.max(60, row.model.length * 10)}px` }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={productRows.length === 1}
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
          <p className="text-xs text-gray-500 italic mt-1">
            Scroll horizontally if all columns are not visible on smaller
            screens
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-primary/10 p-1.5 rounded-md">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-lg font-medium">Payment Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="totalAmount" className="text-sm font-medium">
              Total Amount
            </Label>
            <Input
              id="totalAmount"
              type="text"
              value={totalAmount}
              className="bg-gray-50 font-medium text-primary"
              readOnly
            />
          </div>

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="discount" className="text-sm font-medium">
              Discount
            </Label>
            <div className="flex gap-2">
              <Input
                id="discount"
                type="text"
                pattern="[0-9]*\.?[0-9]+"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={discountType === "fixed" ? "0.00" : "0"}
                className="flex-1"
              />
              <Select
                value={discountType}
                onValueChange={(value: "fixed" | "percentage") =>
                  setDiscountType(value)
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="discountAmount" className="text-sm font-medium">
              Discount Amount
            </Label>
            <Input
              id="discountAmount"
              type="text"
              value={discountAmount}
              className="bg-gray-50 font-medium text-primary"
              readOnly
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="amountAfterDiscount" className="text-sm font-medium">
              Amount After Discount
            </Label>
            <Input
              id="amountAfterDiscount"
              type="text"
              value={amountAfterDiscount}
              className="bg-gray-50 font-medium text-primary"
              readOnly
            />
          </div>

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="advancePayment" className="text-sm font-medium">
              Advance Payment
            </Label>
            <div className="flex gap-2">
              <Input
                id="advancePayment"
                type="text"
                pattern="[0-9]*\.?[0-9]+"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFullPay}
                className="bg-white hover:bg-primary hover:text-white"
              >
                Full Pay
              </Button>
            </div>
          </div>

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="remainingAmount" className="text-sm font-medium">
              Remaining Amount
            </Label>
            <Input
              id="remainingAmount"
              type="text"
              value={remainingAmount}
              className="bg-gray-50 font-medium text-destructive"
              readOnly
            />
            <p className="text-xs text-gray-500">
              Amount After Discount - Advance Payment
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t">
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
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-md"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving Products & Generating Invoice...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Save Products & Generate Invoice
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}