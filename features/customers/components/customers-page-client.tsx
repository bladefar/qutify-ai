"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerFormDialog } from "./customer-form-dialog";
import { CustomerStatusBadge } from "./customer-status-badge";
import { DeleteCustomerDialog } from "./delete-customer-dialog";
import { PaginationControls } from "@/components/shared/pagination-controls";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type Customer,
  type CustomerStatus,
} from "@/types/customer";

type CustomersPageClientProps = {
  customers: Customer[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: CustomerStatus | "all";
};

function formatLastContact(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CustomersPageClient({
  customers,
  total,
  page,
  totalPages,
  search,
  status,
}: CustomersPageClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">(status);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  function navigateWithFilters(nextSearch: string, nextStatus: CustomerStatus | "all") {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    navigateWithFilters(String(formData.get("search") ?? ""), statusFilter);
  }

  function openCreate() {
    setSelectedCustomer(null);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setSelectedCustomer(customer);
    setFormOpen(true);
  }

  function openDelete(customer: Customer) {
    setSelectedCustomer(customer);
    setDeleteOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage leads and track follow-ups.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add customer
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search by name or company…"
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <Select
          value={status}
          onValueChange={(value) => {
            const nextStatus = value as CustomerStatus | "all";
            setStatusFilter(nextStatus);
            navigateWithFilters(search, nextStatus);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CUSTOMER_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {CUSTOMER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass rounded-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last contact</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <p className="text-muted-foreground">
                    {total === 0 && !search && status === "all"
                      ? "No customers yet. Add your first lead."
                      : "No customers match your search."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.company ?? "—"}
                  </TableCell>
                  <TableCell>
                    <CustomerStatusBadge status={customer.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatLastContact(customer.last_contact)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(customer)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDelete(customer)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {customers.length} of {total} customers
        </p>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          searchParams={{ search: search || undefined, status: status === "all" ? undefined : status }}
        />
      </div>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={selectedCustomer}
      />

      <DeleteCustomerDialog
        customer={selectedCustomer}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
