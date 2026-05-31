"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, ShieldAlert, Sparkles, User, RefreshCw, Bot, Check, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";

interface Conversation {
  id: string;
  phone: string;
  customerName: string;
  state: string;
  itemCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  customerNumber: string;
  direction: "INBOUND" | "OUTBOUND";
  messageType: string;
  content: string;
  createdAt: string;
}

export default function SupportInbox() {
  const [mounted, setMounted] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll conversations every 3 seconds
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/admin/chat/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        // Sync selected conversation status if active
        if (selectedPhone) {
          const matched = data.conversations.find((c: Conversation) => c.phone === selectedPhone);
          if (matched) setActiveConv(matched);
        }
      }
    } catch (e) {
      console.error("Failed to poll conversations:", e);
    }
  };

  // Poll chat transcript messages every 3 seconds for active selected customer
  const fetchMessages = async (phone: string) => {
    try {
      const res = await fetch(`/api/admin/chat/messages?phone=${phone}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error("Failed to poll messages:", e);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [selectedPhone]);

  useEffect(() => {
    if (selectedPhone) {
      fetchMessages(selectedPhone);
      const interval = setInterval(() => fetchMessages(selectedPhone), 3000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setSelectedPhone(conv.phone);
    setActiveConv(conv);
    setReplyText("");
    fetchMessages(conv.phone);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !replyText.trim() || sendLoading) return;

    setSendLoading(true);
    const bodyText = replyText;
    setReplyText("");

    try {
      const res = await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone, message: bodyText }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistic refresh
        await fetchMessages(selectedPhone);
        await fetchConversations();
      } else {
        alert(`Failed to send message: ${data.error}`);
      }
    } catch (err) {
      alert("HTTP Error sending reply.");
    } finally {
      setSendLoading(false);
    }
  };

  const handleTakeover = async () => {
    if (!selectedPhone || loading) return;
    setLoading(true);
    try {
      // Sending an empty taking message or manual command to transition state
      const res = await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedPhone,
          message: "👋 [Support Takeover Alert]: Staff member has entered the chat. AI is now muted.",
        }),
      });
      if (res.ok) {
        await fetchConversations();
        await fetchMessages(selectedPhone);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseToAI = async () => {
    if (!selectedPhone || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/chat/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selectedPhone }),
      });
      if (res.ok) {
        await fetchConversations();
        await fetchMessages(selectedPhone);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">
                Operations Takeover Support Inbox
              </h1>
              <p className="text-xs text-slate-400">Live conversation routing desk & AI handoff command center</p>
            </div>
          </div>
          <button
            onClick={fetchConversations}
            className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 rounded-lg flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className="h-4 w-4" /> Refresh Active Chats
          </button>
        </div>
      </header>

      {/* CORE SPLIT WORKSPACE */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 flex gap-6 overflow-hidden h-[calc(100vh-100px)]">
        {/* LEFT PANEL: ACTIVE CONVERSATION LIST */}
        <div className={`w-full md:w-80 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm shadow-xl flex flex-col shrink-0 ${selectedPhone ? "hidden md:flex" : "flex"}`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-4 flex items-center gap-1.5">
            Active Chats ({conversations.length})
          </h2>

          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {conversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8 text-center">
                <Bot className="h-8 w-8 text-slate-700 animate-bounce" />
                <p className="text-xs">No active chats in database</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isHandoff = conv.state === "HANDOFF";
                const isSelected = selectedPhone === conv.phone;
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 active:scale-[0.98] ${
                      isSelected 
                        ? "bg-gradient-to-r from-amber-500/10 to-rose-600/10 border-rose-500/40 text-slate-100" 
                        : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-950/80 text-slate-300"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-semibold tracking-wide font-mono text-slate-200">
                        {conv.phone}
                      </span>
                      {isHandoff ? (
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" title="Handoff Active" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Chef Sanjay Active" />
                      )}
                    </div>

                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-[11px] font-bold text-slate-400 truncate max-w-28">{conv.customerName}</span>
                      
                      {isHandoff ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[9px] font-bold border border-rose-500/25">
                          TAKEOVER
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-bold border border-amber-500/25">
                          {conv.state}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT WINDOW TRANSCRIPT */}
        <div className={`flex-grow bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[calc(100vh-140px)] ${selectedPhone ? "flex" : "hidden md:flex"}`}>
          {selectedPhone ? (
            <>
              {/* CHAT WINDOW STATE ACTIONS BAR */}
              <div className="bg-slate-900/80 border-b border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {/* MOBILE BACK BUTTON */}
                  <button 
                    onClick={() => setSelectedPhone(null)} 
                    className="md:hidden p-1 mr-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Back to inbox list"
                  >
                    ⬅️
                  </button>
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{activeConv?.customerName}</h3>
                    <p className="text-[10px] text-slate-400 font-mono tracking-wider">Number: {selectedPhone}</p>
                  </div>
                </div>

                {/* State Command Action Toggles */}
                {activeConv?.state === "HANDOFF" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 animate-pulse" /> Takeover Locked (AI Muted)
                    </span>
                    <button
                      onClick={handleReleaseToAI}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all border border-emerald-500/40"
                    >
                      <Bot className="h-3.5 w-3.5" /> Release to AI Chef
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="h-4 w-4" /> Chef Sanjay Handling Chat
                    </span>
                    <button
                      onClick={handleTakeover}
                      disabled={loading}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-900/50 disabled:opacity-50 font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" /> Take Over Chat
                    </button>
                  </div>
                )}
              </div>

              {/* MESSAGE BALLOONS TRANSCRIPT */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/40">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8">
                    <MessageSquare className="h-10 w-10 text-slate-700" />
                    <p className="text-sm">Log transcript is loading...</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.direction === "OUTBOUND";
                    return (
                      <div key={msg.id} className={`flex gap-3 max-w-[80%] ${isStaff ? "ml-auto flex-row-reverse" : ""}`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isStaff ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-300"
                        }`}>
                          {isStaff ? <UserCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                            isStaff 
                              ? "bg-gradient-to-r from-amber-500/10 to-rose-600/10 border border-rose-500/20 text-slate-100 rounded-tr-none" 
                              : "bg-slate-900 border border-slate-800/80 text-slate-200 rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                          <span className={`text-[9px] text-slate-500 font-mono px-1 self-start ${isStaff ? "self-end" : ""}`}>
                            {mounted ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "..."}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* REPLY FORM INPUT BOX */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeConv?.state === "HANDOFF"
                      ? "Send message to customer WhatsApp..."
                      : "Type reply here (Will automatically take over chat & mute AI)..."
                  }
                  disabled={sendLoading}
                  className="flex-grow bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 text-slate-200 placeholder-slate-500 disabled:opacity-60 font-medium"
                />
                <button
                  type="submit"
                  disabled={sendLoading || !replyText.trim()}
                  className="px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-rose-950/20 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" /> Send Reply
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3 py-8 text-center p-6">
              <Bot className="h-16 w-16 text-slate-700 animate-pulse" />
              <h3 className="text-base font-bold text-slate-300">No Conversation Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">Select an active customer chat from the list on the left to takeover conversations, monitor live transcripts, or type manual responses.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
