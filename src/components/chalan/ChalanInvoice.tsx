import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Printer, Pencil, Save, X } from "lucide-react";
import { usePDF } from "react-to-pdf";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";

type ChalanItem = {
  id: string;
  chalan_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  watt?: string;
  color?: string;
  model?: string;
  size?: string;
  company?: string;
  price?: number;
};

type Chalan = {
  id: string;
  chalan_number: string;
  created_at: string;
  company_name: string;
  status: "pending" | "delivered" | "cancelled";
  notes?: string;
};

type ChalanInvoiceProps = {
  chalanId: string;
  isDownloadMode?: boolean;
};

export function ChalanInvoice({
  chalanId,
  isDownloadMode,
}: ChalanInvoiceProps) {
  const [chalan, setChalan] = useState<Chalan | null>(null);
  const [chalanItems, setChalanItems] = useState<ChalanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editChalanItems, setEditChalanItems] = useState<ChalanItem[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductQuantity, setNewProductQuantity] = useState<number>(1);
  const [newProductWatt, setNewProductWatt] = useState("");
  const [newProductColor, setNewProductColor] = useState("");
  const [newProductModel, setNewProductModel] = useState("");
  const [newProductSize, setNewProductSize] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({
    filename: `chalan-${chalanId}.pdf`,
    page: {
      margin: 10,
      format: "A4",
    },
    options: {
      compress: true,
      scale: 0.75,
    },
  });

  useEffect(() => {
    if (chalanId) {
      fetchChalanDetails();
    }
  }, [chalanId]);

  useEffect(() => {
    if (isDownloadMode && !loading && chalan) {
      const timer = setTimeout(() => {
        toPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDownloadMode, loading, chalan, toPDF]);

  async function fetchChalanDetails() {
    try {
      setLoading(true);

      const { data: chalanData, error: chalanError } = await supabase
        .from("chalans")
        .select("*")
        .eq("id", chalanId)
        .single();

      if (chalanError) throw chalanError;
      setChalan(chalanData);
      setEditCompanyName(chalanData.company_name);
      setEditNotes(chalanData.notes || "");

      const { data: itemsData, error: itemsError } = await supabase
        .from("chalan_items")
        .select("*")
        .eq("chalan_id", chalanId);

      if (itemsError) throw itemsError;
      setChalanItems(itemsData || []);
      setEditChalanItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching chalan details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch chalan details",
      });
    } finally {
      setLoading(false);
    }
  }

  const addItemToChalan = () => {
    if (!newProductName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Product name is required",
      });
      return;
    }

    if (newProductQuantity < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be at least 1",
      });
      return;
    }

    const price = newProductPrice ? parseFloat(newProductPrice) : undefined;
    if (price !== undefined && price < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Price cannot be negative",
      });
      return;
    }

    const newItem: ChalanItem = {
      id: `temp-${Date.now()}`,
      chalan_id: chalanId,
      product_id: `temp-${Date.now()}`,
      product_name: newProductName.trim(),
      quantity: newProductQuantity,
      watt: newProductWatt.trim() || undefined,
      color: newProductColor.trim() || undefined,
      model: newProductModel.trim() || undefined,
      size: newProductSize.trim() || undefined,
      price,
    };

    setEditChalanItems([...editChalanItems, newItem]);

    toast({
      title: "Product added",
      description: `${newProductName.trim()} added to chalan`,
    });

    setNewProductName("");
    setNewProductQuantity(1);
    setNewProductWatt("");
    setNewProductColor("");
    setNewProductModel("");
    setNewProductSize("");
    setNewProductPrice("");
  };

  const removeItem = (id: string) => {
    setEditChalanItems(editChalanItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) quantity = 1;
    setEditChalanItems(
      editChalanItems.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      ),
    );
  };

  const handleUpdate = async () => {
    if (!editCompanyName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a company name",
      });
      return;
    }

    if (editChalanItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please add at least one product to the chalan",
      });
      return;
    }

    try {
      setLoading(true);

      const { error: chalanError } = await supabase
        .from("chalans")
        .update({
          company_name: editCompanyName.trim(),
          notes: editNotes || null,
        })
        .eq("id", chalanId);

      if (chalanError) throw chalanError;

      const { error: deleteItemsError } = await supabase
        .from("chalan_items")
        .delete()
        .eq("chalan_id", chalanId);

      if (deleteItemsError) throw deleteItemsError;

      const chalanItemsData = editChalanItems.map((item) => ({
        chalan_id: chalanId,
        product_name: item.product_name,
        quantity: item.quantity,
        watt: item.watt || null,
        color: item.color || null,
        model: item.model || null,
        size: item.size || null,
        price: item.price ?? null,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from("chalan_items")
        .insert(chalanItemsData);

      if (itemsError) throw itemsError;

      await fetchChalanDetails();
      setIsEditing(false);

      toast({
        title: "Success",
        description: `Chalan #${chalan?.chalan_number} updated successfully`,
      });
    } catch (error) {
      console.error("Error updating chalan:", error);
      toast({
        variant: "destructive",
        title: "Error updating chalan",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "border-green-600 bg-green-100 text-green-800";
      case "pending":
        return "border-yellow-600 bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "border-red-600 bg-red-100 text-red-800";
      default:
        return "border-gray-600 bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!chalan) {
    return (
      <div className="text-center py-10 text-gray-500 text-sm">
        Chalan not found or has been deleted.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {!isDownloadMode && (
        <div className="flex justify-between items-center no-print">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/chalans">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Chalans
              </Link>
            </Button>
            <h2 className="text-xl font-bold ml-2">Chalan Invoice</h2>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-xs p-2"
                  onClick={() => {
                    setIsEditing(true);
                    setEditCompanyName(chalan.company_name);
                    setEditNotes(chalan.notes || "");
                    setEditChalanItems(chalanItems);
                  }}
                >
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-xs p-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3 w-3" /> Print
                </Button>
                <Button
                  variant="default"
                  className="flex items-center gap-2 text-xs p-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => toPDF()}
                >
                  <Download className="h-3 w-3" /> Download PDF
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-xs p-2"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-3 w-3" /> Cancel
                </Button>
                <Button
                  variant="default"
                  className="flex items-center gap-2 text-xs p-2 bg-blue-600 hover:bg-blue-700"
                  onClick={handleUpdate}
                  disabled={loading}
                >
                  <Save className="h-3 w-3" /> Save
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <style type="text/css" media="print">
        {`
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            margin: 0 !important;
            font-size: 10pt;
            line-height: 1.3;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            overflow: visible !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .card {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            border: none !important;
          }
          .card-content {
            padding: 8mm !important;
            box-sizing: border-box !important;
          }
          table {
            font-size: 9pt !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          th, td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          }
          .print-compact {
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>

      <Card
        className="border-none print:border print:shadow-none card"
        ref={targetRef}
      >
        <CardContent className="p-4 card-content">
          <div className="mb-4 bg-gradient-to-r from-blue-100 to-white p-2 rounded-t-md border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="https://i.ibb.co.com/B2MzGc7Y/Screenshot-2025-04-20-195658.png"
                  alt="Shahjalal Lighting Logo"
                  className="h-10"
                />
                <div>
                  <h1 className="text-lg font-bold text-blue-900">
                    SHAHJALAL LIGHTING
                  </h1>
                  <p className="text-[9pt] text-gray-700">
                    1st Class Contractor, Importer & Suppliers
                  </p>
                  <p className="text-[8pt] font-semibold text-green-700  inline-block px-1 py-0.5 mt-0.5 rounded">
                    ELECTRICAL GOODS WHOLESALER & RETAILER
                  </p>
                </div>
              </div>
              <div className="text-right text-[9pt]">
                <p>119/24, Foyez Electric Market</p>
                <p>Nandankanan, Chittagong</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <svg
                    className="w-3 h-3 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    ></path>
                  </svg>
                  <p>031-2853667, 01979-500055</p>
                </div>
                <p className="mt-0.5">mslcgt444@gmail.com</p>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10pt] text-gray-600">
                Chalan #{chalan.chalan_number || "N/A"}
              </p>
              <Badge
                variant="outline"
                className={`mt-1 ${getStatusColor(chalan.status)} font-semibold text-[9pt]`}
              >
                {getStatusLabel(chalan.status)}
              </Badge>
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    placeholder="Enter company name"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional information here"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Add Product</h3>
                <div className="space-y-4">
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="space-y-2 min-w-[200px]">
                      <Label htmlFor="product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        placeholder="Enter product name"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={newProductQuantity}
                        onChange={(e) =>
                          setNewProductQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="watt">Watt</Label>
                      <Input
                        id="watt"
                        placeholder="Enter watt"
                        value={newProductWatt}
                        onChange={(e) => setNewProductWatt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 items-end flex-wrap">
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        placeholder="Enter color"
                        value={newProductColor}
                        onChange={(e) => setNewProductColor(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        placeholder="Enter model"
                        value={newProductModel}
                        onChange={(e) => setNewProductModel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="size">Size</Label>
                      <Input
                        id="size"
                        placeholder="Enter size"
                        value={newProductSize}
                        onChange={(e) => setNewProductSize(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 min-w-[120px]">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter price"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addItemToChalan}
                      className="flex items-center gap-1 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Chalan Items</h3>
                {editChalanItems.length === 0 ? (
                  <div className="text-center py-8 border rounded-md text-gray-500">
                    No items added to chalan yet
                  </div>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Watt</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="w-[150px]">Quantity</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editChalanItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.watt || "-"}</TableCell>
                            <TableCell>{item.color || "-"}</TableCell>
                            <TableCell>{item.model || "-"}</TableCell>
                            <TableCell>{item.size || "-"}</TableCell>
                            <TableCell>
                              {item.price !== undefined
                                ? item.price.toFixed(2)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateQuantity(
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
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                >
                                  +
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
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
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <h3 className="text-[10pt] font-semibold text-gray-700 uppercase">
                    Company
                  </h3>
                  <p className="mt-1 text-[11pt] font-semibold text-gray-900">
                    {chalan.company_name || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-[10pt] font-semibold text-gray-700 uppercase">
                    Chalan Details
                  </h3>
                  <p className="text-[10pt] text-gray-600 mt-1">
                    <span className="font-medium">Chalan Date:</span>{" "}
                    {chalan.created_at
                      ? format(new Date(chalan.created_at), "MMMM dd, yyyy")
                      : "N/A"}
                  </p>
                </div>
              </div>

              <div className="mb-3">
                <table className="min-w-full border-collapse text-[9pt]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[5%]">
                        No.
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[25%]">
                        Product
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[10%]">
                        Watt
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[10%]">
                        Color
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[10%]">
                        Model
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[10%]">
                        Size
                      </th>
                      <th className="py-1 px-2 text-left font-semibold text-gray-700 w-[10%]">
                        Price
                      </th>
                      <th className="py-1 px-2 text-right font-semibold text-gray-700 w-[10%]">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chalanItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-1 px-2 text-center text-gray-500"
                        >
                          No items in this chalan
                        </td>
                      </tr>
                    ) : (
                      chalanItems.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                        >
                          <td className="py-1 px-2 text-gray-500">
                            {index + 1}
                          </td>
                          <td className="py-1 px-2 text-gray-900">
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              {item.company && (
                                <p className="text-[8pt] text-gray-600">
                                  {item.company}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-1 px-2 text-gray-600">
                            {item.watt || "-"}
                          </td>
                          <td className="py-1 px-2 text-gray-600">
                            {item.color || "-"}
                          </td>
                          <td className="py-1 px-2 text-gray-600">
                            {item.model || "-"}
                          </td>
                          <td className="py-1 px-2 text-gray-600">
                            {item.size || "-"}
                          </td>
                          <td className="py-1 px-2 text-gray-600">
                            {item.price !== undefined
                              ? item.price.toFixed(2)
                              : "-"}
                          </td>
                          <td className="py-1 px-2 text-gray-900 text-right">
                            {item.quantity}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {chalan.notes && (
                <div className="mb-3">
                  <h3 className="text-[10pt] font-semibold text-gray-700 uppercase">
                    Notes
                  </h3>
                  <p className="text-[10pt] text-gray-600 border p-1 rounded-md bg-gray-50">
                    {chalan.notes}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10pt] font-medium text-gray-600">
                      Prepared By:
                    </p>
                    <p className="mt-4 border-t border-gray-300 pt-1 w-32 text-[9pt]">
                      Signature
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10pt] font-medium text-gray-600">
                      Received By:
                    </p>
                    <p className="mt-4 border-t border-gray-300 pt-1 w-32 text-[9pt]">
                      Signature
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center text-[9pt] text-gray-500 border-t pt-2">
                <p>
                  This is a computer-generated document. No signature is
                  required.
                </p>
                <p>
                  © {new Date().getFullYear()} Shahjalal Lighting. All rights
                  reserved.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
