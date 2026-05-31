"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Bot, 
  ShoppingBag, 
  ShieldCheck, 
  Flame, 
  Compass, 
  RefreshCw, 
  Search, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Utensils, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  ArrowRight,
  Heart,
  ChevronLeft,
  CalendarCheck
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
  isVegetarian: boolean;
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  menuItems: MenuItem[];
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  
  // Live Tracker State
  const [orderNo, setOrderNo] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Culinary Trivia State
  const [triviaIndex, setTriviaIndex] = useState(0);

  // Load dynamic menu categories
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (data.success && data.categories.length > 0) {
          setCategories(data.categories);
          setSelectedCatId(data.categories[0].id);
        }
      } catch (e) {
        console.error("Failed to load menu details:", e);
      }
    };
    loadMenu();
  }, []);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNo.trim()) return;

    setTrackerLoading(true);
    setTrackError(null);
    setTrackResult(null);

    try {
      const res = await fetch(`/api/orders/tracker?orderNo=${orderNo.trim()}`);
      const data = await res.json();
      if (data.success) {
        setTrackResult(data.order);
      } else {
        setTrackError(data.error || "Order not found. Please verify number.");
      }
    } catch (err) {
      setTrackError("Failed to fetch order status. Check connection.");
    } finally {
      setTrackerLoading(false);
    }
  };

  const activeCategory = categories.find((c) => c.id === selectedCatId);

  const getStatusProgress = (status: string) => {
    const states = ["NEW", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];
    const index = states.indexOf(status.toUpperCase());
    return {
      step: index !== -1 ? index : 1,
      name: status === "NEW" ? "Awaiting Review" : status === "ACCEPTED" ? "Approved" : status === "PREPARING" ? "Preparing" : status === "READY" ? "Ready" : "Completed",
    };
  };

  const MadhubaniDivider = () => (
    <div className="py-8 flex justify-center items-center select-none opacity-40">
      <svg width="100%" height="24" viewBox="0 0 1200 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-500/40 w-full max-w-6xl">
        <path d="M0 12H1200" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
        <polygon points="600,2 612,12 600,22 588,12" fill="currentColor" className="text-orange-500" />
        <circle cx="600" cy="12" r="4" fill="#0b0f19" />
        <path d="M565 12C575 4 580 20 590 12" stroke="currentColor" strokeWidth="1.5" />
        <path d="M635 12C625 4 620 20 610 12" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="545" cy="12" r="3.5" fill="currentColor" className="text-amber-600" />
        <circle cx="655" cy="12" r="3.5" fill="currentColor" className="text-amber-600" />
      </svg>
    </div>
  );

  const spotlightDishes = [
    {
      name: "Champaran Handi Mutton (Ahuna)",
      description: "Whole spice marinated tender mutton sealed with wheat dough in unglazed clay Handis, slow-roasted over charcoal fire for earthy, smoky flavor.",
      price: 450,
      tag: "Smoky Charcoal Slow Cook",
      icon: "🍲",
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60"
    },
    {
      name: "Traditional Desi Ghee Litti Chokha",
      description: "Charcoal roasted wheat-flour balls stuffed with spice-infused Sattu, submerged in pure cow Ghee, served with spiced eggplant-tomato bharta.",
      price: 180,
      tag: "Bihar's National Culinary Pride",
      icon: "🫓",
      image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60"
    },
    {
      name: "Kesariya Makhana Kheer",
      description: "Sweetened milk reduced for 4 hours with popped premium foxnuts (Makhana) from Mithila, saffron, cardamom, and green pistachios.",
      price: 140,
      tag: "Mithilanchal Festive Sweet",
      icon: "🥣",
      image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=60"
    },
    {
      name: "Mithilanchal Thekua Platter",
      description: "Crispy wheat flour and fennel dry-sweet biscuits sweetened with sugarcane jaggery, shaped using traditional wooden sanchas.",
      price: 110,
      tag: "Chhath Mahaparv Prasad Special",
      icon: "🍪",
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60"
    }
  ];

  const triviaItems = [
    {
      title: "Why earthenware Handis?",
      fact: "Champaran Mutton is cooked in unglazed clay pots. Clay is porous, allowing moisture and heat to circulate evenly. When slow-cooked over charcoal, it extracts mineral clay notes that give the mutton its signature rustic, earthy aroma."
    },
    {
      title: "The magic of Sattu in Litti",
      fact: "Sattu is roasted chickpea flour. In Bihar, it is combined with mustard oil, lemon juice, ajwain, kalonji, and crushed garlic. Roasted over charcoal embers, the Sattu inside expands, making Litti light and extremely nutritious!"
    },
    {
      title: "Mithila's Foxnut (Makhana) Legacy",
      fact: "Over 85% of India's Makhana is grown in the wetlands of Mithilanchal, Bihar. Historically considered a royal food of gods, our Kesariya Makhana Kheer uses freshly popped local foxnuts slow-reduced for 4 hours."
    }
  ];

  return (
    <div className="min-h-screen bg-[#090e11] text-gray-200 flex flex-col font-sans selection:bg-[#c25e2e] selection:text-white relative overflow-x-hidden">
      
      {/* GLOWING AMBIENT GRAPHICS - Terracotta Saffron Themed */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-[#c25e2e]/10 to-[#d97706]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-[#d97706]/5 to-[#c25e2e]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER NAVIGATION */}
      <header className="border-b border-border/40 bg-[#0c1317]/80 backdrop-blur-md sticky top-0 z-50 p-4 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl shadow-lg animate-pulse" title="Clay Pot Delights">🍲</span>
            <div>
              <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-400 via-[#e06d34] to-[#f97316] bg-clip-text text-transparent flex items-center gap-2">
                Mirch Masala Restaurant
                <span className="text-[10px] text-amber-500 font-extrabold uppercase border border-amber-500/20 px-1.5 py-0.5 rounded">Mithila & Magadh</span>
              </h1>
              <p className="text-[10px] text-muted tracking-wider uppercase font-semibold">Authentic Bihar Regional Kitchen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="/admin/orders"
              className="bg-[#182229]/80 hover:bg-[#202c33] hover:border-border/80 text-muted hover:text-gray-100 border border-border px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
            >
              ⚙️ Admin Console
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 space-y-12">
        
        {/* HERO SECTION */}
        <section className="bg-gradient-to-br from-[#121c21]/90 to-[#0c1317]/95 border border-border/50 rounded-3xl p-6 md:p-12 backdrop-blur-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl">
          
          <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-[#c25e2e]/20 to-transparent rounded-full blur-[80px] pointer-events-none" />

          <div className="flex-1 space-y-6 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#c25e2e]/10 border border-[#c25e2e]/30 text-[#e06d34] rounded-full text-xs font-extrabold uppercase tracking-wider select-none">
              <Flame className="h-3.5 w-3.5 text-[#e06d34] animate-pulse" /> Traditional Clay-Pot Feasts
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              🙏 प्रणाम! रउआ सभ के स्वागत बा! <br />
              <span className="bg-gradient-to-r from-amber-400 via-[#e06d34] to-orange-500 bg-clip-text text-transparent">
                Desi Ghee Litti & Champaran Handi Meats
              </span>
            </h2>

            <p className="text-muted text-sm md:text-base max-w-xl leading-relaxed">
              Experience the ancient culinary legacy of Mithilanchal and Magadh! Slow earthenware wood-charcoal dum mutton, ghee-soaked hand-roasted littis, and sweet saffron treats prepared with ancestral spices by Chef Sanjay. Order completely on WhatsApp!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <a
                href="https://wa.me/919296914511?text=MENU"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#c25e2e] via-orange-500 to-[#f97316] hover:from-[#d56b37] hover:to-[#ff7f24] text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-[#c25e2e]/20"
              >
                💬 Swagat Ba! Order on WhatsApp
              </a>
              <a
                href="#spotlight"
                className="w-full sm:w-auto px-8 py-4 bg-[#122029]/60 hover:bg-[#182a35] border border-border/80 text-muted font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Utensils className="h-4 w-4 text-[#e06d34]" /> Bihari Specialties
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border/20 max-w-md mx-auto md:mx-0 select-none">
              <div className="text-center md:text-left">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Active Hours</h4>
                <p className="text-xs text-[#e06d34] font-bold flex items-center gap-1 justify-center md:justify-start"><Clock className="h-3 w-3" /> 11:00 AM - 11 PM</p>
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Region Origin</h4>
                <p className="text-xs text-[#e06d34] font-bold flex items-center gap-1 justify-center md:justify-start"><MapPin className="h-3 w-3" /> Bihar Cuisine</p>
              </div>
              <div className="text-center md:text-left">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Standard</h4>
                <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-center md:justify-start"><ShieldCheck className="h-3.5 w-3.5" /> 100% Unglazed Clay</p>
              </div>
            </div>
          </div>

          {/* DYNAMIC VISUAL ORDER TRACKER PORTLET */}
          <div className="w-full md:w-80 bg-[#0c1317]/80 border border-border/60 p-6 rounded-3xl backdrop-blur-md shadow-2xl z-10 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#e06d34] flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Order Status Tracker
              </h3>
              <p className="text-[10px] text-muted">Search preparation progress inside database</p>
            </div>

            <form onSubmit={handleTrackOrder} className="flex gap-2">
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="Enter Order # (e.g. MM-1024)"
                className="flex-grow bg-[#122029] border border-border px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#c25e2e] focus:ring-1 focus:ring-[#c25e2e]/20 text-gray-200 uppercase font-mono"
              />
              <button
                type="submit"
                disabled={trackerLoading}
                className="p-2 bg-[#c25e2e] hover:bg-[#d56b37] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"
              >
                {trackerLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </form>

            {/* Tracker Result Display */}
            {trackResult && (
              <div className="mt-2 bg-[#122029]/60 border border-border/40 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-muted">Order: #{trackResult.orderNo}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#c25e2e]/10 text-[#e06d34] text-[9px] font-extrabold border border-[#c25e2e]/20 font-mono">
                    {getStatusProgress(trackResult.status).name}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#0c1317] h-1.5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-border/20">
                  {[1, 2, 3, 4, 5].map((stepIdx) => {
                    const activeStep = getStatusProgress(trackResult.status).step;
                    const isActive = stepIdx <= activeStep + 1;
                    return (
                      <div
                        key={stepIdx}
                        className={`h-full flex-1 rounded-full transition-all ${
                          isActive ? "bg-gradient-to-r from-amber-500 to-[#c25e2e]" : "bg-[#182229]"
                        }`}
                      />
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-gray-300 pt-1 border-t border-[#0c1317]">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted">Payment Status</span>
                    <span className="font-semibold text-emerald-400 uppercase">{trackResult.paymentStatus}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted">Method</span>
                    <span className="font-semibold">{trackResult.deliveryType}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted">Total Paid</span>
                    <span className="font-bold text-[#e06d34]">₹{trackResult.total.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            )}

            {trackError && (
              <p className="mt-2 text-rose-500 text-xs font-semibold bg-rose-950/20 border border-rose-950/30 p-3 rounded-2xl flex items-center gap-1.5">
                ⚠️ {trackError}
              </p>
            )}
          </div>
        </section>

        <MadhubaniDivider />

        {/* CULINARY SPOTLIGHT SECTION */}
        <section id="spotlight" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#e06d34] flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-[#e06d34] animate-pulse" /> Rasoiya Sanjay's Signature Feast
            </h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-100">Bihari Culinary Spotlight Showcase</h3>
            <p className="text-muted text-xs md:text-sm max-w-lg mx-auto">Discover the absolute best specialties of the region. Tap to order directly on WhatsApp instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-4">
            {spotlightDishes.map((dish, idx) => (
              <div 
                key={idx}
                className="bg-[#121c21]/80 border border-border/60 hover:border-[#c25e2e]/60 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 shadow-xl group hover:shadow-2xl hover:shadow-[#c25e2e]/5 relative overflow-hidden"
              >
                {/* Spotlight indicator tag */}
                <div className="absolute top-3 left-3 bg-[#c25e2e] text-white text-[8px] font-black tracking-wider uppercase px-2 py-0.5 rounded shadow z-10">
                  {dish.tag}
                </div>

                <div className="relative h-[160px] w-full bg-[#0c1317] rounded-2xl overflow-hidden border border-border/40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 right-2 text-2xl bg-[#121c21]/95 px-2 py-1 rounded-xl border border-border/40 select-none shadow">
                    {dish.icon}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-extrabold text-gray-100 text-sm tracking-wide group-hover:text-[#e06d34] transition-colors">{dish.name}</h4>
                  <p className="text-muted text-[11px] leading-relaxed line-clamp-3 min-h-[50px]">{dish.description}</p>
                </div>

                <div className="border-t border-border/40 pt-3 mt-1 flex justify-between items-center shrink-0">
                  <span className="font-black text-sm text-[#e06d34] font-mono">₹{dish.price}</span>
                  <a
                    href={`https://wa.me/919296914511?text=add%20${encodeURIComponent(dish.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-white bg-gradient-to-r from-[#c25e2e] to-orange-500 hover:from-[#d56b37] hover:to-[#ff7f24] px-3.5 py-2 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1"
                  >
                    <span>Order Now</span>
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRIVIA PORTLET & TABLE BOOKINGS PROMOTION */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          
          {/* LEFT PANEL: Dynamic Bihar Culinary Trivia */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#121c21]/90 to-[#0c1317]/95 border border-border/60 p-6 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-xl relative overflow-hidden select-none">
            <div className="absolute top-[-20%] right-[-20%] h-32 w-32 bg-[#c25e2e]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block mb-3.5">
                📖 Did You Know? Bihari Culinary Trivia
              </span>
              <h4 className="text-base font-black text-gray-100 tracking-wide mb-2 flex items-center gap-1.5">
                💡 {triviaItems[triviaIndex].title}
              </h4>
              <p className="text-muted text-xs leading-relaxed max-w-xl transition-all duration-300">
                {triviaItems[triviaIndex].fact}
              </p>
            </div>

            <div className="flex justify-between items-center border-t border-border/30 pt-4 mt-4 shrink-0">
              <span className="text-[10px] text-muted font-bold font-mono">Fact {triviaIndex + 1} of 3</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setTriviaIndex((prev) => (prev === 0 ? 2 : prev - 1))}
                  className="p-1.5 bg-[#122029] hover:bg-border text-muted hover:text-gray-200 rounded-lg transition-all border border-border/20 active:scale-95"
                  title="Previous Fact"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTriviaIndex((prev) => (prev === 2 ? 0 : prev + 1))}
                  className="p-1.5 bg-[#122029] hover:bg-border text-muted hover:text-gray-200 rounded-lg transition-all border border-border/20 active:scale-95"
                  title="Next Fact"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Clay-pot Dining & Table Bookings Invite */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#121c21]/90 to-[#0c1317]/95 border border-border/60 p-6 rounded-3xl flex flex-col justify-between min-h-[220px] shadow-xl relative overflow-hidden">
            <div className="absolute bottom-[-25%] left-[-15%] h-36 w-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mb-3.5">
                📅 Dine-In Reservation Desk
              </span>
              <h4 className="text-base font-black text-gray-100 tracking-wide mb-2 flex items-center gap-1.5">
                🏺 Book a Traditional Earthen Dining Table
              </h4>
              <p className="text-muted text-xs leading-relaxed max-w-xl">
                Planning a family feast? Secure your traditional dine-in tableside booking instantly! Enjoy slow-cooked Handi curries served hot in authentic clay cookware with pure clay drinking cups (Kulhars).
              </p>
            </div>

            <div className="pt-4 border-t border-border/30 mt-4 shrink-0 flex items-center justify-between flex-wrap gap-3">
              <span className="text-[10px] text-muted font-bold flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-[#e06d34]" /> Family Seating Up to 15 Guests</span>
              <a
                href="https://wa.me/919296914511?text=Reserve%20a%20table%20for%204%20guests"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md flex items-center gap-1.5"
              >
                <CalendarCheck className="h-4 w-4" /> Book Table on WhatsApp
              </a>
            </div>
          </div>

        </section>

        <MadhubaniDivider />

        {/* DYNAMIC FOOD MENU SECTION */}
        <section id="menu" className="space-y-6 pt-2">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#e06d34] flex items-center justify-center gap-2">
              <Compass className="h-4 w-4" /> Clay-Oven Curated Selection
            </h2>
            <h3 className="text-2xl md:text-3xl font-black text-gray-100">Explore Our Full Restaurant Menu</h3>
            <p className="text-muted text-xs md:text-sm max-w-md mx-auto">Select categories to inspect pricing, descriptions, and custom prep options.</p>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="flex overflow-x-auto justify-start md:justify-center gap-2 py-2 px-4 md:px-0 scrollbar-none border-b border-border/20">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold tracking-wide transition-all shrink-0 active:scale-95 ${
                    selectedCatId === cat.id
                      ? "bg-[#c25e2e] text-white shadow-lg shadow-[#c25e2e]/20"
                      : "bg-[#122029] border border-border/40 text-muted hover:text-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Dishes Grid */}
          {activeCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {activeCategory.menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121c21]/30 border border-border/60 p-5 rounded-2xl flex flex-col gap-3 hover:border-[#c25e2e]/30 hover:bg-[#121c21]/60 transition-all duration-300 relative group overflow-hidden shadow-xl"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.isVegetarian ? (
                          <span className="h-3.5 w-3.5 border border-emerald-600 rounded bg-emerald-950 flex items-center justify-center shrink-0" title="Pure Vegetarian">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </span>
                        ) : (
                          <span className="h-3.5 w-3.5 border border-rose-600 rounded bg-rose-950 flex items-center justify-center shrink-0" title="Non-Vegetarian">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          </span>
                        )}
                        <h4 className="font-extrabold text-slate-100 uppercase tracking-wide group-hover:text-[#e06d34] transition-colors text-sm">
                          {item.name}
                        </h4>
                      </div>
                      <p className="text-slate-500 text-xs leading-relaxed max-w-xs line-clamp-2 mt-1">{item.description || "Freshly prepared slow-cooked specialty."}</p>
                    </div>
                    
                    <span className="font-extrabold text-sm text-[#e06d34] bg-[#0c1317]/80 px-3 py-1 rounded-xl border border-border/40 font-mono shrink-0">
                      ₹{Number(item.price).toFixed(0)}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#0c1317] flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tandoor Special</span>
                    <a
                      href={`https://wa.me/919296914511?text=add%20${encodeURIComponent(item.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 bg-[#122029] border border-border px-3 py-1.5 rounded-lg hover:border-border/80"
                    >
                      Add on WhatsApp <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/45 bg-[#0c1317] py-8 shrink-0 text-slate-600 text-center text-xs shadow-inner">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Mirch Masala Bihar Regional Kitchen. Crafted with traditional clay pot heritage.</p>
          <div className="flex gap-4 select-text">
            <a href="https://wa.me/919296914511?text=MENU" className="hover:text-slate-400 font-bold transition-colors">WhatsApp Order Desk</a>
            <span className="text-slate-800">|</span>
            <Link href="/admin/orders" className="hover:text-slate-400 font-bold transition-colors">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
