"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { 
  QrCode, 
  Download, 
  Printer, 
  MessageSquare, 
  Sparkles, 
  Phone,
  Copy,
  Check
} from "lucide-react";

export default function AdminQRGenerator() {
  const [phoneNumber, setPhoneNumber] = useState("919876543210");
  const [startMessage, setStartMessage] = useState("MENU");
  const [posterTitle, setPosterTitle] = useState("Mirch Masala Restaurant");
  const [copied, setCopied] = useState(false);
  
  // Header metrics states
  const [headerMetrics, setHeaderMetrics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    todayRevenue: 0,
  });

  // Fetch metrics on load to populate DashboardHeader
  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        const total = data.orders.length;
        const active = data.orders.filter(
          (o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
        ).length;
        const todayStr = new Date().toISOString().split("T")[0];
        const todayRev = data.orders
          .filter((o: any) => o.createdAt.split("T")[0] === todayStr && o.status !== "CANCELLED")
          .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

        setHeaderMetrics({
          totalOrders: total,
          activeOrders: active,
          todayRevenue: todayRev,
        });
      }
    } catch (err) {
      console.error("Failed to fetch orders for QR header:", err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Clean phone number (remove + or spaces)
  const cleanPhone = phoneNumber.replace(/\+/g, "").replace(/\s/g, "");

  // Generate dynamic WhatsApp link
  const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(startMessage)}`;

  // Generate QR Code URL using high-quality QuickChart QR API
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(waLink)}&size=300&margin=1&ecLevel=H`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(waLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b141a] text-gray-200 overflow-x-hidden font-sans print:bg-white print:text-black">
      {/* Integrated Navigation Header (Hidden during print) */}
      <div className="print:hidden">
        <DashboardHeader 
          totalOrders={headerMetrics.totalOrders} 
          activeOrders={headerMetrics.activeOrders} 
          todayRevenue={headerMetrics.todayRevenue} 
        />
      </div>

      {/* Control Utility Sub-bar (Hidden during print) */}
      <div className="bg-surface border-b border-border/80 px-6 py-3 flex items-center justify-between shrink-0 shadow-md print:hidden">
        <span className="bg-primary/20 border border-primary/45 px-3 py-1 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm">
          <QrCode className="h-3.5 w-3.5" />
          WhatsApp QR Poster Creator
        </span>
        <button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-extrabold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md flex items-center gap-1.5"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Table Poster</span>
        </button>
      </div>

      {/* Main split display: Input Config on Left & High-Res Poster on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto p-6 gap-6 print:p-0 print:overflow-visible">
        
        {/* LEFT COLUMN: Input Configuration (Hidden during print) */}
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-5 print:hidden">
          <div className="glass border border-border/40 p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-border/20 pb-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <h3 className="text-sm font-extrabold tracking-wider uppercase text-gray-100">
                QR Desk Configurations
              </h3>
            </div>

            {/* Input 1: WhatsApp Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted tracking-wider uppercase font-bold flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" />
                WhatsApp API Phone Number:
              </label>
              <input
                type="text"
                placeholder="e.g. 919876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-[#122029] border border-border hover:border-primary/40 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-gray-100 font-bold outline-none transition-all shadow-inner"
              />
              <span className="text-[9px] text-muted italic">
                *Include country code (e.g. 91 for India) without '+' or spaces.
              </span>
            </div>

            {/* Input 2: Start Message Keyword */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted tracking-wider uppercase font-bold flex items-center gap-1">
                <MessageSquare className="h-3 w-3 text-accent" />
                Action Start Keyword:
              </label>
              <input
                type="text"
                placeholder="e.g. MENU"
                value={startMessage}
                onChange={(e) => setStartMessage(e.target.value)}
                className="bg-[#122029] border border-border hover:border-primary/40 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-gray-100 font-bold outline-none transition-all shadow-inner"
              />
              <span className="text-[9px] text-muted italic">
                *Message pre-filled in customer's chat (like 'MENU' or 'RESET').
              </span>
            </div>

            {/* Input 3: Poster Heading */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted tracking-wider uppercase font-bold">
                Restaurant Heading Name:
              </label>
              <input
                type="text"
                value={posterTitle}
                onChange={(e) => setPosterTitle(e.target.value)}
                className="bg-[#122029] border border-border hover:border-primary/40 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-gray-100 font-bold outline-none transition-all shadow-inner"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 border-t border-border/20 pt-4 mt-1">
              <span className="text-[10px] text-muted tracking-wider uppercase font-bold">
                Direct Integration Link:
              </span>
              
              <div className="flex items-center gap-2 bg-[#122029] border border-border/10 rounded-xl p-2 select-text overflow-hidden">
                <span className="text-[10px] text-muted truncate flex-1 font-mono">
                  {waLink}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 hover:bg-border rounded-lg text-muted hover:text-gray-200 transition-all border border-border/10"
                  title="Copy Direct URL"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info card */}
          <div className="bg-[#122029] border border-border/20 rounded-2xl p-5 text-xs text-muted flex flex-col gap-3 leading-relaxed">
            <span className="font-bold text-gray-200">Table QR Utility:</span>
            <p>
              When customers scan this QR code, it launches WhatsApp pre-filled with the command **"{startMessage}"**. 
            </p>
            <p>
              Once they click send, our stateful WhatsApp bot instantly replies with your welcome menu cards—enabling **zero-typing tableside ordering and table bookings**!
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Highly Premium Printable Table Marketing Poster */}
        <div className="flex-1 flex justify-center items-start print:block print:p-0">
          
          {/* Printable marketing poster block */}
          <div className="w-full max-w-[450px] bg-white text-black p-8 rounded-3xl border-4 border-amber-500 shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden select-none print:shadow-none print:border-amber-500 print:w-full print:max-w-none print:p-12 print:rounded-none">
            
            {/* Saffron design border/flashes */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-amber-500" />
            
            {/* Branded Header */}
            <div className="flex flex-col items-center gap-1.5 text-center mt-2">
              <span className="text-[11px] text-amber-600 font-extrabold uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full">
                🌶️ Mirch Masala 🍲
              </span>
              <h2 className="text-2xl font-black text-slate-800 font-serif leading-tight">
                {posterTitle}
              </h2>
              <div className="h-[2px] w-12 bg-amber-500 mt-1" />
            </div>

            {/* Invitation catchphrase */}
            <div className="text-center px-4">
              <p className="text-[13px] font-bold text-slate-600 leading-snug">
                Scan QR code below to **Order Food** or **Book a Table** instantly on WhatsApp!
              </p>
            </div>

            {/* High-Res QR code box with saffron glow */}
            <div className="bg-[#fcf8f2] border-2 border-amber-500/30 p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner relative group transition-all duration-300">
              <img 
                src={qrUrl} 
                alt="WhatsApp QR Code" 
                className="h-[200px] w-[200px] object-contain select-none"
              />
              <span className="absolute bottom-1 bg-amber-500 text-white text-[8px] tracking-wider uppercase font-black px-2.5 py-0.5 rounded-full select-none shadow">
                wa.me QR Link
              </span>
            </div>

            {/* Direct WhatsApp instruction badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-4 py-2.5 rounded-xl w-full justify-center">
              <svg className="h-4 w-4 fill-emerald-600" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.638 1.97 14.162.943 11.536.943c-5.445 0-9.87 4.372-9.874 9.802-.001 1.716.463 3.39 1.34 4.842l-.98 3.58 3.665-.96z" />
              </svg>
              <span className="text-[11px] font-black tracking-wide uppercase">
                WhatsApp Order System
              </span>
            </div>

            {/* Easy Step-by-Step Instructions */}
            <div className="w-full flex flex-col gap-2.5 border-t border-slate-100 pt-4 px-2">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-extrabold text-center block mb-0.5">
                3 Simple Steps to Start:
              </span>
              
              <div className="flex gap-3 items-start text-left">
                <span className="h-5 w-5 bg-amber-100 text-amber-600 border border-amber-300 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 select-none">
                  1
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Open your phone camera and **Scan the QR Code**.
                </p>
              </div>

              <div className="flex gap-3 items-start text-left">
                <span className="h-5 w-5 bg-amber-100 text-amber-600 border border-amber-300 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 select-none">
                  2
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Click the link to open WhatsApp and **Send the pre-filled message**.
                </p>
              </div>

              <div className="flex gap-3 items-start text-left">
                <span className="h-5 w-5 bg-amber-100 text-amber-600 border border-amber-300 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5 select-none">
                  3
                </span>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Instantly receive our **Dynamic Saffron Menu** to place your order!
                </p>
              </div>
            </div>

            {/* Printable brand signature footer */}
            <div className="text-center mt-2 border-t border-slate-100 pt-3 w-full text-[9px] text-slate-400 italic">
              Powered by Mirch Masala State Engine — Zero-typing Tableside Ordering
            </div>
            
          </div>
        </div>

      </div>

      {/* Global Print-Only CSS Styling */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
