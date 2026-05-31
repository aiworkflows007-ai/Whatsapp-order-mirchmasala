"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, CreditCard, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";

function SandboxContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const orderNo = searchParams.get("orderNo") || "MM-1024";
  const amount = searchParams.get("amount") || "299.00";
  const name = searchParams.get("name") || "Valued Customer";
  const linkId = searchParams.get("linkId") || "plink_" + Math.random().toString(36).substring(2, 10);

  const [paymentStatus, setPaymentStatus] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [simulatedPayId, setSimulatedPayId] = useState("");

  // Card details mock state
  const [cardNumber, setCardNumber] = useState("4319 4920 1820 9024");
  const [expiry, setExpiry] = useState("12/29");
  const [cvv, setCvv] = useState("721");

  const triggerWebhook = async (status: "SUCCESS" | "FAILED") => {
    setPaymentStatus("loading");
    setErrorMessage("");

    try {
      const payId = "pay_mock_" + Math.random().toString(36).substring(2, 9).toUpperCase();
      setSimulatedPayId(payId);

      const webhookPayload = {
        event: status === "SUCCESS" ? "payment.captured" : "payment.failed",
        payload: {
          payment: {
            entity: {
              id: payId,
              amount: Math.round(Number(amount) * 100), // in paise
              currency: "INR",
              status: status === "SUCCESS" ? "captured" : "failed",
              payment_link_id: linkId,
              method: "card",
              description: `Payment for Order #${orderNo}`
            }
          }
        }
      };

      // POST directly to our Razorpay Webhook endpoint with our secure sandbox bypass signature
      const res = await fetch("/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": "sandbox_verification_signature",
        },
        body: JSON.stringify(webhookPayload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPaymentStatus(status === "SUCCESS" ? "success" : "failed");
      } else {
        setPaymentStatus("failed");
        setErrorMessage(data.error || "Webhook dispatch failed.");
      }
    } catch (err: any) {
      setPaymentStatus("failed");
      setErrorMessage(err.message || "Network error occurred.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090e11] text-gray-200 font-sans flex items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] h-[70vw] w-[70vw] bg-[#3399cc]/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] h-[70vw] w-[70vw] bg-primary/5 rounded-full filter blur-[120px] pointer-events-none" />

      {paymentStatus === "idle" && (
        <div className="w-full max-w-md bg-[#121c21] border border-border/60 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-300">
          
          {/* Header Branding */}
          <div className="bg-[#202c33] p-5 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3399cc] animate-ping" />
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#3399cc] bg-[#3399cc]/10 px-2.5 py-1 rounded-full border border-[#3399cc]/20">
                Razorpay Sandbox
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-gray-100">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Mirch Masala</span>
            </div>
          </div>

          {/* Amount Panel */}
          <div className="p-6 bg-[#182229]/60 border-b border-border/30 text-center flex flex-col items-center">
            <span className="text-xs text-muted font-medium">Payment Requested By Merchant</span>
            <span className="text-3xl font-black text-gray-100 mt-1.5 flex items-start gap-1">
              <span className="text-lg font-bold mt-1 text-[#3399cc]">₹</span>
              {Number(amount).toFixed(2)}
            </span>
            <div className="mt-2.5 flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-[#202c33] px-3 py-1 rounded-full border border-border/20">
              <span>Order No: #{orderNo}</span>
              <span className="h-1 w-1 bg-gray-500 rounded-full" />
              <span>Customer: {name}</span>
            </div>
          </div>

          {/* Mock Checkout Options Form */}
          <div className="p-6 space-y-5">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Mock Payment details</span>
            
            <div className="bg-[#182229]/80 border border-border/50 rounded-2xl p-4 space-y-4 shadow-inner">
              <div className="flex items-center gap-3 border-b border-border/20 pb-3">
                <CreditCard className="h-5 w-5 text-[#3399cc]" />
                <span className="text-xs font-bold text-gray-200">Pay securely using Cards</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-bold text-muted tracking-wider">Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#202c33] border border-border rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono tracking-wider outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-muted tracking-wider">Expiry Date</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-[#202c33] border border-border rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono outline-none text-center"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-bold text-muted tracking-wider">CVV Code</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full bg-[#202c33] border border-border rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono outline-none text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted font-semibold mt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Razorpay 256-bit SSL encrypted security</span>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="bg-[#202c33]/40 p-5 border-t border-border/40 flex gap-4">
            <button
              onClick={() => triggerWebhook("FAILED")}
              className="flex-1 border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all duration-300"
            >
              Simulate Failure
            </button>
            <button
              onClick={() => triggerWebhook("SUCCESS")}
              className="flex-1 bg-[#3399cc] hover:bg-[#257ba6] text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 hover-scale shadow-lg shadow-[#3399cc]/20 transition-all duration-300"
            >
              Simulate Success <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}

      {paymentStatus === "loading" && (
        <div className="w-full max-w-sm bg-[#121c21] border border-border/60 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-95 duration-200">
          <Loader2 className="h-10 w-10 text-[#3399cc] animate-spin mb-4" />
          <h3 className="font-extrabold text-sm text-gray-100 uppercase tracking-wide">Processing Sandbox Transaction</h3>
          <p className="text-xs text-muted mt-1.5 max-w-[240px]">
            Firing simulated signature-verified webhook to your ordering server...
          </p>
        </div>
      )}

      {paymentStatus === "success" && (
        <div className="w-full max-w-sm bg-[#121c21] border border-emerald-500/30 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-95 duration-200">
          <CheckCircle className="h-14 w-14 text-emerald-500 mb-4 animate-bounce" />
          <h3 className="font-black text-base text-gray-100">🎉 Simulated Payment Completed!</h3>
          <p className="text-xs text-muted mt-2 max-w-[280px]">
            Webhook fired successfully. Razorpay payment ID: <span className="font-mono text-emerald-400 font-bold">{simulatedPayId}</span>
          </p>
          <div className="bg-[#182229]/80 border border-emerald-500/20 rounded-2xl p-3.5 w-full mt-5 text-[11px] text-gray-300 leading-relaxed font-sans shadow-inner">
            🟢 **Server status updated!** The order is now accepted. You can safely close this browser tab and return to the chat simulator.
          </div>
          <button
            onClick={() => window.close()}
            className="w-full mt-6 bg-[#202c33] hover:bg-[#2a3942] border border-border/80 text-xs font-bold py-2.5 rounded-xl transition-all"
          >
            Close Tab
          </button>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="w-full max-w-sm bg-[#121c21] border border-red-500/30 rounded-3xl p-8 text-center flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-95 duration-200">
          <XCircle className="h-14 w-14 text-red-400 mb-4 animate-bounce" />
          <h3 className="font-black text-base text-gray-100">❌ Simulated Payment Failed</h3>
          <p className="text-xs text-muted mt-2 max-w-[280px]">
            Status: {errorMessage || "Payment declined by issuing bank."}
          </p>
          <div className="bg-[#182229]/80 border border-red-500/20 rounded-2xl p-3.5 w-full mt-5 text-[11px] text-gray-300 leading-relaxed font-sans shadow-inner">
            🔴 **Payment failure logged.** The order status remains pending. Return to the chat to retry or choose another payment method.
          </div>
          <button
            onClick={() => setPaymentStatus("idle")}
            className="w-full mt-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold py-2.5 rounded-xl transition-all"
          >
            Try Again
          </button>
        </div>
      )}

    </div>
  );
}

export default function RazorpaySandboxPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Sandbox disabled</h1>
          <p className="text-sm text-slate-400">Test payment tools are not available in production.</p>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#090e11] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-[#3399cc] animate-spin" />
        <span className="text-xs text-muted">Loading Secure Gateway Panel...</span>
      </div>
    }>
      <SandboxContent />
    </Suspense>
  );
}
