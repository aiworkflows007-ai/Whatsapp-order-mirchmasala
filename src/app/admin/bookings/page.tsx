"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { 
  Calendar, 
  Users, 
  Clock, 
  Utensils, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  FileText, 
  Check, 
  X,
  MapPin
} from "lucide-react";

interface Customer {
  id: string;
  name: string | null;
  whatsappNumber: string;
}

interface TableBooking {
  id: string;
  bookingNo: string;
  customer: Customer;
  guestCount: number;
  bookingDate: string;
  bookingTime: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  tableNo: string | null;
  notes: string | null;
  createdAt: string;
}

interface OrderData {
  id: string;
  orderNo: string;
  status: string;
  deliveryType: string;
  tableNumber: string | null;
  totalAmount: number;
  createdAt: string;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [mobileTab, setMobileTab] = useState<"reservations" | "occupancy">("reservations");
  const prevBookingsRef = useRef<TableBooking[]>([]);
  
  // Header metrics (calculated from orders)
  const [headerMetrics, setHeaderMetrics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    todayRevenue: 0,
  });

  // Modal control states
  const [selectedBooking, setSelectedBooking] = useState<TableBooking | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [tableNoInput, setTableNoInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Play dual-tone high-fidelity chime for new bookings
  const playBellChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.type = "sine";
      osc1.frequency.value = 523.25; // C5
      
      osc2.type = "sine";
      osc2.frequency.value = 659.25; // E5
      
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 0.4);
      osc2.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio alert chime blocked or unsupported.");
    }
  };

  // TTS Voice Narrator function
  const speakAlert = (text: string) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel(); // Clear current queue
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Look for Hindi or Indian English voice
      const indianVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS speech synthesis failed:", e);
    }
  };

  // Fetch all orders & bookings
  const fetchData = async (isFirstLoad = false) => {
    try {
      // 1. Fetch Bookings
      const resBookings = await fetch("/api/admin/bookings");
      const dataBookings = await resBookings.json();

      // 2. Fetch Orders
      const resOrders = await fetch("/api/admin/orders");
      const dataOrders = await resOrders.json();

      if (dataOrders.success && dataOrders.orders) {
        setOrders(dataOrders.orders);

        // Compute metrics
        const total = dataOrders.orders.length;
        const active = dataOrders.orders.filter(
          (o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
        ).length;

        // Today's Sales Calculation
        const todayStr = new Date().toISOString().split("T")[0];
        const todayRev = dataOrders.orders
          .filter((o: any) => o.createdAt.split("T")[0] === todayStr && o.status !== "CANCELLED")
          .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);

        setHeaderMetrics({
          totalOrders: total,
          activeOrders: active,
          todayRevenue: todayRev,
        });
      }

      if (dataBookings.success && dataBookings.bookings) {
        const fetchedBookings: TableBooking[] = dataBookings.bookings;
        setBookings(fetchedBookings);

        // Live alert check for newly added booking requests
        if (!isFirstLoad && prevBookingsRef.current.length > 0 && narratorEnabled) {
          fetchedBookings.forEach((newBk) => {
            const exists = prevBookingsRef.current.find((oldBk) => oldBk.id === newBk.id);
            if (!exists && newBk.status === "PENDING") {
              playBellChime();
              speakAlert(`Naya table booking request aaya hai! Guest count ${newBk.guestCount} hai.`);
            }
          });
        }

        prevBookingsRef.current = fetchedBookings;
      }
    } catch (err) {
      console.error("❌ Failed to fetch reservation desk data:", err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  // Polling hook every 4 seconds
  useEffect(() => {
    fetchData(true);

    const interval = setInterval(() => {
      fetchData(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [narratorEnabled]);

  // Derive occupied tables from active dine-in orders
  const getOccupiedTables = (): Set<string> => {
    const occupied = new Set<string>();
    orders.forEach((o) => {
      const isDineIn = o.deliveryType === "DINE_IN";
      const isActive = o.status !== "DELIVERED" && o.status !== "CANCELLED";
      if (isDineIn && isActive && o.tableNumber) {
        // Clean table number formats like "Table 4" or "4" to standard uppercase values
        const num = o.tableNumber.toUpperCase().replace("TABLE", "").trim();
        if (num) occupied.add(num);
      }
    });
    return occupied;
  };

  const occupiedTables = getOccupiedTables();

  // Approve Reservation action
  const handleApprove = async () => {
    if (!selectedBooking) return;
    if (!tableNoInput.trim()) {
      alert("Kripya table number assign karein.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: "APPROVE",
          tableNo: tableNoInput.trim(),
          note: notesInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsApproveOpen(false);
        setTableNoInput("");
        setNotesInput("");
        setSelectedBooking(null);
        
        if (narratorEnabled) {
          speakAlert(`Booking number ${data.booking.bookingNo} approve ho gaya hai! Table assigned. `);
        }
        
        fetchData(false);
      } else {
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Reject Reservation action
  const handleReject = async () => {
    if (!selectedBooking) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: "REJECT",
          note: notesInput.trim() || "Restaurant fully occupied",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsRejectOpen(false);
        setNotesInput("");
        setSelectedBooking(null);

        if (narratorEnabled) {
          speakAlert(`Booking number ${data.booking.bookingNo} reject ho gaya hai.`);
        }

        fetchData(false);
      } else {
        alert(`Failed to decline booking: ${data.error}`);
      }
    } catch (error) {
      console.error("Rejection error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Group bookings
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const confirmedBookings = bookings.filter((b) => b.status === "APPROVED");
  const cancelledBookings = bookings.filter((b) => b.status === "REJECTED" || b.status === "CANCELLED");

  // Today's total upcoming reservation count
  const todayBookingsCount = bookings.filter((b) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return b.bookingDate.split("T")[0] === todayStr && b.status === "APPROVED";
  }).length;

  return (
    <div className="flex flex-col h-screen bg-[#0b141a] text-gray-200 overflow-hidden font-sans">
      {/* Integrated Navigation Header */}
      <DashboardHeader 
        totalOrders={headerMetrics.totalOrders} 
        activeOrders={headerMetrics.activeOrders} 
        todayRevenue={headerMetrics.todayRevenue} 
      />

      {/* Control Utility Sub-bar */}
      <div className="bg-surface border-b border-border/80 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <span className="bg-primary/20 border border-primary/45 px-3 py-1 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm">
            📅 Active Reservations Desk
          </span>

          <div className="h-4 w-[1px] bg-border/40 hidden sm:block" />

          {/* Saffron themed speech narrator */}
          <button
            onClick={() => {
              const nextVal = !narratorEnabled;
              setNarratorEnabled(nextVal);
              if (nextVal) {
                speakAlert("Reservations Narrator Enabled!");
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase tracking-wider font-extrabold transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95 hover:scale-102 ${
              narratorEnabled
                ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {narratorEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5" />
                <span>Narrator: Active</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5" />
                <span>Narrator: Muted</span>
              </>
            )}
          </button>
        </div>

        {/* Stats on chosen date */}
        <div className="flex items-center gap-6 overflow-x-auto py-0.5 shrink-0 select-none">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-wider font-semibold">Today's Confirmed Bookings</span>
            <span className="text-sm font-extrabold text-primary">{todayBookingsCount} tables</span>
          </div>
          <div className="h-6 w-[1px] bg-border/40 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-wider font-semibold">Pending Requests</span>
            <span className="text-sm font-extrabold text-amber-400">{pendingBookings.length} pending</span>
          </div>
          <div className="h-6 w-[1px] bg-border/40 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] text-muted uppercase tracking-wider font-semibold">Active Dining Occupancy</span>
            <span className="text-sm font-extrabold text-emerald-400">{occupiedTables.size} active tables</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex xl:hidden bg-[#122029] p-1.5 rounded-xl border border-border/60 mx-6 mt-4 shrink-0 gap-1.5 select-none">
        <button
          onClick={() => setMobileTab("reservations")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
            mobileTab === "reservations" ? "bg-primary text-white shadow-md" : "text-muted"
          }`}
        >
          📋 Bookings Queue
        </button>
        <button
          onClick={() => setMobileTab("occupancy")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
            mobileTab === "occupancy" ? "bg-primary text-white shadow-md" : "text-muted"
          }`}
        >
          🍽️ Live Table Monitor
        </button>
      </div>

      {/* Main split display: Workspace columns & Physical layout monitor */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden bg-[#0b141a]">
        
        {/* LEFT PORTION: 3-column Reservations Workspace */}
        <div className={`flex-1 overflow-x-auto p-6 flex gap-6 bg-[#0b141a] scroll-smooth md:snap-none snap-x snap-mandatory ${
          mobileTab === "reservations" ? "flex" : "hidden xl:flex"
        }`}>
          
          {/* COLUMN 1: PENDING REQUESTS */}
          <div className="flex flex-col w-[85vw] sm:w-[320px] md:w-[350px] shrink-0 h-full snap-center">
            <div className="flex items-center justify-between border-b-2 border-amber-500/80 pb-2 mb-4 shrink-0">
              <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
                ⏳ Pending Reservations
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md font-extrabold text-xs">
                  {pendingBookings.length}
                </span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {loading ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20 animate-pulse">Loading reservation requests...</div>
              ) : pendingBookings.length === 0 ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No pending table booking requests.</div>
              ) : (
                pendingBookings.map((b) => (
                  <div key={b.id} className="glass border border-border/40 p-4 rounded-xl flex flex-col gap-3 shadow-md hover:border-amber-500/40 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-400 tracking-wider">#{b.bookingNo}</span>
                      <span className="text-[10px] text-muted">{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-100">{b.customer.name || "Guest Customer"}</span>
                      <span className="text-[11px] text-muted">{b.customer.whatsappNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#122029] p-2.5 rounded-lg border border-border/10 select-none">
                      <div className="flex flex-col items-center">
                        <Users className="h-3.5 w-3.5 text-primary mb-1" />
                        <span className="text-[10px] text-muted uppercase font-semibold">Guests</span>
                        <span className="text-xs font-black text-gray-200">{b.guestCount}</span>
                      </div>
                      <div className="flex flex-col items-center border-x border-border/20">
                        <Calendar className="h-3.5 w-3.5 text-accent mb-1" />
                        <span className="text-[10px] text-muted uppercase font-semibold">Date</span>
                        <span className="text-[10px] font-black text-gray-200 text-center truncate w-full" title={new Date(b.bookingDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}>
                          {new Date(b.bookingDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="h-3.5 w-3.5 text-emerald-400 mb-1" />
                        <span className="text-[10px] text-muted uppercase font-semibold">Time</span>
                        <span className="text-xs font-black text-gray-200">{b.bookingTime}</span>
                      </div>
                    </div>

                    {b.notes && (
                      <div className="text-[11px] text-muted bg-[#122029] px-2.5 py-1.5 rounded-lg border-l-2 border-primary italic">
                        "{b.notes}"
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setIsApproveOpen(true);
                        }}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs py-2 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept & Allocate</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setIsRejectOpen(true);
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl active:scale-95 transition-all"
                        title="Decline Reservation"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: CONFIRMED RESERVATIONS */}
          <div className="flex flex-col w-[85vw] sm:w-[320px] md:w-[350px] shrink-0 h-full snap-center">
            <div className="flex items-center justify-between border-b-2 border-emerald-500/80 pb-2 mb-4 shrink-0">
              <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
                🟢 Confirmed Tables
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-extrabold text-xs">
                  {confirmedBookings.length}
                </span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {loading ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20 animate-pulse">Loading confirmed desk...</div>
              ) : confirmedBookings.length === 0 ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No active confirmed tables.</div>
              ) : (
                confirmedBookings.map((b) => (
                  <div key={b.id} className="glass border border-emerald-500/25 p-4 rounded-xl flex flex-col gap-3 shadow-md bg-emerald-950/5 hover:border-emerald-500/40 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-emerald-400 tracking-wider">#{b.bookingNo}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md font-black text-[10px] uppercase">
                          Confirmed
                        </span>
                      </div>
                      <span className="bg-[#122029] border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-lg text-xs font-black select-none">
                        Table #{b.tableNo || "1"}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-100">{b.customer.name || "Guest Customer"}</span>
                      <span className="text-[11px] text-muted">{b.customer.whatsappNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-[#122029] p-2 rounded-lg border border-border/10">
                      <div className="flex flex-col items-center">
                        <Users className="h-3.5 w-3.5 text-primary mb-1" />
                        <span className="text-[9px] text-muted uppercase font-semibold">Guests</span>
                        <span className="text-xs font-black text-gray-200">{b.guestCount}</span>
                      </div>
                      <div className="flex flex-col items-center border-x border-border/20">
                        <Calendar className="h-3.5 w-3.5 text-accent mb-1" />
                        <span className="text-[9px] text-muted uppercase font-semibold">Date</span>
                        <span className="text-[10px] font-black text-gray-200 text-center truncate w-full" title={new Date(b.bookingDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}>
                          {new Date(b.bookingDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Clock className="h-3.5 w-3.5 text-emerald-400 mb-1" />
                        <span className="text-[9px] text-muted uppercase font-semibold">Time</span>
                        <span className="text-xs font-black text-gray-200">{b.bookingTime}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: REJECTED & CANCELLED LOGS */}
          <div className="flex flex-col w-[85vw] sm:w-[320px] md:w-[350px] shrink-0 h-full snap-center">
            <div className="flex items-center justify-between border-b-2 border-red-500/40 pb-2 mb-4 shrink-0">
              <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
                📂 Reservation Logs
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400/80 rounded-md font-extrabold text-xs">
                  {cancelledBookings.length}
                </span>
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {loading ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20 animate-pulse">Loading logs...</div>
              ) : cancelledBookings.length === 0 ? (
                <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No logged reservation history.</div>
              ) : (
                cancelledBookings.map((b) => (
                  <div key={b.id} className="glass border border-border/10 p-4 rounded-xl flex flex-col gap-2.5 shadow-sm opacity-70 hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-400 tracking-wider">#{b.bookingNo}</span>
                      <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider ${
                        b.status === "REJECTED" ? "bg-red-500/10 text-red-400" : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-300">{b.customer.name || "Guest Customer"}</span>
                      <span className="text-[10px] text-muted">{b.customer.whatsappNumber}</span>
                    </div>

                    <div className="text-[10px] text-muted flex items-center gap-4">
                      <span>Guests: *{b.guestCount}*</span>
                      <span>Date: *{new Date(b.bookingDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}*</span>
                      <span>Time: *{b.bookingTime}*</span>
                    </div>

                    {b.notes && (
                      <div className="text-[10px] text-red-400/80 bg-red-950/10 px-2 py-1.5 rounded border-l border-red-500/30 italic">
                        "{b.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PORTION: Physical Desk Layout Monitor */}
        <div className={`w-full xl:w-[380px] border-t xl:border-t-0 xl:border-l border-border/80 bg-[#0d1820] p-6 flex flex-col overflow-y-auto select-none ${
          mobileTab === "occupancy" ? "flex" : "hidden xl:flex"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-extrabold text-gray-200 tracking-wider uppercase">
              Table Occupancy Desk
            </h3>
          </div>
          
          <p className="text-[11px] text-muted mb-4 leading-relaxed">
            Real-time visual monitoring of restaurant physical tables. Tables marked in <strong className="text-red-400">red</strong> are occupied by active dine-in orders.
          </p>

          <div className="grid grid-cols-3 gap-3 flex-1">
            {Array.from({ length: 15 }, (_, i) => {
              const tableNum = String(i + 1);
              const isOccupied = occupiedTables.has(tableNum);
              return (
                <div
                  key={tableNum}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all duration-300 relative overflow-hidden ${
                    isOccupied
                      ? "bg-red-500/5 border-red-500/40 text-red-400"
                      : "bg-[#122029] border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40"
                  }`}
                >
                  {/* Subtle glass effect glow */}
                  <div className={`absolute top-0 right-0 h-1.5 w-1.5 rounded-full m-1.5 animate-pulse ${
                    isOccupied ? "bg-red-500" : "bg-emerald-500"
                  }`} />
                  
                  <span className="text-[10px] text-muted tracking-wider uppercase font-semibold">Table</span>
                  <span className="text-lg font-black">{tableNum}</span>
                  
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                    isOccupied 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {isOccupied ? "Occupied" : "Free"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 bg-[#122029] border border-border/20 rounded-xl p-4 flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-200">Table Desk Info</span>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full inline-block shrink-0" />
              <span>Dine-in Order active (Manager must avoid double-booking)</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full inline-block shrink-0" />
              <span>Available for reservation seat allocations</span>
            </div>
          </div>
        </div>

      </div>

      {/* DRAWER MODAL 1: ACCEPT & ALLOCATE TABLE */}
      {isApproveOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#0e171e] border border-emerald-500/40 w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => {
                setIsApproveOpen(false);
                setSelectedBooking(null);
                setTableNoInput("");
              }}
              className="absolute top-4 right-4 p-1.5 bg-[#122029] hover:bg-border rounded-xl text-muted hover:text-gray-200 transition-all border border-border/10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-extrabold text-base tracking-wide uppercase">
                Approve Table Reservation
              </h3>
            </div>

            <div className="bg-[#122029] border border-border/10 rounded-xl p-3.5 text-xs text-muted flex flex-col gap-2.5 leading-relaxed">
              <div>
                Booking Reference: <strong className="text-primary">#{selectedBooking.bookingNo}</strong>
              </div>
              <div>
                Customer: <strong className="text-gray-200">{selectedBooking.customer.name || "Guest Customer"}</strong>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-300">
                <span>Guests: <strong>{selectedBooking.guestCount}</strong></span>
                <span>Slot: <strong>{selectedBooking.bookingTime}</strong></span>
              </div>
            </div>

            {/* Quick table picker grid */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-muted tracking-wider uppercase font-bold">
                Quick Choose Available Tables:
              </span>
              <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto p-1 border border-border/10 rounded-xl bg-[#091015]">
                {Array.from({ length: 15 }, (_, i) => {
                  const tNum = String(i + 1);
                  const isBusy = occupiedTables.has(tNum);
                  return (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => setTableNoInput(tNum)}
                      className={`py-2 rounded-lg text-xs font-black border transition-all duration-200 active:scale-95 flex flex-col items-center ${
                        tableNoInput === tNum
                          ? "bg-primary text-white border-primary-hover shadow-md"
                          : isBusy
                          ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          : "bg-[#122029] border-border/20 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400"
                      }`}
                    >
                      <span>#{tNum}</span>
                      <span className="text-[7px] opacity-75 uppercase">
                        {isBusy ? "Busy" : "Free"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form inputs */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted tracking-wider uppercase font-bold">
                  Assigned Table ID / Number:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 or Table 12"
                  value={tableNoInput}
                  onChange={(e) => setTableNoInput(e.target.value)}
                  className="bg-[#122029] border border-border/80 hover:border-emerald-500/40 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-gray-100 font-bold outline-none transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-muted tracking-wider uppercase font-bold">
                  Add Custom Note (Optional message sent to customer):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Table allocated close to the window! 🍽️"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="bg-[#122029] border border-border/80 hover:border-primary/40 focus:border-primary rounded-xl px-3 py-2.5 text-xs text-gray-100 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsApproveOpen(false);
                  setSelectedBooking(null);
                  setTableNoInput("");
                }}
                className="flex-1 bg-surface border border-border text-muted hover:text-gray-200 font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-all text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleApprove}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-extrabold text-xs py-2.5 rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {submitting ? "Processing..." : "Confirm & Notify Bot"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DRAWER MODAL 2: DECLINE/REJECT RESERVATION */}
      {isRejectOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300">
          <div className="bg-[#0e171e] border border-red-500/40 w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            <button
              onClick={() => {
                setIsRejectOpen(false);
                setSelectedBooking(null);
                setNotesInput("");
              }}
              className="absolute top-4 right-4 p-1.5 bg-[#122029] hover:bg-border rounded-xl text-muted hover:text-gray-200 transition-all border border-border/10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <h3 className="font-extrabold text-base tracking-wide uppercase">
                Decline Table Booking
              </h3>
            </div>

            <div className="bg-[#122029] border border-border/10 rounded-xl p-3.5 text-xs text-muted flex flex-col gap-2.5">
              <div>
                Declining Booking Request: <strong className="text-red-400">#{selectedBooking.bookingNo}</strong>
              </div>
              <div>
                Customer: <strong className="text-gray-300">{selectedBooking.customer.name || "Guest Customer"}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted tracking-wider uppercase font-bold">
                Rejection Reason (Sent to WhatsApp Customer):
              </label>
              <textarea
                placeholder="e.g. Restaurant is fully booked for a private event."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={3}
                className="bg-[#122029] border border-border/85 hover:border-red-500/40 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-gray-100 outline-none transition-all resize-none shadow-inner"
              />
            </div>

            <div className="flex gap-3 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsRejectOpen(false);
                  setSelectedBooking(null);
                  setNotesInput("");
                }}
                className="flex-1 bg-surface border border-border text-muted hover:text-gray-200 font-bold text-xs py-2.5 rounded-xl active:scale-95 transition-all text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleReject}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-800 text-white font-extrabold text-xs py-2.5 rounded-xl active:scale-95 transition-all shadow-md"
              >
                {submitting ? "Processing..." : "Decline Booking"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
