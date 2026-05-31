"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { OrderCard, OrderData } from "@/components/admin/OrderCard";

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split("T")[0];
  });
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const prevOrdersRef = useRef<OrderData[]>([]);

  // TTS Narrator Announcer (speech synthesis)
  const speakStatus = (text: string) => {
    try {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel(); // clear previous announcement
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("en-IN"));
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS Failed:", e);
    }
  };

  // Play audio bell chime for new orders
  const playNewOrderChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Dual-tone high fidelity chime
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.type = "sine";
      osc1.frequency.value = 660; // E5
      
      osc2.type = "sine";
      osc2.frequency.value = 880; // A5
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      osc1.start();
      osc2.start();
      
      osc1.stop(audioCtx.currentTime + 0.5);
      osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log("Audio play blocked by browser autoplay policy.");
    }
  };

  // Fetch all orders from backend database
  const fetchOrders = async (isFirstLoad = false) => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        // Compare with previous orders list to trigger voice alerts
        if (!isFirstLoad && prevOrdersRef.current.length > 0 && narratorEnabled) {
          data.orders.forEach((newOrder: OrderData) => {
            const oldOrder = prevOrdersRef.current.find((o) => o.id === newOrder.id);
            if (!oldOrder) {
              // 1. New Order
              speakStatus(`New order aaya hai! Order number ${newOrder.orderNo}`);
            } else if (oldOrder.status !== newOrder.status) {
              // Status changed transition!
              const dishNames = newOrder.orderItems
                .map((oi) => oi.menuItem?.name || "")
                .filter(Boolean)
                .join(", ");

              if (newOrder.status === "PREPARING") {
                speakStatus(`Kitchen me ban raha hai, ${dishNames}`);
              } else if (newOrder.status === "READY") {
                speakStatus(`Ban gaya, ${dishNames}! Delivery ke liye taiyar.`);
              } else if (newOrder.status === "OUT_FOR_DELIVERY") {
                speakStatus(`Order number ${newOrder.orderNo}, delivery ke liye nikal chuka hai.`);
              } else if (newOrder.status === "DELIVERED") {
                speakStatus(`Ho gaya deliver! Order number ${newOrder.orderNo}.`);
              }
            }
          });
        }

        // Keep local ref updated for subsequent fetches
        prevOrdersRef.current = data.orders;

        setOrders(data.orders);
        
        // Count how many orders are currently NEW
        const activeNew = data.orders.filter((o: any) => o.status === "NEW").length;
        
        // If count has increased since last check, play the new order sound alert!
        if (!isFirstLoad && activeNew > newOrderCount) {
          playNewOrderChime();
        }
        
        setNewOrderCount(activeNew);
      }
    } catch (err) {
      console.error("Failed to load admin orders", err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  // Live poll orders every 4 seconds
  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 4000);
    return () => clearInterval(interval);
  }, [newOrderCount]);

  // Handle status update triggers
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string, note?: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newStatus: nextStatus,
          changedBy: "Ashok (Owner)",
          note,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Optimistically update state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: nextStatus } : o
          )
        );
        fetchOrders(false); // Refresh
      } else {
        alert(`Failed to update: ${data.error}`);
      }
    } catch (err: any) {
      alert("Error updating order status: " + err.message);
    }
  };

  // 1. Calculate live statistics
  const activeOrders = orders.filter((o) => 
    ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status)
  ).length;

  const totalOrdersCount = orders.length;

  // Calculate total revenue from DELIVERED orders
  const todayRevenue = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  // Calculate selected date specific metrics for analytics panel
  const dateOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
    return orderDate === selectedDate;
  });

  const dateRevenue = dateOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const dateOrdersCount = dateOrders.length;
  const dateAov = dateOrdersCount > 0 ? dateRevenue / dateOrdersCount : 0;

  const getItemSalesOnDate = () => {
    const counts: Record<string, { name: string; qty: number }> = {};
    dateOrders.forEach((o) => {
      o.orderItems?.forEach((oi: any) => {
        const item = oi.menuItem;
        if (item) {
          if (!counts[item.id]) {
            counts[item.id] = { name: item.name, qty: 0 };
          }
          counts[item.id].qty += oi.quantity;
        }
      });
    });

    let bestItem = "None";
    let maxQty = 0;
    Object.keys(counts).forEach((id) => {
      if (counts[id].qty > maxQty) {
        maxQty = counts[id].qty;
        bestItem = `${counts[id].name} (x${counts[id].qty})`;
      }
    });

    return { bestItem };
  };

  const { bestItem } = getItemSalesOnDate();

  // 2. Group orders by status columns
  const newOrders = orders.filter((o) => o.status === "NEW");
  const preparingOrders = orders.filter((o) => ["ACCEPTED", "PREPARING"].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === "READY");
  const shippedOrders = orders.filter((o) => o.status === "OUT_FOR_DELIVERY");
  const completedOrders = orders.filter((o) => o.status === "DELIVERED");
  const cancelledOrders = orders.filter((o) => ["REJECTED", "CANCELLED"].includes(o.status));

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading Mirch Masala Kitchen Systems...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden select-none">
      {/* Premium Header */}
      <DashboardHeader
        totalOrders={totalOrdersCount}
        activeOrders={activeOrders}
        todayRevenue={todayRevenue}
      />

      {/* Date-Specific Analytics Control Deck */}
      <div className="bg-[#111b21] border-b border-border/60 px-3 py-3 sm:px-4 lg:px-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shrink-0 shadow-md">
        
        {/* Left Side: Date selection & Voice Narrator */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-muted uppercase tracking-wider font-extrabold whitespace-nowrap">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="bg-[#202c33] border border-border/80 hover:border-primary/60 rounded-lg px-3 py-2 text-xs text-gray-200 font-bold outline-none cursor-pointer transition-all shadow-inner"
            />
          </div>

          {/* Saffron/Masala themed active-voice Narrator toggle */}
          <button
            onClick={() => {
              const nextVal = !narratorEnabled;
              setNarratorEnabled(nextVal);
              if (nextVal) {
                speakStatus("Voice narrator active!");
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase tracking-wider font-extrabold transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95 hover-scale ${
              narratorEnabled
                ? "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
                : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {narratorEnabled ? "🔊 Narrator: Active" : "🔇 Narrator: Muted"}
          </button>
        </div>

        {/* Right Side: Performance stats on chosen date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:max-w-[700px] w-full lg:w-auto select-text">
          <div className="rounded-lg bg-[#202c33]/60 border border-border/50 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Orders</span>
            <span className="text-sm font-extrabold text-primary">{dateOrdersCount} orders</span>
          </div>
          <div className="rounded-lg bg-[#202c33]/60 border border-border/50 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Earnings</span>
            <span className="text-sm font-extrabold text-accent">₹{dateRevenue.toFixed(0)}</span>
          </div>
          <div className="rounded-lg bg-[#202c33]/60 border border-border/50 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">AOV</span>
            <span className="text-sm font-extrabold text-gray-200">₹{dateAov.toFixed(0)}</span>
          </div>
          <div className="rounded-lg bg-[#202c33]/60 border border-border/50 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Bestseller</span>
            <span className="text-sm font-extrabold text-emerald-400 truncate" title={bestItem}>{bestItem}</span>
          </div>
        </div>

      </div>

      {/* Six-Column Kanban Grid */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 bg-[#0b141a] scroll-smooth md:snap-none snap-x snap-mandatory">
        
        {/* COLUMN 1: NEW */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-red-500/80 pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              🔴 New Orders 
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-md font-bold text-xs">
                {newOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {newOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No new orders in queue.</div>
            ) : (
              newOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-primary pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              🔥 In Kitchen 
              <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded-md font-bold text-xs">
                {preparingOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {preparingOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">Kitchen is currently empty.</div>
            ) : (
              preparingOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-accent pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              📦 Ready for Dispatch
              <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded-md font-bold text-xs">
                {readyOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {readyOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No orders awaiting dispatch.</div>
            ) : (
              readyOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 4: SHIPPED */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-blue-500 pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              🛵 Out for Delivery
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-bold text-xs">
                {shippedOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {shippedOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No active deliveries on road.</div>
            ) : (
              shippedOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 5: COMPLETED */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              🎉 Delivered / Served
              <span className="px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 rounded-md font-bold text-xs">
                {completedOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {completedOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No completed orders today yet.</div>
            ) : (
              completedOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 6: CANCELLED */}
        <div className="flex flex-col w-[85vw] sm:w-[300px] md:w-[320px] shrink-0 h-full snap-center">
          <div className="flex items-center justify-between border-b-2 border-muted pb-2 mb-4 shrink-0">
            <h3 className="font-extrabold text-sm text-gray-200 tracking-wide uppercase flex items-center gap-2">
              ❌ Rejected / Cancelled
              <span className="px-1.5 py-0.5 bg-muted/20 text-muted rounded-md font-bold text-xs">
                {cancelledOrders.length}
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {cancelledOrders.length === 0 ? (
              <div className="text-muted text-[11px] italic p-4 text-center glass rounded-xl border border-border/20">No cancelled tickets.</div>
            ) : (
              cancelledOrders.map((o) => (
                <OrderCard key={o.id} order={o} onUpdateStatus={handleUpdateOrderStatus} onPaymentProcessed={() => fetchOrders(false)} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
