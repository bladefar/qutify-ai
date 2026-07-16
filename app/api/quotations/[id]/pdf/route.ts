import { getBusinessProfile } from "@/services/business-profiles";
import { getEffectiveEntitlements } from "@/services/entitlements";
import { getQuotationById } from "@/services/quotations";
import { renderQuotationPdf } from "@/features/quotations/components/quotation-pdf-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/quotations/[id]/pdf">
) {
  let entitlements;

  try {
    entitlements = await getEffectiveEntitlements();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response("Sign in to download this quotation.", { status: 401 });
    }
    throw error;
  }

  if (!entitlements.features.pdfExport) {
    return new Response(
      "PDF export is available on the Pro plan. Upgrade to download professional quotations.",
      { status: 403 }
    );
  }

  const { id } = await context.params;
  const [quote, businessProfile] = await Promise.all([
    getQuotationById(id),
    getBusinessProfile(),
  ]);

  if (!quote) {
    return new Response("Quotation not found.", { status: 404 });
  }

  const buffer = await renderQuotationPdf(quote, businessProfile);
  const filename = `quotation-${quote.id.slice(0, 8)}.pdf`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/pdf",
    },
  });
}
