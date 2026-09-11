"use client";

import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import type { VideoProduct, Collection } from "@/types";

type AddToCartButtonProps = {
  video?: VideoProduct;
  collection?: Collection;
  variant?: "primary" | "ghost" | "icon";
  className?: string;
  label?: string;
};

export function AddToCartButton({
  video,
  collection,
  variant = "primary",
  className,
  label = "Add to Cart",
}: AddToCartButtonProps) {
  const { addVideo, addCollection, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const productId = video?.id ?? collection?.id;
  const alreadyInCart = items.some((i) => i.productId === productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (alreadyInCart || justAdded) return;
    if (video) addVideo(video);
    if (collection) addCollection(collection);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  };

  const shown = alreadyInCart || justAdded;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={shown ? "Already in cart" : "Add to cart"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-accent",
          shown && "bg-accent",
          className
        )}
      >
        {shown ? <Check size={16} /> : <ShoppingBag size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition",
        variant === "primary" &&
          "bg-accent text-white hover:brightness-110 active:scale-[0.98]",
        variant === "ghost" &&
          "border border-border bg-transparent text-text hover:border-accent hover:text-accent",
        shown && "pointer-events-none opacity-80",
        className
      )}
    >
      {shown ? (
        <>
          <Check size={16} /> In cart
        </>
      ) : (
        <>
          <ShoppingBag size={16} /> {label}
        </>
      )}
    </button>
  );
}
