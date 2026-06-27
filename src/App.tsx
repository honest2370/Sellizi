import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { edgeFunctionUrl, isSupabaseConfigured, supabase } from "./lib/supabase";

type Role = "seller" | "buyer" | "admin";
type Theme = "light" | "dark";
type NotificationType = "order" | "payment" | "broadcast";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

type Tool = {
  id: string;
  label: string;
  section: string;
  description: string;
};

type Country = {
  code: string;
  name: string;
  currency: string;
  operators: string[];
};

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "closed";
  createdAt: string;
  messages: TicketMessage[];
};

type TicketMessage = {
  id: string;
  sender: "user" | "admin" | "assistant";
  body: string;
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
};

const SUPPORT_EMAIL = "honestansah@gmial.com";

const ashtechCountries: Country[] = [
  { code: "BJ", name: "Benin", currency: "XOF", operators: ["Moov Money", "MTN Mobile Money"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["Moov Money", "Orange Money (OTP)"] },
  { code: "CM", name: "Cameroon", currency: "XAF", operators: ["MTN Mobile Money", "Orange Money"] },
  { code: "CF", name: "Central African Rep.", currency: "XAF", operators: ["Orange Money (OTP)"] },
  { code: "CG", name: "Congo", currency: "XAF", operators: ["Airtel Money", "MTN Mobile Money"] },
  { code: "CI", name: "Cote d'Ivoire", currency: "XOF", operators: ["Moov Money", "MTN", "Orange Money (OTP)", "Wave"] },
  { code: "GA", name: "Gabon", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "GN", name: "Guinea Conakry", currency: "GNF", operators: ["MTN Mobile Money", "Orange Money (OTP)"] },
  { code: "GQ", name: "Equatorial Guinea", currency: "XAF", operators: ["Orange Money (OTP)"] },
  { code: "GW", name: "Guinea-Bissau", currency: "XOF", operators: ["Orange Money (OTP)"] },
  { code: "ML", name: "Mali", currency: "XOF", operators: ["Moov Money", "Orange Money (OTP)"] },
  { code: "NE", name: "Niger", currency: "XOF", operators: ["Airtel Money"] },
  { code: "CD", name: "DR Congo", currency: "CDF", operators: ["Afrimoney", "Airtel", "Orange Money (OTP)", "Vodacom M-Pesa"] },
  { code: "SN", name: "Senegal", currency: "XOF", operators: ["Free Money", "Orange Money (OTP)", "Wave"] },
  { code: "TD", name: "Chad", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["Flooz (Moov)", "T-Money"] },
];

const sellerTools: Tool[] = [
  { id: "seller-space", label: "Seller Space", section: "Home", description: "Seller-only command page with store, catalog, payments, analytics, and marketing tools." },
  { id: "overview", label: "Overview", section: "Analytics", description: "Revenue, sales, views, and account health." },
  { id: "sales", label: "Sales", section: "Analytics", description: "Sales over time and gross collection history." },
  { id: "visitors", label: "Visitors", section: "Analytics", description: "Anonymous and logged-in store visits." },
  { id: "products", label: "Products", section: "Catalog", description: "Per-product performance and delivery forms." },
  { id: "conversion", label: "Conversion Rate", section: "Analytics", description: "Views to purchases ratio by channel." },
  { id: "link-traffic", label: "Link Traffic", section: "Marketing", description: "Referrer breakdown and shared checkout links." },
  { id: "affiliate", label: "Affiliate", section: "Marketing", description: "Affiliate clicks, payouts, and earnings." },
  { id: "external-checkout", label: "External Checkout", section: "Payments", description: "Buyer email capture and instant Ashtechpay processing." },
  { id: "ashtechpay", label: "Ashtechpay Payments", section: "Payments", description: "Mobile money collections, OTP, Wave, fees, and status." },
  { id: "subscriptions", label: "Subscriptions", section: "Payments", description: "Recurring plans, failed signal tickets, and retries." },
  { id: "payouts", label: "Payout Settings", section: "Payments", description: "Settlement accounts and payout readiness." },
  { id: "product-builder", label: "Product Upload Builder", section: "Catalog", description: "Fifteen product types with delivery fields." },
  { id: "inventory", label: "Inventory", section: "Catalog", description: "Stock, account slots, keys, and allocations." },
  { id: "courses", label: "Course Studio", section: "Catalog", description: "Chapters, modules, links, and previews." },
  { id: "file-vault", label: "File Vault", section: "Catalog", description: "Storage backed product assets and previews." },
  { id: "orders", label: "Orders", section: "Operations", description: "Fulfillment, refunds, and payment confirmation." },
  { id: "customers", label: "Customers", section: "Operations", description: "Buyer records, pins, segments, and access." },
  { id: "messages", label: "Support Messages", section: "Operations", description: "Tickets, chat thread, and attachments." },
  { id: "notifications", label: "Notifications", section: "Operations", description: "Realtime order, payment, and broadcast alerts." },
  { id: "broadcasts", label: "Broadcasts", section: "Marketing", description: "Send info, promo, or alert messages to buyers." },
  { id: "coupons", label: "Coupons", section: "Marketing", description: "Discount codes and campaign windows." },
  { id: "funnels", label: "Sales Funnels", section: "Marketing", description: "Landing flows and checkout experiments." },
  { id: "email-campaigns", label: "Email Campaigns", section: "Marketing", description: "Launch product updates and newsletters." },
  { id: "price-drops", label: "Price Drops", section: "Marketing", description: "Notify followers about sale events." },
  { id: "ab-tests", label: "A/B Testing", section: "Marketing", description: "Test product pages and checkout copy." },
  { id: "pixel-events", label: "Pixel Events", section: "Marketing", description: "Track purchase, view, and checkout events." },
  { id: "seo", label: "SEO", section: "Growth", description: "Open Graph, Twitter cards, sitemap, and keywords." },
  { id: "domain", label: "Custom Domain", section: "Growth", description: "Slug editor and branded domains." },
  { id: "store-design", label: "Store Design", section: "Store", description: "Templates, theme, typography, and layout." },
  { id: "store-general", label: "General Store Settings", section: "Store", description: "Name, logo, currency, and social links." },
  { id: "charges", label: "Custom Charge Settings", section: "Store", description: "Fees, taxes, handling, and custom charges." },
  { id: "currencies", label: "Store Currencies", section: "Store", description: "Multi-currency display and default currency." },
  { id: "delivery", label: "Store Delivery Settings", section: "Store", description: "Delivery rules for digital and service products." },
  { id: "support-channels", label: "Store Support Channels", section: "Store", description: "WhatsApp, email, phone, and assistant channels." },
  { id: "legal", label: "Legal Pages", section: "Store", description: "Terms, privacy, refund, and compliance copy." },
  { id: "profile", label: "Profile Settings", section: "Account", description: "Avatar, display name, handle, bio, and phone." },
  { id: "email-preferences", label: "Email Preferences", section: "Account", description: "Order, price drop, promo, and news toggles." },
  { id: "security", label: "Security and Password", section: "Account", description: "Change password, 2FA placeholder, and sessions." },
  { id: "delete-account", label: "Delete Account", section: "Account", description: "Double-confirm soft delete with deleted_at." },
  { id: "ai-assistant", label: "AI Assistant", section: "Advanced", description: "Seller AI tools using admin approved models." },
  { id: "crm", label: "CRM Segments", section: "Advanced", description: "Segments, notes, and buyer lifecycle." },
  { id: "bulk-import", label: "Bulk Import", section: "Advanced", description: "CSV imports for keys, accounts, and products." },
  { id: "api-keys", label: "Developer API", section: "Advanced", description: "Webhooks, tokens, and integration logs." },
  { id: "risk", label: "Risk Rules", section: "Advanced", description: "Fraud signals, velocity checks, and holds." },
  { id: "tax", label: "Tax Center", section: "Advanced", description: "Invoice numbering and local tax settings." },
  { id: "team", label: "Team Access", section: "Advanced", description: "Staff roles and permission scopes." },
  { id: "audit", label: "Audit Log", section: "Advanced", description: "Track store changes and payment actions." },
  { id: "upsells", label: "Upsells", section: "Advanced", description: "Post-purchase offers and order bump controls." },
  { id: "bundles", label: "Bundles", section: "Advanced", description: "Bundle products, accounts, files, links, and courses." },
  { id: "waitlists", label: "Waitlists", section: "Advanced", description: "Capture demand before product drops." },
  { id: "webinars", label: "Webinars", section: "Advanced", description: "Live class pages, replay access, and attendance tracking." },
  { id: "reviews", label: "Reviews", section: "Growth", description: "Collect buyer reviews and approve testimonials." },
  { id: "seller-automation", label: "Automation Rules", section: "Advanced", description: "Automate delivery, tagging, support routing, and broadcasts." },
  { id: "help", label: "Help and How to Use", section: "Support", description: "Searchable seller help topics." },
];

const adminTools: Tool[] = [
  { id: "admin-space", label: "Admin Space", section: "Home", description: "Admin-only command page for platform operations, payments, users, AI, and Supabase health." },
  { id: "admin-overview", label: "Admin Overview", section: "Command", description: "Platform revenue, sellers, buyers, and alerts." },
  { id: "user-directory", label: "User Directory", section: "Identity", description: "Manage users outside seller RLS data paths." },
  { id: "seller-verification", label: "Seller Verification", section: "Identity", description: "Review seller onboarding and compliance." },
  { id: "buyer-access", label: "Buyer Access", section: "Identity", description: "Purchased product access and buyer pins." },
  { id: "roles", label: "Role Management", section: "Identity", description: "Admin, seller, buyer, and staff permissions." },
  { id: "admin-broadcasts", label: "Broadcast Center", section: "Messaging", description: "Send targeted messages by email or to all users." },
  { id: "support-admin", label: "Support Desk", section: "Messaging", description: "Ticket triage, chat, attachments, and assistant handoff." },
  { id: "support-email", label: "Support Email", section: "Messaging", description: "Editable support email and routing rules." },
  { id: "notification-center", label: "Notification Center", section: "Messaging", description: "Realtime and push notification delivery." },
  { id: "push-vapid", label: "VAPID Push Keys", section: "Messaging", description: "Store VAPID public key and push settings." },
  { id: "ashtech-config", label: "Ashtechpay Config", section: "Payments", description: "API key, countries, fees, status, and webhook setup." },
  { id: "payment-ledger", label: "Payment Ledger", section: "Payments", description: "All collections, statuses, and callbacks." },
  { id: "fees", label: "Fee Schedule", section: "Payments", description: "Ashtechpay fee sync and platform fees." },
  { id: "payout-review", label: "Payout Review", section: "Payments", description: "Approve settlements and hold risky payouts." },
  { id: "refunds", label: "Refunds", section: "Payments", description: "Refund workflow and dispute evidence." },
  { id: "subscription-admin", label: "Subscription Admin", section: "Payments", description: "Failed payment signals and plan access." },
  { id: "rls-monitor", label: "RLS Monitor", section: "Data", description: "Separated admin tables and policy diagnostics." },
  { id: "database-health", label: "Database Health", section: "Data", description: "Table health, replication, and query errors." },
  { id: "storage-manager", label: "Storage Manager", section: "Data", description: "Buckets, support files, avatars, and product assets." },
  { id: "edge-functions", label: "Edge Functions", section: "Data", description: "Deploy, inspect, and test Supabase functions." },
  { id: "realtime-monitor", label: "Realtime Monitor", section: "Data", description: "Channels, subscriptions, and event delivery." },
  { id: "ai-control", label: "AI Model Keys", section: "AI", description: "Grok, Gemini, Claude, OpenAI, and routing rules." },
  { id: "ai-usage", label: "AI Usage", section: "AI", description: "Usage caps, logs, and per-feature costs." },
  { id: "content-moderation", label: "Content Moderation", section: "Trust", description: "Review products, files, and suspicious listings." },
  { id: "risk-admin", label: "Risk and Fraud", section: "Trust", description: "Risk scores, velocity rules, and account locks." },
  { id: "audit-admin", label: "Audit Logs", section: "Trust", description: "Admin actions, seller changes, and payment events." },
  { id: "legal-admin", label: "Legal Manager", section: "Compliance", description: "Terms, privacy, refund, and takedown pages." },
  { id: "seo-admin", label: "SEO Manager", section: "Growth", description: "Canonical, sitemap, social cards, and verification." },
  { id: "app-settings", label: "App Settings", section: "System", description: "Global defaults and feature flags." },
  { id: "theme-admin", label: "Theme System", section: "System", description: "Brand tokens, templates, and UI density." },
  { id: "marketplace-admin", label: "Marketplace Control", section: "System", description: "Discovery rules without cross-space product leakage." },
  { id: "country-admin", label: "Country Coverage", section: "System", description: "Ashtechpay countries and operators." },
  { id: "integrations", label: "Integrations", section: "System", description: "Webhooks, API clients, analytics, and exports." },
  { id: "reports", label: "Reports", section: "System", description: "Export revenue, users, traffic, and support data." },
  { id: "backups", label: "Backups", section: "System", description: "Database backup checklist and restore drills." },
  { id: "incidents", label: "Incident Center", section: "System", description: "Downtime, failed payments, and user notices." },
  { id: "admin-queues", label: "Admin Queues", section: "System", description: "Central queues for verification, disputes, payouts, and support." },
  { id: "admin-templates", label: "Template Manager", section: "System", description: "Manage seller storefront and buyer portal templates." },
  { id: "admin-feature-flags", label: "Feature Flags", section: "System", description: "Roll out features by role, country, seller, or cohort." },
  { id: "admin-rate-limits", label: "Rate Limits", section: "Trust", description: "Protect auth, checkout, support, and Edge Function traffic." },
  { id: "admin-data-export", label: "Data Export", section: "Compliance", description: "GDPR-style export, deletion review, and audit packages." },
  { id: "admin-webhooks", label: "Webhook Logs", section: "Data", description: "Inspect Ashtechpay, support, and platform webhook deliveries." },
  { id: "help-admin", label: "Help Content", section: "Knowledge", description: "Searchable help topics and page publishing." },
];

const buyerTools: Tool[] = [
  { id: "buyer-space", label: "Buyer Space", section: "Home", description: "Buyer-only page for purchases, access PIN, downloads, courses, receipts, and support." },
  { id: "buyer-home", label: "Buyer Home", section: "Library", description: "Purchased products and account access." },
  { id: "buyer-pin", label: "Email and PIN Access", section: "Library", description: "First screen email, second screen five digit PIN." },
  { id: "buyer-products", label: "My Products", section: "Library", description: "Only buyer-owned products and files." },
  { id: "buyer-courses", label: "Course Player", section: "Learning", description: "Preview video, chapters, modules, and external links." },
  { id: "buyer-files", label: "File Preview", section: "Library", description: "Preview PDFs, videos, audio, and hosted links." },
  { id: "buyer-accounts", label: "Accounts Vault", section: "Library", description: "Access proxy and login slots securely." },
  { id: "buyer-downloads", label: "Downloads", section: "Library", description: "Download purchased files when delivery allows." },
  { id: "buyer-invoices", label: "Invoices", section: "Payments", description: "Receipts and payment confirmations." },
  { id: "buyer-support", label: "Support", section: "Support", description: "Create tickets and attach files." },
  { id: "buyer-notifications", label: "Notifications", section: "Support", description: "Payment, order, and broadcast messages." },
  { id: "buyer-profile", label: "Buyer Profile", section: "Account", description: "Name, email, phone, and preferences." },
  { id: "buyer-security", label: "Buyer Security", section: "Account", description: "PIN, password, and session controls." },
  { id: "buyer-receipts", label: "Receipts", section: "Payments", description: "All paid receipts by product and seller." },
  { id: "buyer-refunds", label: "Refund Requests", section: "Payments", description: "Ask for a refund and upload evidence." },
  { id: "buyer-payment-status", label: "Payment Status", section: "Payments", description: "Track pending Ashtechpay and Wave payments." },
  { id: "buyer-wishlist", label: "Wishlist", section: "Discovery", description: "Save products for later without mixing seller tools." },
  { id: "buyer-following", label: "Following", section: "Discovery", description: "Follow sellers and receive product updates." },
  { id: "buyer-price-alerts", label: "Price Alerts", section: "Discovery", description: "Alerts for price drops on followed products." },
  { id: "buyer-learning-progress", label: "Learning Progress", section: "Learning", description: "Track course modules, completions, and replays." },
  { id: "buyer-notes", label: "Course Notes", section: "Learning", description: "Private notes attached to course lessons." },
  { id: "buyer-bookmarks", label: "Bookmarks", section: "Learning", description: "Bookmark videos, PDFs, and external links." },
  { id: "buyer-certificates", label: "Certificates", section: "Learning", description: "Certificates for eligible completed courses." },
  { id: "buyer-license-keys", label: "License Keys", section: "Library", description: "Purchased software keys and activation instructions." },
  { id: "buyer-memberships", label: "Memberships", section: "Library", description: "Active memberships, benefits, and renewal dates." },
  { id: "buyer-events", label: "Event Tickets", section: "Library", description: "Ticket codes, dates, venues, and check-in details." },
  { id: "buyer-secure-links", label: "Secure Links", section: "Library", description: "Time-limited product links and access status." },
  { id: "buyer-devices", label: "Devices", section: "Account", description: "Manage trusted devices and active sessions." },
  { id: "buyer-preferences", label: "Preferences", section: "Account", description: "Language, currency, notifications, and theme." },
  { id: "buyer-help", label: "Buyer Help", section: "Support", description: "Help topics for access, PINs, files, courses, and payments." },
  { id: "buyer-disputes", label: "Disputes", section: "Support", description: "Escalate unresolved delivery or payment issues." },
];

const productTypes = [
  { id: "ebook", label: "Ebook", fields: ["Title", "Author", "Description", "PDF file or link", "Cover image", "Sample pages", "License note"] },
  { id: "proxy-account", label: "Proxy Account", fields: ["Protocol", "Server", "Port", "Authentication mode", "Username", "Password", "Rotation note", "Expiry"] },
  { id: "account", label: "Account Login", fields: ["Account name", "Description", "Slot format", "Email or phone", "ID", "Password", "Recovery note", "Product image"] },
  { id: "video-course", label: "Video Course", fields: ["Name", "Chapter", "Module", "Description", "Video file or link", "Transcript", "Resources", "Completion rule"] },
  { id: "course-link", label: "Course Link", fields: ["Course name", "Single access link", "Preview link", "Access duration", "Instructions", "Support channel"] },
  { id: "software", label: "Software", fields: ["Software name", "Version", "Platform", "Installer file", "License key", "Activation guide", "Checksum"] },
  { id: "license-key", label: "License Key", fields: ["Product name", "Key pattern", "Key slots", "Activation URL", "Expiry", "Seat limit"] },
  { id: "template", label: "Template", fields: ["Template name", "Category", "Preview link", "Source files", "Documentation", "Editable formats"] },
  { id: "design-asset", label: "Design Asset", fields: ["Asset name", "Formats", "Preview image", "Source file", "License", "Dimensions"] },
  { id: "audio-pack", label: "Audio Pack", fields: ["Pack name", "Track list", "Audio previews", "ZIP file", "License", "BPM or genre"] },
  { id: "dataset", label: "Dataset", fields: ["Dataset name", "Schema", "Rows", "File", "Sample", "Usage license", "Update frequency"] },
  { id: "membership", label: "Membership", fields: ["Plan name", "Access link", "Billing period", "Community link", "Benefits", "Cancellation rule"] },
  { id: "event-ticket", label: "Event Ticket", fields: ["Event name", "Date", "Ticket code", "Venue or link", "Seat", "Check-in instructions"] },
  { id: "service", label: "Service Package", fields: ["Service name", "Scope", "Delivery timeline", "Requirements", "Booking link", "Revision count"] },
  { id: "custom-link", label: "Custom Link Product", fields: ["Product name", "Secure link", "Preview link", "Instructions", "Expiration", "Fallback file"] },
];

const helpTopics = [
  { id: "start", title: "Set up SELLIZI", body: "Create your store, choose a currency, add a support channel, then publish your first checkout link." },
  { id: "payments", title: "Ashtechpay payments", body: "Payments run through Supabase Edge Functions so the Ashtechpay secret stays server side." },
  { id: "buyers", title: "Buyer access PIN", body: "After purchase the buyer verifies the purchase email, then creates or enters a five digit PIN." },
  { id: "products", title: "Product delivery", body: "Use the product builder to match the real delivery format for ebooks, accounts, courses, keys, files, services, and links." },
  { id: "support", title: "Support tickets", body: "Tickets include realtime chat and optional attachments stored in Supabase Storage." },
];

const initialNotifications: Notification[] = [
  { id: "n1", title: "Order received", body: "New ebook order is waiting for confirmation.", type: "order", read: false, createdAt: "2 min ago" },
  { id: "n2", title: "Payment confirmed", body: "Ashtechpay collection SET-1024 moved to confirmed.", type: "payment", read: false, createdAt: "8 min ago" },
  { id: "n3", title: "Admin broadcast", body: "New seller risk rules are active on checkout links.", type: "broadcast", read: true, createdAt: "1 hour ago" },
];

const initialTickets: Ticket[] = [
  {
    id: "TCK-1042",
    subject: "Subscription payment signal problem",
    status: "open",
    createdAt: "Today",
    messages: [
      { id: "m1", sender: "user", body: "Subscription payment signal has a problem. Please contact admin.", createdAt: "09:20" },
      { id: "m2", sender: "assistant", body: "Ticket created and routed to admin support.", createdAt: "09:21" },
    ],
  },
];

const chartValues = [34, 45, 38, 62, 54, 72, 88, 79, 94, 106, 112, 128];

function iconPath(name: string) {
  const paths: Record<string, React.ReactElement> = {
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    chart: <path d="M4 19V5M4 19h16M8 16V9M12 16V6M16 16v-4M20 16V8" />,
    user: <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
    bell: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    pay: <path d="M3 7h18v10H3zM3 10h18M7 15h4M15 15h2" />,
    lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" />,
    file: <path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6M9 9h2" />,
    message: <path d="M4 5h16v11H7l-3 3z" />,
    search: <path d="m21 21-4.2-4.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />,
    upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
    globe: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />,
    spark: <path d="M12 3l2.2 6.2L20 12l-5.8 2.8L12 21l-2.2-6.2L4 12l5.8-2.8z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    sun: <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
    moon: <path d="M21 13.2A8 8 0 1 1 10.8 3a6.5 6.5 0 0 0 10.2 10.2Z" />,
  };
  return paths[name] ?? paths.grid;
}

function SvgIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPath(name)}
    </svg>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg className="h-10 w-10 shrink-0" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect width="48" height="48" rx="12" fill="url(#selliziGradient)" />
        <path d="M13 31c4 3 15 4 20-1 4-4 1-8-7-9l-5-.7c-5-.7-6-4-3-6.6 4-3.4 13-2.5 17 .6" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M14 36h20" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="selliziGradient" x1="4" y1="5" x2="44" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="0.55" stopColor="#155e75" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      {!compact && (
        <div>
          <div className="text-lg font-black tracking-[0.32em] text-slate-950 dark:text-white">SELLIZI</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">fintech commerce OS</div>
        </div>
      )}
    </div>
  );
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function Button({ children, onClick, variant = "primary", type = "button", className = "", disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost"; type?: "button" | "submit"; className?: string; disabled?: boolean }) {
  const variants = {
    primary: "bg-slate-950 text-white hover:bg-slate-800 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200",
    secondary: "border border-slate-200 bg-white text-slate-950 hover:border-cyan-400 dark:border-white/10 dark:bg-white/10 dark:text-white",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classNames("min-h-11 rounded-full px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", readOnly = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; readOnly?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        readOnly={readOnly}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 read-only:bg-slate-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:read-only:bg-white/5"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-white">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!enabled)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      <span>{label}</span>
      <span className={classNames("relative h-7 w-12 rounded-full transition", enabled ? "bg-cyan-500" : "bg-slate-300 dark:bg-slate-700")}>
        <span className={classNames("absolute top-1 h-5 w-5 rounded-full bg-white transition", enabled ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function StatBlock({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">{note}</div>
    </div>
  );
}

function MiniChart({ values = chartValues, height = 170 }: { values?: number[]; height?: number }) {
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${height - (value / max) * (height - 20) - 10}`).join(" ");
  return (
    <svg className="h-48 w-full overflow-visible" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-label="Revenue chart">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#0891b2" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((line) => (
        <line key={line} x1="0" x2="100" y1={(height / 4) * line + 8} y2={(height / 4) * line + 8} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
      ))}
      <polygon points={`0,${height} ${points} 100,${height}`} fill="url(#areaGradient)" />
      <polyline points={points} fill="none" stroke="url(#lineGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TransitionProgress({ page }: { page: string }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 520);
    return () => window.clearTimeout(timer);
  }, [page]);
  return <motion.div className="fixed left-0 top-0 z-[80] h-1 bg-cyan-400" initial={{ width: "0%" }} animate={{ width: active ? "88%" : "100%", opacity: active ? 1 : 0 }} transition={{ duration: active ? 0.42 : 0.2 }} />;
}

function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <motion.div className="absolute inset-0" initial={{ scale: 1.06, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.1, ease: "easeOut" }}>
        <svg className="h-full w-full" viewBox="0 0 1440 980" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="34%" r="70%">
              <stop stopColor="#155e75" />
              <stop offset="0.42" stopColor="#0f172a" />
              <stop offset="1" stopColor="#020617" />
            </radialGradient>
            <linearGradient id="heroLine" x1="180" x2="1260" y1="120" y2="860">
              <stop stopColor="#67e8f9" stopOpacity="0.85" />
              <stop offset="1" stopColor="#0e7490" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <rect width="1440" height="980" fill="url(#heroGlow)" />
          <path d="M0 720C200 610 330 625 475 700c180 92 330 120 520 20 165-87 285-90 445-20v280H0z" fill="#03111f" opacity="0.82" />
          <path d="M100 710C340 540 515 560 690 640c190 88 365 70 550-90" stroke="url(#heroLine)" strokeWidth="4" fill="none" />
          <path d="M190 280h1060M220 360h1000M180 440h1080M250 520h930" stroke="#67e8f9" strokeOpacity="0.08" />
          <g opacity="0.92">
            <rect x="845" y="238" width="320" height="500" rx="44" fill="#061827" stroke="#67e8f9" strokeOpacity="0.35" />
            <rect x="882" y="294" width="246" height="54" rx="17" fill="#0f2a3a" />
            <rect x="882" y="380" width="246" height="130" rx="24" fill="#0b2232" stroke="#67e8f9" strokeOpacity="0.22" />
            <path d="M912 470c42-72 82-58 116-12 30 40 60 19 80-34" stroke="#22d3ee" strokeWidth="6" fill="none" strokeLinecap="round" />
            <rect x="882" y="544" width="112" height="42" rx="14" fill="#22d3ee" />
            <rect x="1016" y="544" width="112" height="42" rx="14" fill="#17384c" />
            <rect x="882" y="620" width="246" height="28" rx="14" fill="#17384c" />
            <rect x="882" y="666" width="170" height="28" rx="14" fill="#17384c" />
          </g>
        </svg>
      </motion.div>
      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        <nav className="flex items-center justify-between">
          <Logo />
          <Button variant="secondary" onClick={onEnter} className="border-white/20 bg-white/10 text-white hover:bg-white/15">Launch app</Button>
        </nav>
        <div className="flex flex-1 items-center py-14">
          <motion.div className="max-w-3xl" initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.8 }}>
            <div className="text-5xl font-black tracking-[0.38em] sm:text-7xl">SELLIZI</div>
            <h1 className="mt-8 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">A sophisticated fintech command center for digital sellers.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-cyan-50/78">Supabase powered authentication, realtime notifications, buyer access, storage, Edge Functions, PWA installability, and Ashtechpay mobile money collections.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button onClick={onEnter} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Enter SELLIZI</Button>
              <Button variant="secondary" onClick={onEnter} className="border-white/20 bg-white/10 text-white hover:bg-white/15">View workspace</Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function AuthScreen({ onAuthed }: { onAuthed: (name: string) => void }) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("Seller Admin");
  const [email, setEmail] = useState("seller@sellizi.app");
  const [password, setPassword] = useState("password123");
  const [phone, setPhone] = useState("+237670000000");
  const [country, setCountry] = useState("CM");
  const [status, setStatus] = useState("");

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Processing request...");
    try {
      if (supabase && mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (supabase && mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, phone, country } } });
        if (error) throw error;
      }
      if (supabase && mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setStatus("Reset email sent.");
        return;
      }
      if (mode === "forgot") {
        setStatus("Reset email simulated. Configure Supabase SMTP for live delivery.");
        return;
      }
      localStorage.setItem("sellizi-user", name || email);
      onAuthed(name || email);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  async function googleSignIn() {
    if (supabase) {
      await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      return;
    }
    setStatus("Google sign in is ready when Supabase OAuth keys are configured.");
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden bg-slate-950 p-10 text-white lg:block">
          <Logo />
          <div className="mt-16 text-5xl font-black tracking-tight">Secure access for sellers, buyers, and administrators.</div>
          <p className="mt-6 text-lg leading-8 text-slate-300">Email authentication, Google OAuth, password reset, phone and country capture, and local fallback for development without Supabase keys.</p>
          <svg className="mt-12 h-72 w-full" viewBox="0 0 640 360" fill="none" aria-hidden="true">
            <rect width="640" height="360" rx="36" fill="#071827" />
            <path d="M80 250c110-120 190-20 275-98 75-68 118-76 205-20" stroke="#22d3ee" strokeWidth="8" strokeLinecap="round" />
            <rect x="80" y="72" width="175" height="44" rx="16" fill="#123044" />
            <rect x="80" y="136" width="250" height="32" rx="12" fill="#0c2537" />
            <rect x="80" y="186" width="160" height="32" rx="12" fill="#0c2537" />
            <circle cx="500" cy="92" r="44" fill="#22d3ee" />
          </svg>
        </div>
        <div className="p-6 sm:p-10">
          <Logo />
          <div className="mt-10 flex gap-2 rounded-full bg-slate-100 p-1 dark:bg-white/5">
            {(["signin", "signup", "forgot"] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={classNames("flex-1 rounded-full px-4 py-3 text-sm font-bold capitalize transition", mode === item ? "bg-white text-slate-950 shadow-sm dark:bg-cyan-300" : "text-slate-500 dark:text-slate-300")}>
                {item === "signin" ? "Sign in" : item === "signup" ? "Sign up" : "Reset"}
              </button>
            ))}
          </div>
          <form className="mt-8 space-y-4" onSubmit={submitAuth}>
            {mode === "signup" && <Field label="Full name" value={name} onChange={setName} />}
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            {mode !== "forgot" && <Field label="Password" value={password} onChange={setPassword} type="password" />}
            {mode === "signup" && <Field label="Phone number" value={phone} onChange={setPhone} />}
            {mode === "signup" && <SelectField label="Country" value={country} onChange={setCountry} options={ashtechCountries.map((item) => item.code)} />}
            <Button type="submit" className="w-full">{mode === "forgot" ? "Send reset email" : mode === "signup" ? "Create account" : "Sign in"}</Button>
          </form>
          <Button variant="secondary" onClick={googleSignIn} className="mt-4 w-full">
            <span className="inline-flex items-center justify-center gap-2"><SvgIcon name="globe" /> Continue with Google</span>
          </Button>
          <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">{status || (isSupabaseConfigured ? "Supabase is configured." : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel for live auth.")}</p>
        </div>
      </div>
    </div>
  );
}

function NotificationPanel({ open, notifications, onClose, onReadAll }: { open: boolean; notifications: Notification[]; onClose: () => void; onReadAll: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-x-0 top-0 z-50 mx-auto max-w-3xl px-4 pt-4" initial={{ y: -260, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -260, opacity: 0 }} transition={{ type: "spring", stiffness: 210, damping: 24 }}>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-black text-slate-950 dark:text-white">Notifications</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Realtime orders, payments, and admin broadcasts.</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onReadAll}>Mark all read</Button>
                <Button variant="ghost" onClick={onClose}><SvgIcon name="close" /></Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-start gap-3">
                    <span className={classNames("mt-1 h-2.5 w-2.5 rounded-full", notification.read ? "bg-slate-300" : "bg-cyan-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-slate-950 dark:text-white">{notification.title}</div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{notification.createdAt}</div>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sidebar({ role, tools, page, setPage, open, setOpen }: { role: Role; tools: Tool[]; page: string; setPage: (page: string) => void; open: boolean; setOpen: (open: boolean) => void }) {
  const grouped = useMemo(() => {
    return tools.reduce<Record<string, Tool[]>>((acc, tool) => {
      acc[tool.section] = [...(acc[tool.section] ?? []), tool];
      return acc;
    }, {});
  }, [tools]);

  const content = (
    <div className="flex h-full flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-white/10">
        <Logo />
        <button className="rounded-full p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><SvgIcon name="close" /></button>
      </div>
      <div className="hidden-scrollbar flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-2xl bg-slate-100 p-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:bg-white/5 dark:text-slate-400">{role} space</div>
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="mb-5">
            <div className="mb-2 px-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{section}</div>
            <div className="space-y-1">
              {items.map((tool) => (
                <button key={tool.id} onClick={() => { setPage(tool.id); setOpen(false); }} className={classNames("w-full rounded-2xl px-3 py-3 text-left text-sm font-bold transition", page === tool.id ? "bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10")}>
                  {tool.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-80 shrink-0 border-r border-slate-200 dark:border-white/10 lg:block">{content}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} aria-label="Close drawer" />
            <motion.div className="relative h-full w-[88vw] max-w-sm" initial={{ x: -420 }} animate={{ x: 0 }} exit={{ x: -420 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>{content}</motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title="Overview" description="Revenue chart, total sales, total views, products, conversion, and payment health." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBlock label="Revenue" value="XAF 8.42M" note="+18.4 percent" />
        <StatBlock label="Total sales" value="2,846" note="1,024 confirmed" />
        <StatBlock label="Total views" value="92,180" note="tracked visits" />
        <StatBlock label="Conversion" value="3.09%" note="views to purchases" />
      </div>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Revenue over time</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Loaded from Supabase tables when environment keys are present.</p>
          </div>
          <Button variant="secondary">Export report</Button>
        </div>
        <div className="mt-6 text-cyan-900 dark:text-cyan-100"><MiniChart /></div>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {["Top product: AI prompt vault", "Best referrer: WhatsApp", "Fastest country: Cameroon"].map((item) => (
          <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-sm font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Insight</div>
            <div className="mt-3 text-lg font-black text-slate-950 dark:text-white">{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PageHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300 dark:bg-cyan-300 dark:text-slate-950"><SvgIcon name={icon} /></div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-base leading-7 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function AnalyticsPage({ type }: { type: "sales" | "visitors" | "conversion" | "traffic" | "affiliate" }) {
  const titles = {
    sales: ["Sales", "Sales over time chart, confirmed payments, failed retries, and settlement records."],
    visitors: ["Visitors", "Store visit tracking for anonymous visitors and logged-in customers."],
    conversion: ["Conversion Rate", "Views to purchases ratio by product, referrer, and country."],
    traffic: ["Link Traffic", "Referrer breakdown for checkout links, campaigns, and affiliates."],
    affiliate: ["Affiliate", "Affiliate link clicks, earnings data, commissions, and approval states."],
  } as const;
  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title={titles[type][0]} description={titles[type][1]} />
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><MiniChart values={type === "conversion" ? [2, 2.4, 2.2, 3, 2.8, 3.4, 3.1, 3.8, 4.2] : chartValues} /></div>
      <div className="grid gap-4 md:grid-cols-3">
        {["Realtime channel", "Database backed", "Export ready"].map((label, index) => (
          <StatBlock key={label} label={label} value={index === 0 ? "Live" : index === 1 ? "SQL" : "CSV"} note="operational" />
        ))}
      </div>
    </div>
  );
}

function ProductBuilder() {
  const [selected, setSelected] = useState(productTypes[0].id);
  const type = productTypes.find((item) => item.id === selected) ?? productTypes[0];
  const [extraFields, setExtraFields] = useState<string[]>(["Delivery instructions"]);
  return (
    <div className="space-y-6">
      <PageHeader icon="upload" title="Product Upload Builder" description="Create products using delivery forms that match how buyers actually receive access." />
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <SelectField label="Product type" value={selected} onChange={setSelected} options={productTypes.map((item) => item.id)} />
          <div className="mt-5 grid gap-3">
            {productTypes.map((item) => (
              <button key={item.id} onClick={() => setSelected(item.id)} className={classNames("rounded-2xl border px-4 py-3 text-left text-sm font-bold transition", selected === item.id ? "border-cyan-400 bg-cyan-50 text-cyan-950 dark:bg-cyan-300 dark:text-slate-950" : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300")}>
                {item.label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-black text-slate-950 dark:text-white">{type.label} delivery form</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[...type.fields, ...extraFields].map((field) => (
              <Field key={field} label={field} value="" onChange={() => undefined} placeholder={`Enter ${field.toLowerCase()}`} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => setExtraFields([...extraFields, `Custom field ${extraFields.length + 1}`])}>Add field</Button>
            <Button variant="secondary">Save product</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="file" title="Products" description="Per-product performance, stock, delivery format, and buyer access controls." />
      <div className="grid gap-4 md:grid-cols-3">
        {["AI prompt vault", "Proxy slots pack", "Video course masterclass"].map((name, index) => (
          <div key={name} className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-lg font-black text-slate-950 dark:text-white">{name}</div>
            <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${78 - index * 18}%` }} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><b>{940 - index * 220}</b><br /><span className="text-slate-500">views</span></div>
              <div><b>{92 - index * 19}</b><br /><span className="text-slate-500">sales</span></div>
              <div><b>{(9.8 - index * 1.6).toFixed(1)}%</b><br /><span className="text-slate-500">conv.</span></div>
            </div>
          </div>
        ))}
      </div>
      <ProductBuilder />
    </div>
  );
}

function AshtechpayPage({ supportEmail, createPaymentTicket }: { supportEmail: string; createPaymentTicket: () => void }) {
  const [countryCode, setCountryCode] = useState("CM");
  const country = ashtechCountries.find((item) => item.code === countryCode) ?? ashtechCountries[0];
  const [operator, setOperator] = useState(country.operators[0]);
  const [amount, setAmount] = useState("5000");
  const [phone, setPhone] = useState("670000000");
  const [email, setEmail] = useState("buyer@example.com");
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState("Ready to collect through Supabase Edge Function ashtechpay.");

  useEffect(() => {
    setOperator(country.operators[0]);
  }, [countryCode, country.operators]);

  async function collect() {
    setResult("Processing Ashtechpay collection...");
    const payload = {
      action: "collect",
      amount: Number(amount),
      currency: country.currency,
      phone,
      email,
      operator: operator.replace(" (OTP)", ""),
      country_code: country.code,
      otp: otp || undefined,
      reference: `SELLIZI-${Date.now()}`,
      notify_url: `${window.location.origin}/api/ashtechpay-webhook`,
    };
    try {
      const url = edgeFunctionUrl("ashtechpay");
      if (!url) {
        setResult(`Demo mode: ${payload.reference} pending for ${country.name}. Add Supabase keys and ASHTECHPAY_API_KEY in Vercel.`);
        return;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase?.auth.getSession())?.data.session?.access_token ?? ""}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      if (!response.ok && String(data?.message || data?.error || "").toLowerCase().includes("subscription")) createPaymentTicket();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Payment failed.");
      createPaymentTicket();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="pay" title="Ashtechpay Payments" description="Self-contained Supabase Edge Function integration for collect, countries, fees, transaction status, and webhooks." />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Country" value={countryCode} onChange={setCountryCode} options={ashtechCountries.map((item) => item.code)} />
            <SelectField label="Operator" value={operator} onChange={setOperator} options={country.operators} />
            <Field label="Amount" value={amount} onChange={setAmount} type="number" />
            <Field label="Currency" value={country.currency} onChange={() => undefined} readOnly />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Field label="Buyer email" value={email} onChange={setEmail} type="email" />
            <Field label="OTP if required" value={otp} onChange={setOtp} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={collect}>Collect payment</Button>
            <Button variant="secondary" onClick={createPaymentTicket}>Create payment ticket</Button>
          </div>
          <pre className="hidden-scrollbar mt-5 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-cyan-100">{result}</pre>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-black text-slate-950 dark:text-white">Supported Ashtechpay countries</div>
          <div className="hidden-scrollbar mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {ashtechCountries.map((item) => (
              <div key={item.code} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                <div className="flex justify-between gap-3"><b>{item.name}</b><span className="font-bold text-cyan-700 dark:text-cyan-300">{item.currency}</span></div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.operators.join(", ")}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Support email: {supportEmail}</p>
        </section>
      </div>
    </div>
  );
}

function SupportPage({ tickets, setTickets }: { tickets: Ticket[]; setTickets: (tickets: Ticket[]) => void }) {
  const [activeId, setActiveId] = useState(tickets[0]?.id ?? "");
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [subject, setSubject] = useState("Subscription payment signal problem");
  const [body, setBody] = useState("Subscription payment signal has a problem. Please contact admin.");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const activeTicket = tickets.find((ticket) => ticket.id === activeId) ?? tickets[0];

  function createTicket() {
    const ticket: Ticket = { id: `TCK-${Math.floor(1000 + Math.random() * 8999)}`, subject, status: "open", createdAt: "Now", messages: [{ id: `m-${Date.now()}`, sender: "user", body, createdAt: "Now" }] };
    setTickets([ticket, ...tickets]);
    setActiveId(ticket.id);
    setTab("open");
  }

  async function sendMessage() {
    if (!activeTicket || (!message && !fileRef.current?.files?.[0])) return;
    const file = fileRef.current?.files?.[0];
    let fileUrl = "";
    if (file && supabase) {
      const path = `tickets/${activeTicket.id}/${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from("support-attachments").upload(path, file, { upsert: true });
      fileUrl = data?.path ?? "";
    }
    const updated = tickets.map((ticket) => ticket.id === activeTicket.id ? { ...ticket, messages: [...ticket.messages, { id: `m-${Date.now()}`, sender: "user" as const, body: message || "File attached", fileName: file?.name, fileUrl, createdAt: "Now" }] } : ticket);
    setTickets(updated);
    setMessage("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="message" title="Support and Messages" description="Create tickets, switch open and closed tabs, chat in realtime, and upload attachments." />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-black text-slate-950 dark:text-white">Create ticket</div>
          <div className="mt-4 space-y-4">
            <Field label="Subject" value={subject} onChange={setSubject} />
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>Message</span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950 dark:text-white" />
            </label>
            <Button onClick={createTicket}>Create ticket</Button>
          </div>
          <div className="mt-8 flex gap-2 rounded-full bg-slate-100 p-1 dark:bg-white/5">
            {(["open", "closed"] as const).map((item) => (
              <button key={item} onClick={() => setTab(item)} className={classNames("flex-1 rounded-full px-4 py-3 text-sm font-bold capitalize", tab === item ? "bg-white text-slate-950 shadow-sm dark:bg-cyan-300" : "text-slate-500 dark:text-slate-300")}>{item}</button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {tickets.filter((ticket) => ticket.status === tab).map((ticket) => (
              <button key={ticket.id} onClick={() => setActiveId(ticket.id)} className={classNames("w-full rounded-2xl border p-4 text-left", activeId === ticket.id ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-300/10" : "border-slate-200 dark:border-white/10")}>
                <div className="font-black text-slate-950 dark:text-white">{ticket.subject}</div>
                <div className="mt-1 text-sm text-slate-500">{ticket.id} - {ticket.createdAt}</div>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-950 dark:text-white">{activeTicket?.subject ?? "No ticket selected"}</div>
              <div className="text-sm text-slate-500">Realtime message thread</div>
            </div>
            <Button variant="secondary">Assign admin</Button>
          </div>
          <div className="hidden-scrollbar mt-5 max-h-[440px] space-y-3 overflow-auto rounded-3xl bg-slate-50 p-4 dark:bg-slate-950">
            {activeTicket?.messages.map((item) => (
              <div key={item.id} className={classNames("max-w-[86%] rounded-2xl p-4", item.sender === "user" ? "ml-auto bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950" : "bg-white text-slate-700 dark:bg-white/10 dark:text-slate-100")}>
                <div className="text-xs font-black uppercase tracking-[0.2em] opacity-70">{item.sender}</div>
                <div className="mt-2 text-sm leading-6">{item.body}</div>
                {item.fileName && <div className="mt-2 text-xs font-bold">Attachment: {item.fileName}</div>}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a reply" className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white" />
            <Button onClick={sendMessage}>Send</Button>
          </div>
          <input ref={fileRef} type="file" className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm dark:border-white/10" />
        </section>
      </div>
    </div>
  );
}

function ProfilePage({ userName, theme, setTheme }: { userName: string; theme: Theme; setTheme: (theme: Theme) => void }) {
  const [display, setDisplay] = useState(userName);
  const [handle, setHandle] = useState("sellizi-store");
  const [bio, setBio] = useState("Digital commerce seller on SELLIZI.");
  const [phone, setPhone] = useState("+237670000000");
  const [prefs, setPrefs] = useState({ order: true, price: true, promo: false });
  return (
    <div className="space-y-6">
      <PageHeader icon="user" title="Profile and Account Settings" description="Avatar, display name, store handle, bio, WhatsApp, email, notification preferences, dark mode, security, and soft delete." />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-slate-950 text-3xl font-black text-cyan-300 dark:bg-cyan-300 dark:text-slate-950">S</div>
            <div>
              <Button variant="secondary"><span className="inline-flex items-center gap-2"><SvgIcon name="upload" /> Upload avatar</span></Button>
              <p className="mt-2 text-sm text-slate-500">Stored in Supabase Storage bucket avatars.</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <Toggle label="Order notifications" enabled={prefs.order} onChange={(value) => setPrefs({ ...prefs, order: value })} />
            <Toggle label="Price drop alerts" enabled={prefs.price} onChange={(value) => setPrefs({ ...prefs, price: value })} />
            <Toggle label="Promotions and news" enabled={prefs.promo} onChange={(value) => setPrefs({ ...prefs, promo: value })} />
            <Toggle label="Dark mode" enabled={theme === "dark"} onChange={(value) => setTheme(value ? "dark" : "light")} />
          </div>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" value={display} onChange={setDisplay} />
            <Field label="Username or store handle" value={handle} onChange={setHandle} />
            <Field label="WhatsApp or phone number" value={phone} onChange={setPhone} />
            <Field label="Read-only email" value="seller@sellizi.app" onChange={() => undefined} readOnly />
          </div>
          <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            <span>Bio</span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white" />
          </label>
          <div className="mt-5 flex flex-wrap gap-3"><Button>Save profile</Button><Button variant="secondary">Change password</Button><Button variant="secondary">Enable 2FA placeholder</Button></div>
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <div className="font-black text-red-700 dark:text-red-200">Delete account</div>
            <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">Double confirmation sets deleted_at instead of hard deleting data.</p>
            <Button variant="secondary" className="mt-3 border-red-300 text-red-700 dark:text-red-200">Start double-confirm</Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StoreSettingsPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <PageHeader icon="globe" title={title} description="Store settings are scoped to seller space and do not load external buyer products." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {["Store name", "Logo", "Currency", "Social links", "Delivery rules", "Support channels", "Legal pages", "Domain slug", "Payout account"].map((label) => (
          <Field key={label} label={label} value="" onChange={() => undefined} placeholder={`Configure ${label.toLowerCase()}`} />
        ))}
      </div>
      <Button>Save settings</Button>
    </div>
  );
}

function HelpPage() {
  const [query, setQuery] = useState("");
  const topics = helpTopics.filter((topic) => `${topic.title} ${topic.body}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-6">
      <PageHeader icon="search" title="Help and How to Use" description="Searchable help content with topic list and detail previews." />
      <Field label="Search help" value={query} onChange={setQuery} placeholder="Search payments, products, buyers, support" />
      <div className="grid gap-4 md:grid-cols-2">
        {topics.map((topic) => (
          <article key={topic.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{topic.title}</h2>
            <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">{topic.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function LegalPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="file" title="Legal Pages" description="Inline Terms of Service, inline Privacy Policy, and external privacy link placeholder." />
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 leading-8 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">Terms of Service</h2>
        <p className="mt-4">SELLIZI provides software tools for sellers to publish digital products, collect payments, and deliver buyer access. Sellers are responsible for product legality, support, fulfillment, and accurate descriptions.</p>
        <h2 className="mt-8 text-2xl font-black text-slate-950 dark:text-white">Privacy Policy</h2>
        <p className="mt-4">SELLIZI stores authentication, purchase, support, analytics, and notification data in Supabase. Payment secrets are handled server side in Edge Functions. External privacy URL can be configured by admin.</p>
      </section>
    </div>
  );
}

function BuyerAccessPage() {
  const [step, setStep] = useState<"email" | "pin" | "library">("email");
  const [email, setEmail] = useState("buyer@example.com");
  const [pin, setPin] = useState("");
  return (
    <div className="space-y-6">
      <PageHeader icon="lock" title="Buyer Email and PIN Access" description="Buyers verify the email used at purchase, then create or enter a five digit PIN to access owned products only." />
      <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
        {step === "email" && (
          <div className="space-y-4">
            <Field label="Purchase email" value={email} onChange={setEmail} type="email" />
            <Button onClick={() => setStep("pin")}>Continue</Button>
          </div>
        )}
        {step === "pin" && (
          <div className="space-y-4">
            <Field label="Five digit PIN" value={pin} onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 5))} type="password" />
            <Button onClick={() => pin.length === 5 && setStep("library")}>Open library</Button>
          </div>
        )}
        {step === "library" && <BuyerLibrary />}
      </section>
    </div>
  );
}

function BuyerLibrary() {
  return (
    <div>
      <div className="text-xl font-black text-slate-950 dark:text-white">Purchased products</div>
      <div className="mt-4 space-y-3">
        {["Video course masterclass", "Proxy account pack", "Ebook growth system"].map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
            <div className="font-black text-slate-950 dark:text-white">{item}</div>
            <div className="mt-3 aspect-video overflow-hidden rounded-2xl bg-slate-950">
              <iframe title={item} className="h-full w-full" src="about:blank" sandbox="allow-scripts allow-same-origin allow-presentation" />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Preview area supports hosted links, videos, PDFs, files, and course modules when source links are added.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExternalCheckoutPage() {
  const [email, setEmail] = useState("buyer@example.com");
  const [name, setName] = useState("Buyer Name");
  return (
    <div className="space-y-6">
      <PageHeader icon="pay" title="External Product Checkout" description="When a shared product link is purchased, SELLIZI captures buyer name and email, processes Ashtechpay immediately, then returns a buyer access link." />
      <section className="max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Buyer name" value={name} onChange={setName} />
          <Field label="Buyer email" value={email} onChange={setEmail} type="email" />
          <Field label="Product link slug" value="ai-prompt-vault" onChange={() => undefined} />
          <Field label="Amount" value="5000" onChange={() => undefined} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3"><Button>Process payment</Button><Button variant="secondary">Copy buyer access link</Button></div>
      </section>
    </div>
  );
}

function AdminBroadcastPage({ addNotification }: { addNotification: (notification: Notification) => void }) {
  const [target, setTarget] = useState("all users");
  const [type, setType] = useState("info");
  const [message, setMessage] = useState("Platform update from SELLIZI admin.");
  function send() {
    addNotification({ id: `n-${Date.now()}`, title: `Broadcast: ${type}`, body: `${message} Target: ${target}`, type: "broadcast", read: false, createdAt: "Now" });
  }
  return (
    <div className="space-y-6">
      <PageHeader icon="bell" title="Broadcast Center" description="Admin can send info, promo, or alert broadcasts by email target or to all users." />
      <section className="max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target email or all users" value={target} onChange={setTarget} />
          <SelectField label="Broadcast type" value={type} onChange={setType} options={["info", "promo", "alert"]} />
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span>Message</span>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white" />
        </label>
        <Button className="mt-5" onClick={send}>Send broadcast</Button>
      </section>
    </div>
  );
}

function AdminSettingsPage({ supportEmail, setSupportEmail }: { supportEmail: string; setSupportEmail: (email: string) => void }) {
  return (
    <div className="space-y-6">
      <PageHeader icon="spark" title="Admin App Settings" description="Platform controls for support email, VAPID, AI provider keys, RLS separation, and environment-driven secrets." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-black text-slate-950 dark:text-white">Support routing</div>
          <div className="mt-4 space-y-4">
            <Field label="Editable support email" value={supportEmail} onChange={setSupportEmail} />
            <Field label="VAPID public key" value="VITE_VAPID_PUBLIC_KEY from Vercel" onChange={() => undefined} readOnly />
            <Field label="Ashtechpay secret" value="ASHTECHPAY_API_KEY in Supabase secrets" onChange={() => undefined} readOnly />
          </div>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-xl font-black text-slate-950 dark:text-white">AI model keys</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {["Grok", "Gemini", "Claude", "OpenAI", "Perplexity", "Router model"].map((label) => <Field key={label} label={label} value="Admin encrypted key slot" onChange={() => undefined} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) outputArray[index] = rawData.charCodeAt(index);
  return outputArray;
}

function NotificationSettingsPage({ notifications, markAllRead }: { notifications: Notification[]; markAllRead: () => void }) {
  const [status, setStatus] = useState("Push notifications require VITE_VAPID_PUBLIC_KEY and a push_subscriptions table.");
  async function enablePush() {
    try {
      const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!vapid) {
        setStatus("Missing VITE_VAPID_PUBLIC_KEY. Add it in Vercel environment variables.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("Push notifications are not supported in this browser.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notification permission was not granted.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) });
      if (supabase) await supabase.from("push_subscriptions").upsert({ endpoint: subscription.endpoint, keys: subscription.toJSON().keys });
      setStatus("Push notifications enabled. Subscription stored when Supabase is configured.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Push setup failed.");
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader icon="bell" title="Notifications" description="Bell badge, slide-down panel, mark all as read, realtime delivery, broadcast messages, and VAPID push subscription." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock label="Unread" value={String(notifications.filter((item) => !item.read).length)} note="badge count" />
        <StatBlock label="Realtime" value="On" note="Supabase" />
        <StatBlock label="Push" value="VAPID" note="PWA ready" />
      </div>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap gap-3"><Button onClick={enablePush}>Enable push</Button><Button variant="secondary" onClick={markAllRead}>Mark all as read</Button></div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{status}</p>
        <div className="mt-5 space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
              <div className="font-black text-slate-950 dark:text-white">{notification.title}</div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{notification.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function GenericToolPage({ tool, role }: { tool: Tool; role: Role }) {
  return (
    <div className="space-y-6">
      <PageHeader icon={role === "admin" ? "spark" : role === "buyer" ? "user" : "grid"} title={tool.label} description={tool.description} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock label="Status" value="Ready" note="database backed" />
        <StatBlock label="Scope" value={role} note="space isolated" />
        <StatBlock label="Realtime" value="On" note="Supabase channel" />
      </div>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="text-xl font-black text-slate-950 dark:text-white">{tool.label} workspace</div>
        <p className="mt-2 max-w-3xl leading-7 text-slate-500 dark:text-slate-400">This page is structured for live Supabase data, role-separated records, RLS safe access, exports, filters, and audit logs. Configure table policies and Vercel or Supabase secrets before production launch.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["Create", "Sync", "Export", "Audit"].map((action) => <Button key={action} variant="secondary">{action}</Button>)}
        </div>
      </section>
    </div>
  );
}

function renderPage(props: {
  role: Role;
  page: string;
  userName: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  tickets: Ticket[];
  setTickets: (tickets: Ticket[]) => void;
  supportEmail: string;
  setSupportEmail: (email: string) => void;
  addNotification: (notification: Notification) => void;
  createPaymentTicket: () => void;
  notifications: Notification[];
  markAllRead: () => void;
}) {
  const tools = props.role === "admin" ? adminTools : props.role === "buyer" ? buyerTools : sellerTools;
  const tool = tools.find((item) => item.id === props.page) ?? tools[0];
  if (props.page === "overview" || props.page === "admin-overview") return <OverviewPage />;
  if (props.page === "sales") return <AnalyticsPage type="sales" />;
  if (props.page === "visitors") return <AnalyticsPage type="visitors" />;
  if (props.page === "conversion") return <AnalyticsPage type="conversion" />;
  if (props.page === "link-traffic") return <AnalyticsPage type="traffic" />;
  if (props.page === "affiliate") return <AnalyticsPage type="affiliate" />;
  if (props.page === "products") return <ProductsPage />;
  if (props.page === "product-builder") return <ProductBuilder />;
  if (props.page === "ashtechpay" || props.page === "ashtech-config") return <AshtechpayPage supportEmail={props.supportEmail} createPaymentTicket={props.createPaymentTicket} />;
  if (props.page === "messages" || props.page === "buyer-support" || props.page === "support-admin" || props.page === "subscriptions" || props.page === "subscription-admin") return <SupportPage tickets={props.tickets} setTickets={props.setTickets} />;
  if (props.page === "notifications" || props.page === "buyer-notifications" || props.page === "notification-center" || props.page === "push-vapid") return <NotificationSettingsPage notifications={props.notifications} markAllRead={props.markAllRead} />;
  if (props.page === "profile" || props.page === "buyer-profile") return <ProfilePage userName={props.userName} theme={props.theme} setTheme={props.setTheme} />;
  if (["store-general", "charges", "currencies", "delivery", "store-design", "support-channels", "domain", "payouts", "email-preferences", "security", "delete-account"].includes(props.page)) return <StoreSettingsPage title={tool.label} />;
  if (props.page === "help" || props.page === "help-admin") return <HelpPage />;
  if (props.page === "legal" || props.page === "legal-admin") return <LegalPage />;
  if (props.page === "buyer-pin" || props.page === "buyer-home" || props.page === "buyer-products" || props.page === "buyer-courses" || props.page === "buyer-files" || props.page === "buyer-accounts") return <BuyerAccessPage />;
  if (props.page === "external-checkout") return <ExternalCheckoutPage />;
  if (props.page === "admin-broadcasts" || props.page === "broadcasts") return <AdminBroadcastPage addNotification={props.addNotification} />;
  if (["support-email", "ai-control", "app-settings"].includes(props.page)) return <AdminSettingsPage supportEmail={props.supportEmail} setSupportEmail={props.setSupportEmail} />;
  return <GenericToolPage tool={tool} role={props.role} />;
}

function Workspace({ userName, onSignOut }: { userName: string; onSignOut: () => void }) {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("sellizi-role") as Role) || "seller");
  const [page, setPage] = useState(() => sessionStorage.getItem("sellizi-page-cache") || "overview");
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("sellizi-theme") as Theme) || "light");
  const touchStart = useRef<number | null>(null);

  const tools = role === "admin" ? adminTools : role === "buyer" ? buyerTools : sellerTools;
  const unread = notifications.filter((item) => !item.read).length;

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("sellizi-theme", next);
  }

  function updateRole(next: Role) {
    setRole(next);
    localStorage.setItem("sellizi-role", next);
    setPage(next === "admin" ? "admin-overview" : next === "buyer" ? "buyer-home" : "overview");
  }

  function addNotification(notification: Notification) {
    setNotifications((current) => [notification, ...current]);
  }

  function createPaymentTicket() {
    const ticket: Ticket = { id: `TCK-${Math.floor(1000 + Math.random() * 8999)}`, subject: "Subscription payment signal problem", status: "open", createdAt: "Now", messages: [{ id: `m-${Date.now()}`, sender: "user", body: "Subscription payment signal has a problem. Please contact admin.", createdAt: "Now" }] };
    setTickets((current) => [ticket, ...current]);
    addNotification({ id: `n-${Date.now()}`, title: "Support ticket created", body: `Payment issue routed to ${supportEmail}.`, type: "broadcast", read: false, createdAt: "Now" });
    setPage(role === "admin" ? "support-admin" : "messages");
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    sessionStorage.setItem("sellizi-page-cache", page);
    if (window.history.state?.page !== page) window.history.pushState({ page }, "", `#${page}`);
  }, [page]);

  useEffect(() => {
    const onPop = () => {
      const cached = window.location.hash.replace("#", "") || sessionStorage.getItem("sellizi-page-cache") || "overview";
      setPage(cached);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const channel = client.channel("sellizi-notifications").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      const row = payload.new as Record<string, string>;
      addNotification({ id: row.id || `n-${Date.now()}`, title: row.title || "Notification", body: row.body || "New event", type: (row.type as NotificationType) || "broadcast", read: false, createdAt: "Now" });
    }).subscribe();
    return () => { client.removeChannel(channel); };
  }, []);

  function onTouchStart(event: React.TouchEvent) {
    if (window.scrollY === 0) touchStart.current = event.touches[0].clientY;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStart.current === null) return;
    const diff = event.changedTouches[0].clientY - touchStart.current;
    touchStart.current = null;
    if (diff > 90) {
      addNotification({ id: `n-${Date.now()}`, title: "Workspace refreshed", body: "SELLIZI pulled latest cached data without a full reload.", type: "broadcast", read: false, createdAt: "Now" });
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <TransitionProgress page={page} />
      <NotificationPanel open={panel} notifications={notifications} onClose={() => setPanel(false)} onReadAll={() => setNotifications(notifications.map((item) => ({ ...item, read: true })))} />
      <Sidebar role={role} tools={tools} page={page} setPage={setPage} open={drawer} setOpen={setDrawer} />
      <main className="min-w-0 flex-1 overflow-hidden">
        <header className="flex h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/85 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-full border border-slate-200 p-3 dark:border-white/10 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation"><SvgIcon name="menu" /></button>
            <div className="min-w-0">
              <div className="truncate text-sm font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">SELLIZI {role}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{userName} - data cache enabled</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5 sm:flex">
              {(["seller", "buyer", "admin"] as Role[]).map((item) => (
                <button key={item} onClick={() => updateRole(item)} className={classNames("rounded-full px-4 py-2 text-xs font-black capitalize", role === item ? "bg-white text-slate-950 shadow-sm dark:bg-cyan-300" : "text-slate-500 dark:text-slate-300")}>{item}</button>
              ))}
            </div>
            <button className="relative rounded-full border border-slate-200 p-3 dark:border-white/10" onClick={() => setPanel(true)} aria-label="Notifications">
              <SvgIcon name="bell" />
              {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-black text-slate-950">{unread}</span>}
            </button>
            <button className="rounded-full border border-slate-200 p-3 dark:border-white/10" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme"><SvgIcon name={theme === "dark" ? "sun" : "moon"} /></button>
            <Button variant="ghost" onClick={onSignOut} className="hidden sm:inline-flex">Sign out</Button>
          </div>
        </header>
        <div className="sm:hidden border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
          <SelectField label="Switch space" value={role} onChange={(value) => updateRole(value as Role)} options={["seller", "buyer", "admin"]} />
        </div>
        <section className="hidden-scrollbar h-[calc(100vh-5rem)] overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={`${role}-${page}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.24 }}>
              {renderPage({ role, page, userName, theme, setTheme, tickets, setTickets, supportEmail, setSupportEmail, addNotification, createPaymentTicket, notifications, markAllRead: () => setNotifications(notifications.map((item) => ({ ...item, read: true }))) })}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(() => localStorage.getItem("sellizi-entered") === "true");
  const [userName, setUserName] = useState(() => localStorage.getItem("sellizi-user") || "");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  if (!entered) return <Hero onEnter={() => { localStorage.setItem("sellizi-entered", "true"); setEntered(true); }} />;
  if (!userName) return <AuthScreen onAuthed={setUserName} />;
  return <Workspace userName={userName} onSignOut={() => { localStorage.removeItem("sellizi-user"); setUserName(""); }} />;
}
