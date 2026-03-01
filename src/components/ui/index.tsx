// ============================================================
// UI Design System - 基于 Tailwind + shadcn/ui 设计模式
// ============================================================

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// 工具函数 - 合并 className
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-primary shadow-sm hover:shadow-md',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-border bg-transparent hover:bg-accent'
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  }
  
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// --- Card ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl p-6 shadow-sm ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return <div className={`mb-4 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-semibold ${className}`} {...props}>{children}</h3>
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-muted-foreground ${className}`} {...props}>{children}</p>
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return <div className={className} {...props}>{children}</div>
}

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input 
      className={`
        flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm 
        ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium 
        placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
        transition-all duration-200
        ${error ? 'border-red-500 focus:ring-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  )
}

// --- Textarea ---
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  return (
    <textarea 
      className={`
        flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm 
        ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none 
        focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50
        transition-all duration-200 resize-y
        ${error ? 'border-red-500 focus:ring-red-500' : ''}
        ${className}
      `}
      {...props}
    />
  )
}

// --- Badge ---
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error'
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border text-foreground',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400'
  }
  
  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  )
}

// --- Avatar ---
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
}

export function Avatar({ src, alt, fallback, className = '', ...props }: AvatarProps) {
  const initial = fallback?.[0]?.toUpperCase() || '?'
  
  return (
    <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
      {src ? (
        <img className="aspect-square h-full w-full object-cover" src={src} alt={alt || ''} />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm font-medium text-primary">
          {initial}
        </div>
      )}
    </div>
  )
}

// --- Separator ---
export function Separator({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />
}

// --- Skeleton ---
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className}`} {...props} />
  )
}

// --- Badge 集合 ---
export function BadgeGroup({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge} variant="secondary">#{badge}</Badge>
      ))}
    </div>
  )
}

// --- Meta 信息组件 ---
export function MetaInfo({ 
  date, 
  readTime, 
  views 
}: { 
  date?: string
  readTime?: string
  views?: React.ReactNode 
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      {date && <time dateTime={date}>{new Date(date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', year: 'numeric' })}</time>}
      {date && readTime && <span>·</span>}
      {readTime && <span>{readTime}</span>}
      {readTime && views && <span>·</span>}
      {views}
    </div>
  )
}

// --- 加载状态 ---
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  
  return (
    <div className={`${sizes[size]} animate-spin rounded-full-m border-2 borderuted border-t-primary`} />
  )
}

// --- Empty 状态 ---
export function Empty({ 
  title, 
  description, 
  action 
}: { 
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      {description && <p className="mb-4 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
