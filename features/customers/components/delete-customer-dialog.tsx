"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteCustomerAction } from "@/features/customers/actions";
import type { Customer } from "@/types/customer";

type DeleteCustomerDialogProps = {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteCustomerDialog({
  customer,
  open,
  onOpenChange,
}: DeleteCustomerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!customer) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteCustomerAction(customer.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">{customer?.name}</span>{" "}
            from your leads. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? (
              "Deleting…"
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
