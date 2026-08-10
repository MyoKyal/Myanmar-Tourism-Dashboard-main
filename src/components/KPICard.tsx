"use client";
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    colorClass?: string;
}

export function KPICard({ title, value, icon: Icon, subtitle, trend, colorClass = "from-cyan-400 to-blue-500" }: KPICardProps) {
    return (
    <div className="glass-card p-6 relative overflow-hidden group">
      {/* Decorative gradient blur in background */}
      <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-300", `bg-gradient-to-br ${colorClass}`)} />
      
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest">{title}</h3>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/80 border border-slate-700/50 shadow-inner", `bg-gradient-to-br ${colorClass} bg-clip-border text-slate-300`)}>
           <Icon className="w-5 h-5 text-white/80 drop-shadow-md" />
        </div>
      </div>
      
      <div className="flex items-end gap-3 z-10 relative">
        <div className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">{value}</div>
        {trend && (
          <div className={cn("text-xs font-semibold mb-1.5", trend.isPositive ? "text-emerald-400" : "text-rose-400")}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
      { subtitle && <p className="text-xs text-slate-500 mt-2 z-10 relative">{subtitle}</p> }
    </div >
  );
}
