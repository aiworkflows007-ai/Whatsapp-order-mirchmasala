"use client";

import React, { useState, useEffect } from "react";
import { Clock, User, Phone, MapPin, Hash, Check, X, Flame, Package, Compass, CheckCircle } from "lucide-react";

interface OrderItemData {
  id: string;
  menuItem: {
    name: string;
    isVegetarian: boolean;
  };
  quantity: number;
  price: string | number;
  notes: string | null;
}

interface StatusHistoryData {
  id: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
  note: string | null;
}

interface PaymentAttemptData {
  id: string;
  amount: string | number;
  method: string;
  transactionRef: string | null;
  status: string;
  createdAt: string;
}

export interface OrderData {
  id: string;
  orderNo: string;
  status: string;
  deliveryType: string;
  deliveryAddress: string | null;
  tableNumber: string | null;
  notes: string | null;
  subtotal: string | number;
  tax: string | number;
  totalAmount: string | number;
  paymentStatus: string;
  createdAt: string;
  customer: {
    name: string | null;
    whatsappNumber: string;
  };
  orderItems: OrderItemData[];
  statusHistory: StatusHistoryData[];
  payments?: PaymentAttemptData[];
}

interface OrderCardProps {
  order: OrderData;
  onUpdateStatus: (orderId: string, nextStatus: string, note?: string) => void;
  onPaymentProcessed?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdateStatus, onPaymentProcessed }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentVerify, setShowPaymentVerify] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [verifyNote, setVerifyNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleApprovePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          action: "APPROVE",
          note: verifyNote || "UPI payment approved. Order moved to kitchen queue.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentVerify(false);
        setVerifyNote("");
        if (onPaymentProcessed) {
          onPaymentProcessed();
        }
      } else {
        alert("Failed to approve payment: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!confirm("Are you sure you want to reject this payment attempt?")) {
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          action: "REJECT",
          note: verifyNote || "UPI payment verification failed or rejected.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentVerify(false);
        setVerifyNote("");
        if (onPaymentProcessed) {
          onPaymentProcessed();
        }
      } else {
        alert("Failed to reject payment: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Calculate dynamic minutes elapsed since order creation
  useEffect(() => {
    const calculateElapsed = () => {
      const placedTime = new Date(order.createdAt).getTime();
      const now = new Date().getTime();
      const diffMins = Math.floor((now - placedTime) / 60000);

      if (diffMins < 1) {
        setElapsedTime("Just now");
      } else if (diffMins === 1) {
        setElapsedTime("1 min ago");
      } else {
        setElapsedTime(`${diffMins} mins ago`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Delivery type color badge mapper
  const getDeliveryTypeBadge = () => {
    switch (order.deliveryType) {
      case "DELIVERY":
        return <span className="bg-blue-600/20 text-blue-400 border border-blue-600/40 px-2 py-0.5 rounded-full text-[10px] font-bold">🛵 Delivery</span>;
      case "PICKUP":
        return <span className="bg-amber-600/20 text-amber-400 border border-amber-600/40 px-2 py-0.5 rounded-full text-[10px] font-bold">🥡 Takeaway</span>;
      case "DINE_IN":
        return <span className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/40 px-2 py-0.5 rounded-full text-[10px] font-bold">🍽️ Dine-in (Table {order.tableNumber})</span>;
      default:
        return null;
    }
  };

  // Payment Status indicator badge
  const getPaymentBadge = () => {
    switch (order.paymentStatus) {
      case "PAID":
        return <span className="bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded-lg text-[9px] font-bold">PAID</span>;
      case "PENDING":
        return <span className="bg-red-600/20 text-red-400 px-2 py-0.5 rounded-lg text-[9px] font-bold">UNPAID</span>;
      default:
        return <span className="bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-lg text-[9px] font-bold">{order.paymentStatus}</span>;
    }
  };

  // Strict state machine transitions rendering
  const renderActionButtons = () => {
    const status = order.status;
    const isPendingUpi = order.paymentStatus === "PENDING" && order.notes?.includes("Payment: UPI");

    return (
      <div className="flex gap-2 flex-wrap mt-4 border-t border-border/40 pt-3">
        {isPendingUpi && status === "NEW" ? (
          <button
            onClick={() => setShowPaymentVerify(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 animate-pulse shadow-md transition-all shrink-0 hover-scale"
          >
            📱 Verify UPI Payment
          </button>
        ) : status === "NEW" && (
          <>
            <button
              onClick={() => onUpdateStatus(order.id, "ACCEPTED", "Manager approved.")}
              className="flex-1 min-w-[80px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 hover-scale active:scale-95 transition-all shadow-md"
            >
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, "REJECTED", "Kitchen too busy.")}
              className="flex-1 min-w-[80px] bg-red-700/80 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1 hover-scale active:scale-95 transition-all"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}

        {status === "ACCEPTED" && (
          <button
            onClick={() => onUpdateStatus(order.id, "PREPARING", "Chef started cooking.")}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover-scale active:scale-95 transition-all shadow-md"
          >
            <Flame className="h-3.5 w-3.5 animate-pulse" /> Start Preparing
          </button>
        )}

        {status === "PREPARING" && (
          <button
            onClick={() => onUpdateStatus(order.id, "READY", "Food is ready in hotbox.")}
            className="w-full bg-accent hover:bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover-scale active:scale-95 transition-all shadow-md"
          >
            <Package className="h-3.5 w-3.5" /> Mark Food Ready
          </button>
        )}

        {status === "READY" && (
          <>
            {order.deliveryType === "DELIVERY" ? (
              <button
                onClick={() => onUpdateStatus(order.id, "OUT_FOR_DELIVERY", "Rider dispatched.")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover-scale active:scale-95 transition-all shadow-md"
              >
                <Compass className="h-3.5 w-3.5" /> Ship / Dispatch
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus(order.id, "DELIVERED", "Handed over to customer / Served.")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover-scale active:scale-95 transition-all shadow-md"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Mark Served
              </button>
            )}
          </>
        )}

        {status === "OUT_FOR_DELIVERY" && (
          <button
            onClick={() => onUpdateStatus(order.id, "DELIVERED", "Delivered successfully.")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 hover-scale active:scale-95 transition-all shadow-md"
          >
            <CheckCircle className="h-3.5 w-3.5" /> Mark Delivered
          </button>
        )}

        {/* Support manual cancellations for non-terminal active states by Owner */}
        {status !== "NEW" && status !== "DELIVERED" && status !== "REJECTED" && status !== "CANCELLED" && (
          <button
            onClick={() => {
              const note = prompt("Please enter cancellation reason:");
              if (note) onUpdateStatus(order.id, "CANCELLED", note);
            }}
            className="w-full mt-1.5 text-[10px] font-bold text-red-400/80 hover:text-red-400 hover:underline transition-all text-center py-1 rounded border border-red-500/10 hover:border-red-500/30"
          >
            Cancel Order
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="glass border border-border p-4 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-300 hover:border-primary/30">
      
      {/* Elapsed Timer bar for active orders */}
      {order.status !== "DELIVERED" && order.status !== "REJECTED" && order.status !== "CANCELLED" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20">
          <div className="h-full bg-primary w-2/5 animate-pulse" />
        </div>
      )}

      {/* 1. Header Metadata */}
      <div>
        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
          <h4 className="font-extrabold text-sm text-gray-100 flex items-center gap-1">
            #{order.orderNo}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {elapsedTime}
            </span>
            {getDeliveryTypeBadge()}
          </div>
        </div>

        {/* 2. Customer Details */}
        <div className="space-y-1 text-[11px] text-muted mb-3 bg-surface/40 p-2 rounded-lg border border-border/20">
          <div className="flex items-center gap-1.5 text-gray-200">
            <User className="h-3 w-3 text-primary shrink-0" />
            <span className="font-semibold line-clamp-1">{order.customer.name || "Walk-in"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <span>+{order.customer.whatsappNumber}</span>
          </div>
          {order.deliveryType === "DELIVERY" && order.deliveryAddress && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* 3. Itemized List */}
        <div className="space-y-2 py-1">
          {order.orderItems.map((entry) => (
            <div key={entry.id} className="text-xs flex items-start justify-between border-b border-border/10 pb-1.5 last:border-b-0">
              <div className="flex-1 pr-2">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  <span className="text-[10px] px-1 bg-surface border border-border rounded font-bold">{entry.quantity}x</span>
                  {entry.menuItem.name}
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${entry.menuItem.isVegetarian ? "bg-accent" : "bg-accent-nonveg"}`} />
                </span>
                {entry.notes && (
                  <p className="text-[10px] italic text-primary/80 pl-6 mt-0.5">
                    *Prep note: "{entry.notes}"
                  </p>
                )}
              </div>
              <span className="font-semibold text-gray-200 shrink-0">
                ₹{(Number(entry.price) * entry.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Footer Pricing and Actions */}
      <div className="mt-4">
        {/* Total Price and Payment badge */}
        <div className="flex items-center justify-between text-xs py-2 bg-surface/60 px-3 rounded-xl border border-border/30">
          <div className="flex items-center gap-1.5">
            <span className="text-muted text-[10px] uppercase font-semibold">Total:</span>
            <span className="font-extrabold text-primary text-sm">₹{Number(order.totalAmount).toFixed(2)}</span>
          </div>
          {getPaymentBadge()}
        </div>

        {/* Action transitions buttons */}
        {renderActionButtons()}

        {/* Expanded Audit timeline toggler */}
        <div className="mt-2.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full text-center text-[9px] text-muted hover:text-gray-200 font-semibold uppercase tracking-wider transition-all"
          >
            {showHistory ? "▲ Hide Status History" : "▼ Show Status History"}
          </button>
          
          {showHistory && (
            <div className="mt-2 space-y-1.5 bg-surface/80 p-2 rounded-xl border border-border/50 text-[9px] max-h-[100px] overflow-y-auto pr-1">
              {order.statusHistory.map((hist) => (
                <div key={hist.id} className="border-b border-border/20 pb-1 last:border-b-0">
                  <div className="flex justify-between font-bold text-gray-300">
                    <span>{hist.previousStatus} ➔ {hist.newStatus}</span>
                    <span className="text-muted font-normal text-[8px]">
                      {new Date(hist.changedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-muted mt-0.5 leading-relaxed">
                    By: {hist.changedBy} | Note: "{hist.note || "No comments"}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verification Modal Portal overlay (rendered fixed relative to viewport) */}
      {showPaymentVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111b21] border border-border/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-4 bg-[#202c33]">
              <h3 className="font-extrabold text-sm text-gray-100 flex items-center gap-2">
                📱 Verify UPI Payment
              </h3>
              <button
                onClick={() => setShowPaymentVerify(false)}
                className="text-muted hover:text-gray-200 transition-all p-1 hover:bg-[#2a3942] rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Order Details Banner */}
              <div className="bg-[#202c33] border border-border/30 rounded-2xl p-4 flex flex-col items-center text-center">
                <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">Total Amount Due</span>
                <span className="text-2xl font-extrabold text-primary mt-1">₹{Number(order.totalAmount).toFixed(2)}</span>
                <span className="text-[10px] text-accent font-bold mt-1 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                  Order #{order.orderNo}
                </span>
              </div>

              {/* Customer Information Grid */}
              <div className="bg-surface/40 border border-border/20 rounded-2xl p-3 space-y-2 text-xs text-muted font-sans">
                <div className="flex justify-between border-b border-border/10 pb-1.5">
                  <span className="font-medium">Customer:</span>
                  <span className="font-bold text-gray-200">{order.customer.name || "Walk-in"}</span>
                </div>
                <div className="flex justify-between border-b border-border/10 pb-1.5">
                  <span className="font-medium">WhatsApp Mobile:</span>
                  <span className="font-bold text-gray-200">+{order.customer.whatsappNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Type:</span>
                  <span className="font-bold text-emerald-400">UPI deep-link QR</span>
                </div>
              </div>

              {/* Submitted UTR Reference */}
              <div className="bg-[#182229] border border-amber-500/20 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-extrabold block">Customer Submitted UTR / Ref</span>
                <span className="text-lg font-mono font-extrabold text-gray-100 block mt-1 tracking-wider">
                  {order.payments && order.payments.length > 0
                    ? order.payments[order.payments.length - 1].transactionRef || "NO UTR SUBMITTED"
                    : "NO UTR SUBMITTED"}
                </span>
              </div>

              {/* Custom staff notes input */}
              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold tracking-wider">Internal Note / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Verified via Bank SMS / Merchant Statement"
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  className="w-full bg-[#202c33] border border-border/80 hover:border-primary/40 focus:border-primary rounded-xl px-3 py-2 text-xs text-gray-200 font-medium outline-none transition-all shadow-inner"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-[#202c33]/50 border-t border-border/40 p-4 flex gap-3">
              <button
                onClick={handleRejectPayment}
                disabled={processing}
                className="flex-1 bg-red-700/80 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <X className="h-4 w-4" /> Reject Payment
              </button>
              <button
                onClick={handleApprovePayment}
                disabled={processing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Check className="h-4 w-4" /> Confirm Received
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
