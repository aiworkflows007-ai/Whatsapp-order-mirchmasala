"use client";

import React, { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { Clock, User, ChefHat, Play, CheckCircle } from "lucide-react";
import { OrderData } from "@/components/admin/OrderCard";

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all orders from backend database
  const fetchOrders = async (isFirstLoad = false) => {
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        // Filter ONLY active kitchen orders: ACCEPTED or PREPARING
        const kitchenTickets = data.orders.filter((o: any) =>
          ["ACCEPTED", "PREPARING"].includes(o.status)
        );
        setOrders(kitchenTickets);
      }
    } catch (err) {
      console.error("Failed to load kitchen tickets", err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  // Live poll kitchen tickets every 4 seconds
  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 4000);
    return () => clearInterval(interval);
  }, []);

  // Update order status from kitchen
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newStatus: nextStatus,
          changedBy: "Chef Sanjay (Kitchen)",
          note: nextStatus === "PREPARING" ? "Kitchen started cooking." : "Food is ready in hotbox.",
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Optimistically remove/update from active display
        setOrders((prev) => prev.filter((o) => o.id !== orderId || nextStatus === "PREPARING"));
        fetchOrders(false);
      } else {
        alert(`Failed to update kitchen ticket: ${data.error}`);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading Chef cooking screens...</span>
      </div>
    );
  }

  // Calculate quick metrics for the header
  const activeOrdersCount = orders.length;

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden select-none">
      {/* Premium header with empty indicators */}
      <DashboardHeader totalOrders={0} activeOrders={activeOrdersCount} todayRevenue={0} />

      {/* Main Chef Tickets Panel */}
      <div className="flex-1 p-6 bg-[#0b141a] overflow-y-auto">
        <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
          <ChefHat className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-gray-200 uppercase tracking-wide">
            Active Chef Cooking Tickets ({orders.length})
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="h-[70vh] flex flex-col items-center justify-center text-center p-12 glass border border-border/30 rounded-3xl max-w-lg mx-auto">
            <span className="text-[50px] animate-bounce mb-3">👨‍🍳</span>
            <h3 className="text-lg font-extrabold text-gray-200">Wow, Kitchen is completely cleared!</h3>
            <p className="text-muted text-xs mt-1 max-w-[280px]">
              No active orders to cook right now. Chef can rest or prepare ingredients!
            </p>
          </div>
        ) : (
          /* Cooking Tickets Responsive Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((ticket) => {
              const isCooking = ticket.status === "PREPARING";

              return (
                <div
                  key={ticket.id}
                  className={`glass rounded-3xl overflow-hidden border p-4 flex flex-col justify-between shadow-lg relative min-h-[320px] transition-all duration-300 ${
                    isCooking ? "border-primary/60" : "border-border"
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isCooking ? "bg-primary animate-pulse" : "bg-[#2a3942]"
                    }`}
                  />

                  {/* Header info */}
                  <div>
                    <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                      <span className="text-lg font-extrabold text-gray-100">
                        #{ticket.orderNo}
                      </span>
                      <span className="bg-surface border border-border px-2 py-0.5 rounded-full text-[9px] font-bold text-muted flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ticket.deliveryType}
                      </span>
                    </div>

                    {/* Customer & Notes */}
                    <div className="text-[11px] text-muted space-y-1 mb-3 bg-surface/30 p-2 rounded-xl border border-border/20">
                      <div className="flex items-center justify-between text-gray-200">
                        <span className="font-bold">{ticket.customer.name || "Customer"}</span>
                        {ticket.deliveryType === "DINE_IN" && (
                          <span className="text-[10px] text-accent font-bold">Table #{ticket.tableNumber}</span>
                        )}
                      </div>
                      {ticket.notes && (
                        <p className="text-[10px] text-amber-400 italic mt-1 font-medium">
                          *Staff Note: "{ticket.notes}"
                        </p>
                      )}
                    </div>

                    {/* Food Items Breakdown (Chef focus!) */}
                    <div className="space-y-3 py-1">
                      {ticket.orderItems.map((entry) => (
                        <div key={entry.id} className="border-b border-border/10 pb-2 last:border-0">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-extrabold text-gray-100 flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-[#202c33] border border-[#2f3b43] text-primary rounded-lg font-extrabold text-sm">
                                {entry.quantity}x
                              </span>
                              {entry.menuItem.name}
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  entry.menuItem.isVegetarian ? "bg-accent" : "bg-accent-nonveg"
                                }`}
                              />
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs font-bold text-primary italic pl-8 mt-1">
                              👉 PREP NOTE: "{entry.notes}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kitchen Action Buttons */}
                  <div className="mt-4">
                    {isCooking ? (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, "READY")}
                        className="w-full bg-accent hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 hover-scale active:scale-95 shadow-md transition-all duration-300"
                      >
                        <CheckCircle className="h-4 w-4" /> ✅ Mark Food Ready
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, "PREPARING")}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 hover-scale active:scale-95 shadow-md transition-all duration-300"
                      >
                        <Play className="h-4 w-4 animate-pulse" /> 🔥 Start Preparing
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
