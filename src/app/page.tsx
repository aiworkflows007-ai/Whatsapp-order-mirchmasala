"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Flame,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Utensils,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

const WHATSAPP_NUMBER = "919296914511";
const whatsappMenuLink = `https://wa.me/${WHATSAPP_NUMBER}?text=MENU`;
const heroImage =
  "https://images.unsplash.com/photo-1563379091339-03246963d51a?auto=format&fit=crop&w=1800&q=80";

const signatureDishes = [
  {
    name: "Hyderabadi Chicken Biryani",
    price: 360,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80",
    note: "Long grain rice, layered masala, slow dum finish.",
  },
  {
    name: "Paneer Tikka Shashlik",
    price: 290,
    image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80",
    note: "Smoky tandoor paneer with peppers and house chutney.",
  },
  {
    name: "Royal Kesari Rasmalai",
    price: 140,
    image: "https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=80",
    note: "Soft milk dumplings, saffron cream, pistachio finish.",
  },
];

const agentFlow = [
  {
    title: "Scan Or Say Hi",
    text: "Customer opens WhatsApp from QR or direct link.",
    icon: QrCode,
  },
  {
    title: "Chef Sanjay Bot",
    text: "Buttons guide menu, cart, address, booking and payment.",
    icon: Bot,
  },
  {
    title: "Staff Control",
    text: "Admin approves orders and can take over chat anytime.",
    icon: ShieldCheck,
  },
  {
    title: "Kitchen Updates",
    text: "Preparing, ready and delivery messages go back to customer.",
    icon: Truck,
  },
];

const trustStats = [
  { label: "WhatsApp first", value: "0 app" },
  { label: "Payment choices", value: "3 ways" },
  { label: "Live updates", value: "6 steps" },
];

const ambienceTiles = [
  {
    title: "Fresh Dum Biryani",
    text: "Layered rice, warm spices, sealed aroma.",
    image: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Tandoor & Grill",
    text: "Smoky starters, paneer and kebab style plates.",
    image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Family Table",
    text: "Book dine-in from WhatsApp and let staff confirm.",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80",
  },
];

const statusSteps = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "Manager Review",
    ACCEPTED: "Approved",
    PREPARING: "Preparing",
    READY: "Ready",
    OUT_FOR_DELIVERY: "Out for Delivery",
    DELIVERED: "Delivered",
  };
  return labels[status] || status;
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (data.success && data.categories?.length) {
          setCategories(data.categories);
          setSelectedCatId(data.categories[0].id);
        }
      } catch (error) {
        console.error("Failed to load menu:", error);
      }
    };
    loadMenu();
  }, []);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === selectedCatId),
    [categories, selectedCatId]
  );

  const trackOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!orderNo.trim()) return;

    setTrackerLoading(true);
    setTrackResult(null);
    setTrackError(null);

    try {
      const res = await fetch(`/api/orders/tracker?orderNo=${encodeURIComponent(orderNo.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTrackError(data.error || "Order not found.");
        return;
      }
      setTrackResult(data.order);
    } catch {
      setTrackError("Tracker connect nahi ho paaya. Thodi der baad try karein.");
    } finally {
      setTrackerLoading(false);
    }
  };

  const activeStatusIndex = trackResult
    ? Math.max(statusSteps.indexOf(String(trackResult.status).toUpperCase()), 0)
    : -1;

  return (
    <div className="min-h-screen bg-[#f8f3ea] pb-20 text-[#1e1c18] selection:bg-emerald-700 selection:text-white md:pb-0">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf0]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#213f32] text-xl text-white shadow-sm">
              🌶️
            </span>
            <span>
              <span className="block text-base font-black tracking-wide sm:text-lg">Mirch Masala</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a3b24]">
                WhatsApp Restaurant
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-5 text-xs font-extrabold uppercase tracking-wide text-[#4d473d] md:flex">
            <a href="#order" className="hover:text-[#8a3b24]">Order</a>
            <a href="#menu" className="hover:text-[#8a3b24]">Menu</a>
            <a href="#tracker" className="hover:text-[#8a3b24]">Track</a>
            <Link href="/login" className="hover:text-[#8a3b24]">Admin</Link>
          </nav>

          <a
            href={whatsappMenuLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#128c58] px-4 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-[#0f784c] active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Order
          </a>
        </div>
      </header>

      <main>
        <section className="relative min-h-[74svh] overflow-hidden bg-[#14110e] text-white">
          <img
            src={heroImage}
            alt="Fresh biryani and restaurant food at Mirch Masala"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8f3ea] to-transparent" />

          <div className="relative mx-auto grid min-h-[74svh] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] backdrop-blur">
                <Sparkles className="h-4 w-4 text-[#f6c453]" />
                Chef Sanjay Live On WhatsApp
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                Mirch Masala Restaurant
              </h1>
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/80 sm:text-lg">
                Order biryani, tandoori, sweets and table bookings directly inside WhatsApp. The bot takes the order, staff approves it, kitchen updates the customer.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={whatsappMenuLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#128c58] px-7 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-black/20 transition hover:bg-[#0f784c] active:scale-95"
                >
                  Start WhatsApp Order
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#order"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 text-sm font-black uppercase tracking-wide text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                >
                  Scan QR Code
                  <QrCode className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div className="border-l-2 border-[#f6c453] pl-3">
                  <span className="block text-xs font-bold uppercase text-white/55">Open</span>
                  <span className="font-black">11 AM - 11 PM</span>
                </div>
                <div className="border-l-2 border-[#128c58] pl-3">
                  <span className="block text-xs font-bold uppercase text-white/55">Payment</span>
                  <span className="font-black">UPI, Card, COD</span>
                </div>
                <div className="border-l-2 border-[#5d8fd3] pl-3">
                  <span className="block text-xs font-bold uppercase text-white/55">Updates</span>
                  <span className="font-black">Live food status</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#101820]/92 p-4 shadow-2xl backdrop-blur">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#128c58] text-lg">🌶️</span>
                      <div>
                        <p className="text-sm font-black">Mirch Masala Bot</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">online now</p>
                      </div>
                    </div>
                    <MessageCircle className="h-5 w-5 text-white/55" />
                  </div>

                  <div className="space-y-3">
                    <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm leading-6 text-white/85">
                      Namaste! Aaj kya khayenge? Button tap karein.
                    </div>
                    <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-[#128c58] p-3 text-sm font-bold">
                      🍽️ View Menu
                    </div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/10 p-3">
                      <p className="text-xs font-black text-[#f6c453]">Chef Sanjay recommends</p>
                      <p className="mt-1 text-sm font-bold">Hyderabadi Chicken Biryani</p>
                      <p className="text-xs text-white/60">₹360 - Tap to add in cart</p>
                    </div>
                    <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-[#128c58] p-3 text-sm font-bold">
                      💳 UPI / Card
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                    {trustStats.map((stat) => (
                      <div key={stat.label} className="rounded-xl bg-white/10 p-3 text-center">
                        <p className="text-sm font-black text-[#f6c453]">{stat.value}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/50">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute -bottom-6 -left-6 w-36 rounded-2xl border border-black/10 bg-white p-3 text-[#1e1c18] shadow-xl">
                  <img
                    src="/mirch-masala-whatsapp-qr.png"
                    alt="WhatsApp QR preview"
                    className="h-20 w-20 rounded-lg"
                  />
                  <p className="mt-2 text-[10px] font-black uppercase leading-tight">Scan to start order</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="order" className="mx-auto -mt-6 grid max-w-7xl gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-3">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#213f32] text-white">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black">Scan To Chat</h2>
                <p className="text-xs font-semibold text-[#6c6255]">Camera se scan, WhatsApp open.</p>
              </div>
            </div>
            <img
              src="/mirch-masala-whatsapp-qr.png"
              alt="Mirch Masala WhatsApp QR code"
              className="mx-auto h-44 w-44 rounded-lg border border-black/10 bg-white p-2"
            />
          </div>

          <div className="rounded-lg border border-black/10 bg-[#213f32] p-5 text-white shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black">Direct WhatsApp Link</h2>
                <p className="text-xs font-semibold text-white/65">No app download for customer.</p>
              </div>
              <div className="flex items-center gap-2 text-[#f6c453]">
                <Phone className="h-5 w-5" />
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <p className="break-all rounded-lg border border-white/15 bg-white/10 p-3 font-mono text-xs text-white/85">
              wa.me/{WHATSAPP_NUMBER}?text=MENU
            </p>
            <a
              href={whatsappMenuLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-xs font-black uppercase tracking-wide text-[#213f32] transition hover:bg-[#f6c453] active:scale-95"
            >
              Open Chat Now
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-base font-black">Why Customers Like It</h2>
            <div className="mt-4 space-y-3">
              {[
                "Buttons instead of long typing",
                "Razorpay link during online payment",
                "Food preparing, ready and delivery updates",
                "Staff can jump in when needed",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm font-semibold text-[#4d473d]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#128c58]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
              <div className="relative min-h-[360px]">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80"
                  alt="Warm restaurant dining table"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur">
                    <Flame className="h-3.5 w-3.5 text-[#f6c453]" />
                    Restaurant Experience
                  </p>
                  <h2 className="max-w-2xl text-3xl font-black tracking-normal sm:text-4xl">
                    A food brand that works in WhatsApp, on the table, and in the kitchen.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
                    Customers scan, order, pay, and track. Staff sees every order from the admin app and kitchen status keeps everyone calm.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {ambienceTiles.map((tile) => (
                <article key={tile.title} className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                  <div className="flex h-full min-h-[112px] gap-3 p-3">
                    <img
                      src={tile.image}
                      alt={tile.title}
                      className="h-24 w-24 shrink-0 rounded-xl object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="flex min-w-0 flex-col justify-center">
                      <h3 className="font-black leading-tight">{tile.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-[#6c6255]">{tile.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#213f32] py-14 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6c453]">Agent Workflow</p>
                <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-normal sm:text-4xl">
                  Bot, staff and kitchen work together.
                </h2>
              </div>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-xs font-black uppercase tracking-wide transition hover:bg-white/10"
              >
                Admin Login
                <ShieldCheck className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {agentFlow.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-lg border border-white/15 bg-white/10 p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <Icon className="h-6 w-6 text-[#f6c453]" />
                      <span className="font-mono text-xs font-black text-white/45">0{index + 1}</span>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wide">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/70">{step.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a3b24]">Signature Picks</p>
              <h2 className="mt-2 flex items-center gap-3 text-3xl font-black tracking-normal sm:text-4xl">
                <Star className="h-7 w-7 fill-[#f6c453] text-[#8a3b24]" />
                Food worth opening WhatsApp for.
              </h2>
            </div>
            <a href="#menu" className="inline-flex h-11 items-center gap-2 rounded-full border border-black/15 px-5 text-xs font-black uppercase tracking-wide transition hover:bg-white">
              See Full Menu
              <Utensils className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {signatureDishes.map((dish) => (
              <article key={dish.name} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                <img src={dish.image} alt={dish.name} className="h-52 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black">{dish.name}</h3>
                    <span className="rounded-full bg-[#f6c453]/25 px-3 py-1 font-mono text-sm font-black text-[#8a3b24]">
                      ₹{dish.price}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6c6255]">{dish.note}</p>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=add%20${encodeURIComponent(dish.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#1e1c18] px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#8a3b24] active:scale-95"
                  >
                    Add In WhatsApp
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="tracker" className="bg-[#efe3d0] py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a3b24]">Live Order Tracker</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
                Customers can check order status anytime.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#6c6255]">
                Enter an order number and see if it is under manager review, preparing, ready, out for delivery or delivered.
              </p>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
              <form onSubmit={trackOrder} className="flex gap-2">
                <input
                  value={orderNo}
                  onChange={(event) => setOrderNo(event.target.value)}
                  placeholder="MM-260531-ABC123"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-black/15 bg-[#fffaf0] px-3 font-mono text-sm font-bold uppercase outline-none transition focus:border-[#128c58]"
                />
                <button
                  type="submit"
                  disabled={trackerLoading}
                  className="grid h-12 w-12 place-items-center rounded-lg bg-[#213f32] text-white transition hover:bg-[#128c58] disabled:opacity-50"
                  title="Track order"
                >
                  {trackerLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </button>
              </form>

              {trackResult && (
                <div className="mt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black text-[#6c6255]">#{trackResult.orderNo}</p>
                      <h3 className="text-xl font-black">{statusLabel(trackResult.status)}</h3>
                    </div>
                    <span className="rounded-full bg-[#128c58]/12 px-3 py-1 text-xs font-black uppercase text-[#128c58]">
                      ₹{Number(trackResult.total).toFixed(0)}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1">
                    {statusSteps.map((step, index) => (
                      <div
                        key={step}
                        className={`h-2 rounded-full ${index <= activeStatusIndex ? "bg-[#128c58]" : "bg-black/10"}`}
                        title={statusLabel(step)}
                      />
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-lg bg-[#f8f3ea] p-3">
                      <span className="block text-[10px] font-black uppercase text-[#6c6255]">Payment</span>
                      <span className="font-black">{trackResult.paymentStatus}</span>
                    </div>
                    <div className="rounded-lg bg-[#f8f3ea] p-3">
                      <span className="block text-[10px] font-black uppercase text-[#6c6255]">Type</span>
                      <span className="font-black">{trackResult.deliveryType}</span>
                    </div>
                    <div className="rounded-lg bg-[#f8f3ea] p-3">
                      <span className="block text-[10px] font-black uppercase text-[#6c6255]">Items</span>
                      <span className="font-black">{trackResult.items?.length || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {trackError && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                  {trackError}
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8a3b24]">Live Menu</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">Choose dishes from the real database.</h2>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#6c6255]">
              <Clock className="h-4 w-4 text-[#8a3b24]" />
              Fresh availability from admin menu
            </div>
          </div>

          {categories.length > 0 && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCatId(category.id)}
                  className={`h-11 shrink-0 rounded-full px-5 text-xs font-black uppercase tracking-wide transition active:scale-95 ${
                    selectedCatId === category.id
                      ? "bg-[#213f32] text-white"
                      : "border border-black/15 bg-white text-[#4d473d] hover:bg-[#fffaf0]"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {activeCategory ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCategory.menuItems.map((item) => (
                <article key={item.id} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`grid h-4 w-4 place-items-center rounded border ${item.isVegetarian ? "border-[#128c58]" : "border-red-600"}`}>
                          <span className={`h-2 w-2 rounded-full ${item.isVegetarian ? "bg-[#128c58]" : "bg-red-600"}`} />
                        </span>
                        <h3 className="font-black">{item.name}</h3>
                      </div>
                      <p className="line-clamp-2 text-sm leading-6 text-[#6c6255]">
                        {item.description || "Freshly prepared Mirch Masala kitchen special."}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#f6c453]/25 px-3 py-1 font-mono text-sm font-black text-[#8a3b24]">
                      ₹{Number(item.price).toFixed(0)}
                    </span>
                  </div>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=add%20${encodeURIComponent(item.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-black/15 px-4 text-xs font-black uppercase tracking-wide transition hover:bg-[#213f32] hover:text-white active:scale-95"
                  >
                    Add On WhatsApp
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#6c6255]">
              Menu loading...
            </div>
          )}
        </section>

        <section className="bg-[#1e1c18] py-14 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6c453]">Table Booking</p>
              <h2 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
                Planning dine-in? Book from WhatsApp.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                Customer chooses guests, date and time. Staff approves booking from admin panel.
              </p>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Book table for 4 guests")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#f6c453] px-7 text-sm font-black uppercase tracking-wide text-[#1e1c18] transition hover:bg-white active:scale-95"
            >
              <CalendarCheck className="h-5 w-5" />
              Book Table
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-[#fffaf0] py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 text-sm font-semibold text-[#6c6255] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#8a3b24]" />
            Mirch Masala Restaurant, WhatsApp powered ordering
          </div>
          <div className="flex flex-wrap gap-4">
            <a href={whatsappMenuLink} target="_blank" rel="noopener noreferrer" className="font-black text-[#128c58]">
              WhatsApp Order
            </a>
            <Link href="/login" className="font-black text-[#8a3b24]">
              Admin Panel
            </Link>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[#fffaf0]/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <a
            href={whatsappMenuLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#128c58] text-sm font-black uppercase tracking-wide text-white active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Order Now
          </a>
          <a
            href="#tracker"
            className="grid h-12 w-12 place-items-center rounded-full border border-black/15 bg-white text-[#213f32] active:scale-95"
            title="Track order"
          >
            <Search className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
