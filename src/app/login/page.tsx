"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Smartphone } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Login failed.");
        return;
      }

      router.replace("/admin/orders");
      router.refresh();
    } catch {
      setError("Unable to reach server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-gray-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[980px] grid lg:grid-cols-[1fr_420px] gap-6 items-stretch">
        <section className="hidden lg:flex flex-col justify-between rounded-lg border border-border bg-[#111b21] p-8 shadow-2xl">
          <div>
            <div className="h-14 w-14 rounded-lg bg-primary flex items-center justify-center text-3xl shadow-lg">
              🌶️
            </div>
            <h1 className="mt-6 text-3xl font-extrabold leading-tight">Mirch Masala Admin</h1>
            <p className="mt-3 max-w-md text-sm text-muted">
              Fast control room for orders, kitchen status, WhatsApp chats and payments.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-surface p-4">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <p className="mt-3 text-sm font-bold">Staff protected</p>
              <p className="mt-1 text-xs text-muted">Login required for admin controls.</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              <Smartphone className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-bold">Mobile ready</p>
              <p className="mt-1 text-xs text-muted">Install on phone for quick access.</p>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleLogin}
          className="w-full rounded-lg border border-border bg-surface p-5 sm:p-7 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-7">
            <div className="h-12 w-12 shrink-0 bg-primary rounded-lg flex items-center justify-center text-2xl shadow-md">
              🌶️
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight">Staff Login</h1>
              <p className="text-xs text-muted truncate">Mirch Masala admin access</p>
            </div>
          </div>

          <div className="mb-5 rounded-lg border border-border bg-[#111b21] px-4 py-3">
            <p className="text-xs font-semibold text-gray-200">Today control panel</p>
            <p className="mt-1 text-xs text-muted">Orders, kitchen, bookings, chats and payment approval.</p>
          </div>

          <label className="block text-xs text-muted mb-1.5 font-semibold">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-3 mb-4 outline-none focus:border-primary text-sm"
            autoComplete="username"
          />

          <label className="block text-xs text-muted mb-1.5 font-semibold">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-3 mb-4 outline-none focus:border-primary text-sm"
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-rose-300 mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-extrabold rounded-lg py-3 flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
