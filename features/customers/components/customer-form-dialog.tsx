"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionState,
} from "@/features/customers/actions";
import {
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_LABELS,
  type Customer,
  type CustomerStatus,
} from "@/types/customer";

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
};

const initialState: CustomerActionState = {};

function toDateInputValue(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const isEditing = Boolean(customer);
  const action = isEditing ? updateCustomerAction : createCustomerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? "warm");

  useEffect(() => {
    if (open) {
      setStatus(customer?.status ?? "warm");
    }
  }, [open, customer]);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit customer" : "Add customer"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this lead's contact details and status."
              : "Add a new lead to your pipeline."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4" key={customer?.id ?? "new"}>
          {customer && <input type="hidden" name="id" value={customer.id} />}
          <input type="hidden" name="status" value={status} />

          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={customer?.name ?? ""}
              placeholder="Rajesh Kumar"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                defaultValue={customer?.company ?? ""}
                placeholder="Rajesh Traders"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CustomerStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {CUSTOMER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={customer?.phone ?? ""}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={customer?.email ?? ""}
                placeholder="rajesh@example.com"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last_contact">Last contact</Label>
            <Input
              id="last_contact"
              name="last_contact"
              type="date"
              defaultValue={toDateInputValue(customer?.last_contact ?? null)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={customer?.notes ?? ""}
              placeholder="Interested in bulk apparel orders…"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEditing ? "Save changes" : "Add customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
