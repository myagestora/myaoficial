import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

interface ModernCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  iconBgColor?: string;
  title?: string;
  value?: string | number;
  valueColor?: string;
  description?: string;
  children?: React.ReactNode;
}

export const ModernCard = React.forwardRef<HTMLDivElement, ModernCardProps>(
  (
    { icon, iconBgColor = '#F3F6FB', title, value, valueColor = 'text-gray-900', description, children, className, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-white shadow-lg p-6 flex flex-col gap-2',
        className
      )}
      {...props}
    >
      {(icon || title) && (
        <div className="flex items-center gap-3 mb-1">
          {icon && (
            <div
              className="rounded-full flex items-center justify-center"
              style={{ backgroundColor: iconBgColor, width: 40, height: 40 }}
            >
              {icon}
            </div>
          )}
          {title && <span className="font-bold text-lg text-gray-900">{title}</span>}
        </div>
      )}
      {typeof value !== 'undefined' && (
        <span className={cn('text-2xl font-bold', valueColor)}>{value}</span>
      )}
      {description && <span className="text-sm text-gray-400">{description}</span>}
      {children}
    </div>
  )
);
ModernCard.displayName = 'ModernCard';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
