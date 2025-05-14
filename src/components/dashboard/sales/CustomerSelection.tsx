import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Search, User } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};

interface CustomerSelectionProps {
  onCustomerSelected: (name: string, phone: string) => void;
  initialName?: string;
  initialPhone?: string;
}

export function CustomerSelection({
  onCustomerSelected,
  initialName = "",
  initialPhone = "",
}: CustomerSelectionProps) {
  const [customerName, setCustomerName] = useState(initialName);
  const [customerPhone, setCustomerPhone] = useState(initialPhone);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCustomers();

    // If initial values are provided, notify parent component
    if (initialName || initialPhone) {
      onCustomerSelected(initialName, initialPhone);
    }
  }, []);

  // Update local state if props change
  useEffect(() => {
    if (initialName !== customerName) {
      setCustomerName(initialName);
    }
    if (initialPhone !== customerPhone) {
      setCustomerPhone(initialPhone);
    }
  }, [initialName, initialPhone]);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerName(e.target.value);
    onCustomerSelected(e.target.value, customerPhone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerPhone(e.target.value);
    onCustomerSelected(customerName, e.target.value);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    onCustomerSelected(customer.name, customer.phone);
    setOpen(false);
    toast({
      title: "Customer selected",
      description: "Customer information has been added to the invoice",
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium mb-2">Customer Information</h3>

      <div className="space-y-2">
        <Label htmlFor="customerName">Customer Name</Label>
        <div className="flex gap-2">
          <Input
            id="customerName"
            placeholder="Enter customer name"
            value={customerName}
            onChange={handleNameChange}
            required
          />

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-0"
              align="end"
              alignOffset={0}
              side="bottom"
              sideOffset={8}
            >
              <Command>
                <CommandInput
                  placeholder="Search customers..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No customers found.</CommandEmpty>
                  <CommandGroup heading="Customers">
                    {customers
                      .filter(
                        (customer) =>
                          customer.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          customer.phone.includes(searchTerm),
                      )
                      .map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => handleSelectCustomer(customer)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <User className="h-4 w-4" />
                          <span>{customer.name}</span>
                          <span className="text-gray-500 text-xs ml-auto">
                            {customer.phone}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerPhone">Phone Number</Label>
        <Input
          id="customerPhone"
          placeholder="Enter phone number"
          value={customerPhone}
          onChange={handlePhoneChange}
        />
      </div>
    </div>
  );
}
