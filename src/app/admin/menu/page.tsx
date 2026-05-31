"use client";

import React, { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  menuItems: MenuItem[];
}

export default function AdminMenu() {
  // DB States
  const [categories, setCategories] = useState<Category[]>([]);
  const [ordersStats, setOrdersStats] = useState({ total: 0, active: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  // Active Category context for view
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");

  // Form Modals States
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    imageUrl: "",
    categoryId: "",
    isVegetarian: true,
    isAvailable: true,
  });

  // Fetch Menu details and general Orders Stats to sync header counters
  const fetchMenuAndStats = async () => {
    try {
      // 1. Fetch Menu
      const menuRes = await fetch("/api/admin/menu");
      const menuData = await menuRes.json();
      if (menuData.success) {
        setCategories(menuData.categories);
        // Pre-fill first category in add form dropdown
        if (menuData.categories.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: menuData.categories[0].id }));
        }
      }

      // 2. Fetch Orders to compile real-time statistics
      const ordersRes = await fetch("/api/admin/orders");
      const ordersData = await ordersRes.json();
      if (ordersData.success && ordersData.orders) {
        const list = ordersData.orders;
        const total = list.length;
        const active = list.filter((o: any) =>
          ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status)
        ).length;
        const revenue = list
          .filter((o: any) => o.status === "DELIVERED")
          .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0);
        
        setOrdersStats({ total, active, revenue });
      }
    } catch (err) {
      console.error("Failed to load Menu data inside admin panel", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndStats();
  }, []);

  // Quick stock toggler (Toggle isAvailable immediately!)
  const handleToggleStock = async (item: MenuItem) => {
    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isAvailable: !item.isAvailable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            menuItems: cat.menuItems.map((mi) =>
              mi.id === item.id ? { ...mi, isAvailable: !item.isAvailable } : mi
            ),
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Item submission
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.categoryId) {
      alert("Kripya sabhi fields enter karein!");
      return;
    }

    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form and refresh
        setFormData({
          name: "",
          price: "",
          description: "",
          imageUrl: "",
          categoryId: categories[0]?.id || "",
          isVegetarian: true,
          isAvailable: true,
        });
        setShowAddForm(false);
        fetchMenuAndStats();
      } else {
        alert("Error adding item: " + data.error);
      }
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    }
  };

  // Edit Item submission
  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name || !editingItem.price) return;

    try {
      const res = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          name: editingItem.name,
          price: editingItem.price,
          description: editingItem.description,
          imageUrl: editingItem.imageUrl,
          categoryId: editingItem.categoryId,
          isVegetarian: editingItem.isVegetarian,
          isAvailable: editingItem.isAvailable,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingItem(null);
        fetchMenuAndStats();
      } else {
        alert("Error updating item: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this dish from the menu?")) return;

    try {
      const res = await fetch(`/api/admin/menu?id=${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        fetchMenuAndStats();
      } else {
        alert("Failed to delete: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">Loading Menu Workspace...</span>
      </div>
    );
  }

  // Compile list of items matching selectedCategory filters
  const getFilteredItems = () => {
    const list: Array<{ item: MenuItem; categoryName: string }> = [];
    categories.forEach((cat) => {
      if (selectedCatId === "ALL" || selectedCatId === cat.id) {
        cat.menuItems.forEach((mi) => {
          list.push({ item: mi, categoryName: cat.name });
        });
      }
    });
    return list;
  };

  const filteredList = getFilteredItems();

  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden text-gray-200">
      {/* Header Panel */}
      <DashboardHeader
        totalOrders={ordersStats.total}
        activeOrders={ordersStats.active}
        todayRevenue={ordersStats.revenue}
      />

      {/* Main Container Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0b141a]">
        
        {/* Left side Categories Filter Navigation */}
        <aside className="w-full md:w-[260px] shrink-0 border-b md:border-b-0 md:border-r border-border bg-[#111b21] p-3 md:p-4 flex flex-col gap-2 md:gap-4 overflow-hidden md:overflow-y-auto">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-[11px] text-muted tracking-wider uppercase">Menu Categories</h3>
            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded-md font-bold">
              {categories.length}
            </span>
          </div>

          <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1.5 md:pb-0 shrink-0 w-full select-none">
            <button
              onClick={() => setSelectedCatId("ALL")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap shrink-0 text-left ${
                selectedCatId === "ALL"
                  ? "bg-primary text-white shadow-md"
                  : "text-muted hover:text-gray-200 hover:bg-[#202c33]/40"
              }`}
            >
              📋 All Categories ({categories.reduce((s, c) => s + c.menuItems.length, 0)} items)
            </button>
            
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap shrink-0 flex items-center justify-between gap-3 ${
                  selectedCatId === cat.id
                    ? "bg-primary text-white shadow-md"
                    : "text-muted hover:text-gray-200 hover:bg-[#202c33]/40"
                }`}
              >
                <span>📁 {cat.name}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  selectedCatId === cat.id ? "bg-white/20 text-white" : "bg-[#202c33] text-muted"
                }`}>
                  {cat.menuItems.length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right side Products Grid list */}
        <main className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-black text-gray-100 flex items-center gap-2">
                Menu Management
                <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" />
              </h2>
              <p className="text-xs text-muted">Create new dishes, adjust pricing, and toggle live stock availability instantly</p>
            </div>
            
            {/* Add product button trigger */}
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2.5 bg-accent hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg hover-scale"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          {/* Dishes Table/Grid Workspace */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 border border-dashed border-border/60 rounded-2xl p-6 text-center">
                <ShieldAlert className="h-8 w-8 text-muted" />
                <span className="text-sm font-semibold text-gray-400">No dishes inside this category.</span>
                <span className="text-xs text-muted">Click the Add New Dish button to configure your first menu item.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredList.map(({ item, categoryName }) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl glass border flex flex-col justify-between gap-4 transition-all shadow-md ${
                      item.isAvailable ? "border-border hover:border-border/80" : "border-red-500/30 opacity-75"
                    }`}
                  >
                    {/* Food Thumbnail preview */}
                    <div className="relative h-[110px] w-full bg-[#111b21] rounded-xl overflow-hidden border border-border/40 shrink-0">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted text-[10px] italic">
                          No Photo Configured
                        </div>
                      )}
                    </div>
                    {/* Top Row: category slug and type markers */}
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <span className="text-[9px] bg-border px-2 py-0.5 rounded-full font-bold text-muted uppercase">
                        {categoryName}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-4 w-4 border rounded flex items-center justify-center font-bold text-[8px] ${
                            item.isVegetarian
                              ? "border-emerald-600 text-emerald-500 bg-emerald-600/10"
                              : "border-red-600 text-red-500 bg-red-600/10"
                          }`}
                          title={item.isVegetarian ? "Vegetarian Dish" : "Non-Vegetarian"}
                        >
                          {item.isVegetarian ? "●" : "▲"}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isAvailable 
                            ? "bg-accent/10 text-accent border border-accent/20" 
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {item.isAvailable ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Name and description */}
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-100 line-clamp-1">{item.name}</h4>
                      <p className="text-[11px] text-muted line-clamp-2 mt-1 min-h-[32px]">
                        {item.description || "No description provided."}
                      </p>
                      <span className="text-base font-black text-primary mt-2 block">
                        ₹{Number(item.price).toFixed(0)}
                      </span>
                    </div>

                    {/* Bottom Row: Control Buttons */}
                    <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                      {/* Availability stock toggler */}
                      <button
                        onClick={() => handleToggleStock(item)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          item.isAvailable
                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                            : "bg-accent/10 hover:bg-accent/20 text-accent"
                        }`}
                      >
                        {item.isAvailable ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        <span>{item.isAvailable ? "Mark Out of Stock" : "Enable In Stock"}</span>
                      </button>

                      {/* Edit and Delete operations */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 bg-[#202c33] border border-border hover:bg-border text-muted hover:text-primary rounded-lg transition-all"
                          title="Edit details"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 bg-[#202c33] border border-border hover:bg-red-500/20 text-muted hover:text-red-400 rounded-lg transition-all"
                          title="Delete dish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================================
          ADD DISH FORM MODAL
         ========================================================================= */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddItemSubmit}
            className="w-full max-w-[450px] bg-surface border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-xs font-semibold"
          >
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <h3 className="font-extrabold text-sm text-gray-100 flex items-center gap-1.5">
                <span>Add New Food Item</span>
                <span className="text-primary font-black">🌶️</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 text-muted hover:text-white rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Dish Name</label>
              <input
                type="text"
                placeholder="e.g. Kadhai Paneer Platter"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none placeholder:text-muted"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Dish Photo Image URL</label>
              <input
                type="url"
                placeholder="e.g. https://images.unsplash.com/photo-..."
                value={formData.imageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none placeholder:text-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted uppercase text-[10px]">Price (INR ₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 290"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-muted uppercase text-[10px]">Menu Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Description (Dishes ingredients summary)</label>
              <textarea
                placeholder="Describe flavor notes, spiciness, vegetarian attributes..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none h-16 resize-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 mt-2 shrink-0">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-muted">
                  <input
                    type="checkbox"
                    checked={formData.isVegetarian}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isVegetarian: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span>Veg Spec</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isAvailable: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span>Active Stock</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-[#202c33] hover:bg-border border border-border rounded-xl font-bold transition-all text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Add Dish
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          EDIT DISH FORM MODAL
         ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleEditItemSubmit}
            className="w-full max-w-[450px] bg-surface border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-xs font-semibold"
          >
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <h3 className="font-extrabold text-sm text-gray-100 flex items-center gap-1.5">
                <span>Edit Dish: {editingItem.name}</span>
                <span className="text-primary font-black">✏️</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-muted hover:text-white rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Dish Name</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem((prev: any) => ({ ...prev, name: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Dish Photo Image URL</label>
              <input
                type="url"
                placeholder="e.g. https://images.unsplash.com/... (optional)"
                value={editingItem.imageUrl || ""}
                onChange={(e) => setEditingItem((prev: any) => ({ ...prev, imageUrl: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-muted uppercase text-[10px]">Price (INR ₹)</label>
                <input
                  type="number"
                  value={Number(editingItem.price)}
                  onChange={(e) => setEditingItem((prev: any) => ({ ...prev, price: e.target.value }))}
                  className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-muted uppercase text-[10px]">Menu Category</label>
                <select
                  value={editingItem.categoryId}
                  onChange={(e) => setEditingItem((prev: any) => ({ ...prev, categoryId: e.target.value }))}
                  className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-muted uppercase text-[10px]">Description</label>
              <textarea
                value={editingItem.description || ""}
                onChange={(e) => setEditingItem((prev: any) => ({ ...prev, description: e.target.value }))}
                className="bg-[#202c33] border border-border rounded-xl px-4 py-2 text-gray-200 outline-none h-16 resize-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 mt-2 shrink-0">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-muted">
                  <input
                    type="checkbox"
                    checked={editingItem.isVegetarian}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, isVegetarian: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span>Veg Spec</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-muted">
                  <input
                    type="checkbox"
                    checked={editingItem.isAvailable}
                    onChange={(e) => setEditingItem((prev: any) => ({ ...prev, isAvailable: e.target.checked }))}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  <span>Active Stock</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-[#202c33] hover:bg-border border border-border rounded-xl font-bold transition-all text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
