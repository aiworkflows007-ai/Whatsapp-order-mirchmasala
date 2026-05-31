import React from "react";

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  isVegetarian: boolean;
  isAvailable: boolean;
}

interface ChatMenuCardProps {
  items: MenuItemData[];
  cartQuantities: Record<string, number>; // itemId -> quantity
  onUpdateQuantity: (itemId: string, change: number) => void;
}

export const ChatMenuCard: React.FC<ChatMenuCardProps> = ({
  items,
  cartQuantities,
  onUpdateQuantity,
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-muted italic text-sm p-2">
        No active items found in this category.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth w-full snap-x snap-mandatory">
      {items.map((item) => {
        const qty = cartQuantities[item.id] || 0;

        return (
          <div
            key={item.id}
            className="snap-start shrink-0 w-[240px] glass rounded-2xl overflow-hidden border border-border flex flex-col justify-between hover-scale shadow-lg"
          >
            {/* Food Image Container */}
            <div className="relative h-[130px] w-full bg-surface overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted bg-surface/60 text-xs italic">
                  Mirch Masala Special
                </div>
              )}

              {/* Veg / Non-Veg Indicator Badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase flex items-center gap-1 shadow-md bg-background/80">
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.isVegetarian ? "bg-accent" : "bg-accent-nonveg"
                  }`}
                />
                <span className="text-gray-200">
                  {item.isVegetarian ? "Veg" : "Non-Veg"}
                </span>
              </div>
            </div>

            {/* Food Description Details */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm text-gray-100 line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-muted text-[11px] mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Price and Cart Buttons */}
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-primary text-sm">
                  ₹{Number(item.price).toFixed(2)}
                </span>

                {qty > 0 ? (
                  <div className="flex items-center gap-2 bg-primary/20 rounded-full border border-primary/40 px-1 py-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs text-primary hover:bg-primary/20 transition-all active:scale-90"
                    >
                      –
                    </button>
                    <span className="text-xs font-semibold text-gray-200 min-w-[12px] text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs text-primary hover:bg-primary/20 transition-all active:scale-90"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="px-3 py-1 bg-primary hover:bg-primary-hover text-white rounded-full text-xs font-semibold hover-scale active:scale-95 shadow-md flex items-center gap-1 transition-all"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
