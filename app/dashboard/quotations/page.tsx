import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function QuotationsPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
      <p className="mt-2 text-muted-foreground">
        AI-powered quote generation is coming in Day 3.
      </p>
      <Button className="mt-6" variant="outline" render={<Link href="/dashboard" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
