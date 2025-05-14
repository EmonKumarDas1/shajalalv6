import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CustomerDetails } from "./CustomerDetails";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  total_spent?: number;
  last_purchase?: string;
  balance?: number;
  total_due?: number;
};

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchCustomers();

    // Set up realtime subscription
    const subscription = supabase
      .channel("customers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => fetchCustomers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For each customer, calculate total spent and last purchase date
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          try {
            // Get all invoices for this customer
            const { data: invoices, error: invoicesError } = await supabase
              .from("invoices")
              .select("id, total_amount, advance_payment, status, created_at")
              .eq("customer_phone", customer.phone)
              .order("created_at", { ascending: false });

            if (invoicesError) {
              console.error("Error fetching invoices:", invoicesError);
              return customer;
            }

            // Calculate total spent and balance
            let totalSpent = 0;
            let totalDue = 0;

            invoices?.forEach((invoice) => {
              const invoiceTotal = Number(invoice.total_amount || 0);
              const advancePayment = Number(invoice.advance_payment || 0);

              if (invoice.status === "paid") {
                totalSpent += invoiceTotal;
              } else if (invoice.status === "partially_paid") {
                totalSpent += advancePayment;
                totalDue += invoiceTotal - advancePayment;
              } else if (invoice.status === "unpaid") {
                totalDue += invoiceTotal;
              }
            });

            // Calculate balance (negative means customer has credit)
            const balance = totalSpent - totalDue;

            // Get last purchase date
            const lastPurchase =
              invoices && invoices.length > 0 ? invoices[0].created_at : null;

            return {
              ...customer,
              total_spent: totalSpent,
              last_purchase: lastPurchase,
              balance: balance,
              total_due: totalDue,
            };
          } catch (err) {
            console.error("Error processing customer data:", err);
            return customer;
          }
        }),
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching customers",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get("filter");

  // Filter customers based on search term and URL parameters
  const filteredCustomers = customers.filter((customer) => {
    // First apply search filter
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()));

    // Then apply credits filter if needed
    if (filterParam === "credits") {
      // Show only customers with credits (negative balance)
      return matchesSearch && customer.balance < 0;
    }

    return matchesSearch;
  });

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      setIsDeleting(true);

      // First check if customer has any invoices
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("id")
        .eq("customer_id", customerId)
        .limit(1);

      if (invoiceError) throw invoiceError;

      if (invoices && invoices.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete customer",
          description:
            "This customer has associated invoices and cannot be deleted.",
        });
        return;
      }

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;

      toast({
        title: "Customer deleted",
        description: "The customer has been deleted successfully",
      });

      // Refresh the customer list
      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        variant: "destructive",
        title: "Error deleting customer",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {showDetails && selectedCustomer ? (
        <CustomerDetails
          customer={selectedCustomer}
          onBack={() => setShowDetails(false)}
          onCustomerUpdated={fetchCustomers}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                // Create a new customer with default values
                const newCustomer: Customer = {
                  id: "", // This will be generated by the database
                  name: "",
                  phone: "",
                  email: "",
                  address: "",
                  created_at: new Date().toISOString(),
                  total_spent: 0,
                  last_purchase: null,
                };

                // Set as selected customer and show details form
                setSelectedCustomer(newCustomer);
                setShowDetails(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Customer
            </Button>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Balance/Due</TableHead>
                  <TableHead>Last Purchase</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {format(
                            new Date(customer.created_at),
                            "MMM dd, yyyy",
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          ${customer.total_spent?.toFixed(2) || "0.00"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.balance < 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            Credit: ${Math.abs(customer.balance).toFixed(2)}
                          </Badge>
                        ) : customer.total_due > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Due: ${customer.total_due.toFixed(2)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-50 text-gray-700 border-gray-200"
                          >
                            Settled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.last_purchase
                          ? format(
                              new Date(customer.last_purchase),
                              "MMM dd, yyyy",
                            )
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(customer)}
                          title="Edit customer"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          disabled={isDeleting}
                          title="Delete customer"
                        >
                          {isDeleting ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {indexOfFirstItem + 1} to{" "}
                {Math.min(indexOfLastItem, filteredCustomers.length)} of{" "}
                {filteredCustomers.length} customers
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show first page, last page, current page, and pages around current
                    let pageToShow;
                    if (totalPages <= 5) {
                      pageToShow = i + 1;
                    } else if (currentPage <= 3) {
                      pageToShow = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageToShow = totalPages - 4 + i;
                    } else {
                      pageToShow = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageToShow}
                        variant={
                          currentPage === pageToShow ? "default" : "outline"
                        }
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageToShow)}
                      >
                        {pageToShow}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
