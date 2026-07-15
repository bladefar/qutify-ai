"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveBusinessProfileAction,
  type BusinessProfileActionState,
} from "@/features/settings/actions";
import type { BusinessProfile } from "@/types/business-profile";

const initialState: BusinessProfileActionState = {};

export function BusinessProfileForm({
  profile,
  accountEmail,
}: {
  profile: BusinessProfile | null;
  accountEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveBusinessProfileAction,
    initialState
  );
  const [showForm, setShowForm] = useState(Boolean(profile));

  if (!profile && !showForm) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle>Your business profile is not set up yet</CardTitle>
          <CardDescription>
            Add your business details once and they will be ready for quotations and PDF exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountEmail && (
            <p className="text-sm text-muted-foreground">
              Signed-in account: <span className="text-foreground">{accountEmail}</span>
            </p>
          )}
          <Button type="button" onClick={() => setShowForm(true)}>
            Set up business profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Business details</CardTitle>
        <CardDescription>
          These details will appear on future quotation PDF exports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="business_name">Business name *</Label>
            <Input
              id="business_name"
              name="business_name"
              required
              defaultValue={profile?.business_name ?? ""}
              placeholder="Rajesh Traders"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="business_email">Business email</Label>
              <Input
                id="business_email"
                name="business_email"
                type="email"
                defaultValue={profile?.business_email ?? ""}
                placeholder="hello@yourbusiness.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="business_phone">Business phone</Label>
              <Input
                id="business_phone"
                name="business_phone"
                type="tel"
                defaultValue={profile?.business_phone ?? ""}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="business_address">Business address</Label>
            <Textarea
              id="business_address"
              name="business_address"
              rows={3}
              defaultValue={profile?.business_address ?? ""}
              placeholder="Shop 12, Main Market, Jaipur, Rajasthan"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="gst_number">GST number</Label>
              <Input
                id="gst_number"
                name="gst_number"
                defaultValue={profile?.gst_number ?? ""}
                placeholder="08ABCDE1234F1Z5"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="default_gst_rate">Default GST rate (%)</Label>
              <Input
                id="default_gst_rate"
                name="default_gst_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                defaultValue={profile?.default_gst_rate ?? 18}
              />
            </div>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-brand-success">Business profile saved.</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : profile ? "Save changes" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
