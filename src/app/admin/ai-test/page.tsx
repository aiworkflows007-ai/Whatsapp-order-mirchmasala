"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Bot, RefreshCw, ShoppingCart, User, MapPin, Calendar, HelpCircle, ShieldAlert, Sparkles, MessageSquare } from "lucide-react";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  actions?: string[];
  handoff?: boolean;
}

export default function AITestPlayground() {
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState("919999999999");
  const [profileName, setProfileName] = useState("Ashok Kumar");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "session">("chat");

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: "Namaste! Main Chef Sanjay hoon, aapka digital host. Humare Mirch Masala Restaurant AI engine test me aapka swagat hai! 👨‍🍳🍲 Niche quick buttons click karke ya text message bhejkar test shuru karein.",
      timestamp: new Date(),
    }
  ]);

  const [sessionState, setSessionState] = useState<any>({
    state: "START",
    customerName: "Ashok Kumar",
    currentCart: {},
    address: "Not Provided",
    orderType: "UNKNOWN",
  });

  const [cartSummary, setCartSummary] = useState<any>({
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchSessionStatus = async () => {
    try {
      // Run an empty or default message to trigger session fetch without modifying data
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          profileName,
          message: "cart", // deterministically returns cart status
        }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionState(data.session);
        // Recalculate cart
        const cartItems = Object.entries(data.session.currentCart || {}).map(([id, qty]) => ({
          id,
          quantity: qty,
        }));
        setCartSummary({
          items: cartItems,
          total: cartItems.length * 250, // mock view total for playground display
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSessionStatus();
  }, [phone]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    setLoading(true);
    setInputText("");

    // Add user message to history
    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };
    setChatHistory((prev) => [...prev, userMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          profileName,
          message: textToSend,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.reply,
            timestamp: new Date(),
            actions: data.actions,
            handoff: data.handoff,
          },
        ]);
        if (data.session) {
          setSessionState(data.session);
        }
      } else {
        setChatHistory((prev) => [
          ...prev,
          {
            sender: "ai",
            text: `⚠️ Error: ${data.error || "Failed to contact AI provider."}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `❌ Failure: ${err.message || "Failed to make HTTP request."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearTestCart = async () => {
    setLoading(true);
    try {
      await handleSendMessage("clear cart");
    } finally {
      setLoading(false);
    }
  };

  const quickTests = [
    { label: "👋 Hi / Namaste", text: "Namaste Chef!" },
    { label: "🍽️ Show Menu", text: "menu dikhao" },
    { label: "🌶️ Ask for Paneer", text: "Paneer me kya best hai?" },
    { label: "➕ Add 1 Paneer", text: "1 Paneer Tikka Masala add karo" },
    { label: "➕ Add 2 Butter Naan", text: "2 Butter Naan add karo" },
    { label: "🛵 Home Delivery", text: "Delivery chahiye" },
    { label: "📍 Set Address", text: "My address is Patna, near Station" },
    { label: "🛒 Checkout Cart", text: "checkout my cart" },
    { label: "📅 Reserve Table", text: "Reserve a table for 4 guests tomorrow night" },
    { label: "🙋 Talk to Human", text: "human staff se baat karwao" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">
                Chef Sanjay AI Playground <Sparkles className="h-4 w-4 text-amber-400" />
              </h1>
              <p className="text-xs text-slate-400">Validate conversational flows, tool executions, and state transitions</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Test Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500 w-36 font-mono"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Profile Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-amber-500 w-36"
              />
            </div>
            <button
              onClick={fetchSessionStatus}
              className="mt-4 p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 rounded-lg"
              title="Refresh database session"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col overflow-hidden">
        {/* Mobile View Switcher */}
        <div className="flex lg:hidden bg-slate-900 border border-slate-800 p-1.5 rounded-xl shrink-0 gap-1.5 mb-4 select-none">
          <button
            type="button"
            onClick={() => setMobileTab("chat")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              mobileTab === "chat" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 font-medium"
            }`}
          >
            💬 Interactive Chat
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("session")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              mobileTab === "session" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 font-medium"
            }`}
          >
            👤 Session Context & Cart
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {/* LEFT COLUMN: ACTIVE SESSION STATE VISUALIZER */}
          <div className={`lg:col-span-4 flex flex-col gap-6 ${mobileTab === "session" ? "flex" : "hidden lg:flex"}`}>
          {/* SESSION METRICS */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-4">
              <User className="h-4 w-4" /> Session Context
            </h2>
            
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Customer Name</span>
                <span className="font-semibold text-slate-200">{sessionState.customerName || "None"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Active State</span>
                <span className="px-2 py-0.5 bg-rose-950/40 text-rose-400 rounded-full text-xs font-mono border border-rose-900/30">
                  {sessionState.state}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Order Type</span>
                <span className="font-semibold text-amber-400">{sessionState.orderType || "UNKNOWN"}</span>
              </div>
              <div className="flex flex-col border-b border-slate-800/60 pb-2 gap-1">
                <span className="text-slate-400">Delivery Address</span>
                <span className="text-slate-300 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/40 text-xs break-all">
                  {sessionState.address || "Not Provided"}
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-400">Human Handoff Request</span>
                <span className={sessionState.handoffRequested ? "text-rose-500 font-bold flex items-center gap-1" : "text-emerald-500 font-semibold"}>
                  {sessionState.handoffRequested ? "🔴 ACTIVE" : "🟢 INACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE CART SUMMARY */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Database Cart Basket
              </h2>
              <button
                onClick={clearTestCart}
                className="text-[10px] uppercase font-bold text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear Cart
              </button>
            </div>

            {Object.keys(sessionState.currentCart || {}).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 py-8">
                <ShoppingCart className="h-10 w-10 text-slate-700" />
                <p className="text-sm">No items in database cart basket</p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                {Object.entries(sessionState.currentCart || {}).map(([itemId, quantity]: any) => (
                  <div key={itemId} className="flex justify-between items-center bg-slate-950/50 border border-slate-800/50 p-3 rounded-xl">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">ID: {itemId.slice(-8)}</h4>
                      <p className="text-[10px] text-slate-400">Database Menu item linked context</p>
                    </div>
                    <span className="bg-rose-500/10 text-rose-400 px-3 py-1 rounded-lg text-xs font-bold border border-rose-500/20">
                      x{quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE INTERACTIVE CHAT SCREEN */}
        <div className={`lg:col-span-8 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl h-[calc(100vh-160px)] lg:h-[calc(100vh-140px)] ${
          mobileTab === "chat" ? "flex" : "hidden lg:flex"
        }`}>
          {/* CHAT DISPLAY PANEL */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 min-h-0 bg-slate-950/40">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.sender === "user" ? "bg-amber-600 text-white" : "bg-gradient-to-tr from-amber-500 to-rose-600 text-white"
                }`}>
                  {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-slate-800 text-slate-100 rounded-tr-none" 
                      : "bg-slate-900 text-slate-200 border border-slate-800/80 rounded-tl-none"
                  }`}>
                    {msg.text}

                    {/* AI Actions display */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1.5">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Executed Backend System Actions:</p>
                        {msg.actions.map((act, aIdx) => (
                          <div key={aIdx} className="text-[11px] font-mono text-emerald-400 bg-slate-950/65 px-2 py-0.5 rounded border border-emerald-950/50 flex items-center gap-1.5">
                            ✔️ {act}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Handoff warning display */}
                    {msg.handoff && (
                      <div className="mt-3 bg-rose-950/30 border border-rose-900/50 p-2 rounded-lg flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-500 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-rose-500 uppercase tracking-wide">Human Handover Triggered</h5>
                          <p className="text-[10px] text-slate-300">The agent detected a support, pricing, or refund escalation intent and requested staff takeover.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 px-1 self-start font-mono">
                    {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "..."}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* QUICK PRE-SET SCENARIO BUTTONS */}
          <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Quick Pre-set Test Scenarios
            </h3>
            <div className="flex flex-wrap gap-2">
              {quickTests.map((test, index) => (
                <button
                  key={index}
                  disabled={loading}
                  onClick={() => handleSendMessage(test.text)}
                  className="bg-slate-900 hover:bg-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:hover:bg-slate-900 text-xs px-3 py-1.5 rounded-lg text-slate-300 border border-slate-800 transition-all font-medium active:scale-95"
                >
                  {test.label}
                </button>
              ))}
            </div>
          </div>

          {/* INPUT FORM PANEL */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send message to Chef Sanjay AI..."
              disabled={loading}
              className="flex-grow bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 text-slate-200 placeholder-slate-500 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-950/20 disabled:opacity-40 disabled:active:scale-100"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
