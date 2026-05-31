"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BellRing,
  Bot,
  Calendar,
  ChefHat,
  Download,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  QrCode,
  Utensils,
} from "lucide-react";

interface DashboardHeaderProps {
  totalOrders: number;
  activeOrders: number;
  todayRevenue: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const navItems = [
  { href: "/admin/orders", label: "Orders", icon: LayoutDashboard },
  { href: "/admin/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/admin/menu", label: "Menu", icon: Utensils },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/qr", label: "QR", icon: QrCode },
  { href: "/admin/ai-test", label: "AI", icon: Bot },
  { href: "/admin/inbox", label: "Inbox", icon: MessageSquare },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  totalOrders,
  activeOrders,
  todayRevenue,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const handleInstall = async () => {
    if (!installPrompt) {
      alert("Install on mobile: open browser menu and choose Add to Home screen.");
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio not allowed or supported yet");
    }
  };

  return (
    <header className="bg-surface border-b border-border px-3 py-3 sm:px-4 lg:px-6 shrink-0 shadow-lg">
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,280px)_minmax(280px,360px)_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 bg-primary rounded-lg flex items-center justify-center font-extrabold text-white text-xl shadow-md border border-primary-hover">
              🌶️
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-100 flex items-center gap-2 leading-tight">
                <span className="truncate">Mirch Masala Admin</span>
                <span className="h-2 w-2 shrink-0 bg-accent rounded-full animate-pulse" title="System online" />
              </h1>
              <p className="text-[11px] sm:text-xs text-muted truncate">Orders, kitchen, chats and payments</p>
            </div>
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <button
              onClick={handleInstall}
              className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-accent transition-all shadow-md active:scale-95"
              title="Install admin app"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={playChime}
              className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-primary transition-all shadow-md active:scale-95"
              title="Test audio alert chime"
            >
              <BellRing className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-rose-400 transition-all shadow-md active:scale-95"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 min-w-0">
          <div className="rounded-lg bg-[#202c33]/70 border border-border/70 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Active</span>
            <span className="block text-lg font-extrabold text-primary leading-none mt-1">{activeOrders}</span>
          </div>
          <div className="rounded-lg bg-[#202c33]/70 border border-border/70 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Total</span>
            <span className="block text-lg font-extrabold text-gray-200 leading-none mt-1">{totalOrders}</span>
          </div>
          <div className="rounded-lg bg-[#202c33]/70 border border-border/70 px-3 py-2 min-w-0">
            <span className="block text-[9px] text-muted uppercase tracking-wider font-semibold truncate">Sales</span>
            <span className="block text-lg font-extrabold text-accent leading-none mt-1">₹{todayRevenue.toFixed(0)}</span>
          </div>
        </div>

        <nav className="flex bg-[#202c33] p-1 rounded-lg border border-border overflow-x-auto no-scrollbar max-w-full min-w-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  active ? "bg-primary text-white shadow-md" : "text-muted hover:text-gray-200"
                }`}
                title={item.label}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden xl:flex items-center gap-2 justify-end">
          <button
            onClick={handleInstall}
            className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-accent transition-all shadow-md active:scale-95"
            title="Install admin app"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={playChime}
            className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-primary transition-all shadow-md active:scale-95"
            title="Test audio alert chime"
          >
            <BellRing className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="h-9 w-9 grid place-items-center bg-[#202c33] border border-border hover:bg-border rounded-lg text-muted hover:text-rose-400 transition-all shadow-md active:scale-95"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
