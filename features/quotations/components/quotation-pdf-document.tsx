import "server-only";

/* eslint-disable jsx-a11y/alt-text -- React-PDF Image has no alt prop. */

import { join } from "node:path";
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { BusinessProfile } from "@/types/business-profile";
import type { QuotationDetail } from "@/types/quotation";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#18181B",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    paddingBottom: 18,
    borderBottom: "1 solid #E4E4E7",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logo: { width: 36, height: 36, marginRight: 10 },
  brand: { fontSize: 22, fontWeight: 700, color: "#2563EB" },
  subtitle: { marginTop: 4, fontSize: 9, color: "#71717A" },
  businessDetails: {
    marginTop: 8,
    fontSize: 8,
    lineHeight: 1.35,
    color: "#52525B",
  },
  title: { fontSize: 18, fontWeight: 700, textAlign: "right" },
  meta: { marginTop: 6, color: "#71717A", textAlign: "right" },
  section: { marginBottom: 22 },
  label: {
    marginBottom: 5,
    fontSize: 8,
    color: "#71717A",
    textTransform: "uppercase",
  },
  customer: { fontSize: 12, fontWeight: 700 },
  table: { marginTop: 8, border: "1 solid #E4E4E7" },
  tableHeader: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#F4F4F5",
    color: "#52525B",
    fontSize: 8,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    padding: 8,
    borderTop: "1 solid #E4E4E7",
  },
  product: { flex: 1 },
  quantity: { width: 65, textAlign: "right" },
  price: { width: 85, textAlign: "right" },
  amount: { width: 90, textAlign: "right" },
  totals: { marginTop: 18, marginLeft: "auto", width: 245 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  totalLabel: { color: "#71717A" },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 9,
    borderTop: "1 solid #A1A1AA",
    fontSize: 13,
    fontWeight: 700,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    color: "#A1A1AA",
    fontSize: 8,
  },
});

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuotationPdfDocument({
  quote,
  businessProfile,
  logoSource,
}: {
  quote: QuotationDetail;
  businessProfile: BusinessProfile | null;
  logoSource: string;
}) {
  const businessDetails = businessProfile
    ? [
        businessProfile.business_email,
        businessProfile.business_phone,
        businessProfile.business_address,
        businessProfile.gst_number
          ? `GSTIN: ${businessProfile.gst_number}`
          : null,
      ].filter(Boolean)
    : ["Add your business details in Settings"];

  return (
    <Document title={`Quotation ${quote.id.slice(0, 8)}`} author="Quotify AI">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Image src={logoSource} style={styles.logo} />
              <View>
                <Text style={styles.brand}>
                  {businessProfile?.business_name ?? "Quotify AI"}
                </Text>
                <Text style={styles.subtitle}>Professional quotation</Text>
              </View>
            </View>
            {businessDetails.map((detail) => (
              <Text key={detail} style={styles.businessDetails}>
                {detail}
              </Text>
            ))}
          </View>
          <View>
            <Text style={styles.title}>QUOTATION</Text>
            <Text style={styles.meta}>Date: {formatDate(quote.created_at)}</Text>
            <Text style={styles.meta}>Status: {quote.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Prepared for</Text>
          <Text style={styles.customer}>
            {quote.customer_name ?? "No customer"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.product}>Product</Text>
              <Text style={styles.quantity}>Quantity</Text>
              <Text style={styles.price}>Unit price</Text>
              <Text style={styles.amount}>Line total</Text>
            </View>
            {quote.items.map((item) => (
              <View style={styles.row} key={item.id}>
                <Text style={styles.product}>{item.product_name}</Text>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Text style={styles.price}>{formatCurrency(item.unit_price)}</Text>
                <Text style={styles.amount}>{formatCurrency(item.line_total)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>{formatCurrency(quote.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text>−{formatCurrency(quote.discount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST ({quote.gst_rate}%)</Text>
              <Text>{formatCurrency(quote.gst_amount)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text>Total</Text>
              <Text>{formatCurrency(quote.total)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Generated by Quotify AI</Text>
      </Page>
    </Document>
  );
}

export function renderQuotationPdf(
  quote: QuotationDetail,
  businessProfile: BusinessProfile | null
) {
  const logoSource = join(process.cwd(), "app", "icon.png");
  return renderToBuffer(
    <QuotationPdfDocument
      quote={quote}
      businessProfile={businessProfile}
      logoSource={logoSource}
    />
  );
}
