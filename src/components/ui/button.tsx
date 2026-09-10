import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[transform,background-color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
  {
    variants: {
      variant: {
        gold: "bg-gold-bar text-brown-deep shadow-card",
        dark: "bg-banner text-card",
        outline: "border border-gold-deep/30 bg-card text-brown-deep",
        ghost: "text-brown hover:bg-highlight",
        cream: "bg-highlight text-brown-deep",
      },
      size: {
        default: "h-11 rounded-xl px-4 text-sm",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-5 text-sm",
        pill: "h-8 rounded-full px-3 text-xs",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: { variant: "gold", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
