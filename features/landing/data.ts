export type Feature = {
  emoji: string;
  title: string;
  description: string;
};

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const features: Feature[] = [
  {
    emoji: "🤖",
    title: "Natural-language quotes",
    description:
      'Type "50 Nike shirts and 20 Lacoste polos" — AI matches your catalog and builds a full quotation instantly.',
  },
  {
    emoji: "📦",
    title: "Real product catalog",
    description:
      "Every line item pulls from your actual products, prices, and SKUs. No hallucinated items or made-up prices.",
  },
  {
    emoji: "👥",
    title: "Lead & customer tracking",
    description:
      "Attach quotes to leads, track follow-ups, and see which customers convert — all in one place.",
  },
  {
    emoji: "📄",
    title: "Professional PDF exports",
    description:
      "Send polished quotations with subtotal, GST, discounts, and totals — ready for your customer.",
  },
  {
    emoji: "📊",
    title: "Revenue analytics",
    description:
      "Dashboard shows pipeline value, conversion rates, and top products so you know what's working.",
  },
  {
    emoji: "⚡",
    title: "Built for speed",
    description:
      "Go from customer request to sent quote in seconds, not hours. Focus on selling, not spreadsheets.",
  },
];

export const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for trying Quotify with a small catalog.",
    features: [
      "Up to 25 products",
      "20 quotations per month",
      "10 AI generations per month",
      "Basic lead tracking",
    ],
    cta: "Get started free",
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    description: "For growing businesses that quote daily.",
    features: [
      "Up to 500 products",
      "250 quotations per month",
      "150 AI generations per month",
      "PDF exports",
      "Analytics dashboard",
    ],
    highlighted: true,
    cta: "Get started",
  },
];

export const faqItems: FaqItem[] = [
  {
    question: "How does the AI know my product prices?",
    answer:
      "You upload your product catalog with names, SKUs, and prices. When you type a natural-language request, Quotify matches items against your real data — it never invents products or prices.",
  },
  {
    question: "Can I customize GST and discounts?",
    answer:
      "Yes. Set your default GST rate in settings, and apply line-item or order-level discounts. Every quote shows a clear breakdown of subtotal, tax, discount, and total.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Your catalog and customer data are stored securely with Supabase (PostgreSQL). Authentication is handled via industry-standard secure sessions.",
  },
  {
    question: "Do I need technical skills to set up?",
    answer:
      "No. Sign up, add your products in a simple table, and start quoting. The AI assistant handles the heavy lifting — you just describe what the customer wants.",
  },
  {
    question: "Can I export quotes as PDF?",
    answer:
      "The Pro plan includes professional PDF exports with your business details, itemized lines, and totals — ready to email or print.",
  },
];

export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export const footerAccountLinks = [
  { label: "Log in", href: "/login" },
  { label: "Sign up", href: "/register" },
];
