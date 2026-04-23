import { type LucideIcon } from 'lucide-react';
import { cn, getStatusColor } from '@/utils';

// ===================== STAT CARD =====================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
}

export function StatCard({ label, value, icon: Icon, iconBg = 'bg-forest/10', trend, subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon className="w-5 h-5 text-forest" />
        </div>
        {trend && (
          <span className={cn('text-sm font-semibold px-3 py-1 rounded-full', trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-base text-gray-500">{label}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

// ===================== STATUS BADGE =====================
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', getStatusColor(status))}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ===================== SECTION HEADER =====================
export function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-base text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ===================== EMPTY STATE =====================
export function EmptyState({ icon: Icon, title, description }: {
  icon: LucideIcon; title: string; description: string;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-gray-700 font-semibold mb-1">{title}</h3>
      <p className="text-gray-400 text-base">{description}</p>
    </div>
  );
}

// ===================== LOADING SKELETON =====================
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-200 rounded-lg', className)} />;
}

// ===================== PAGE HEADER =====================
export function PageHeader({ title, subtitle, breadcrumb }: {
  title: string; subtitle?: string; breadcrumb?: string;
}) {
  return (
    <div className="mb-8">
      {breadcrumb && <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">{breadcrumb}</p>}
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-500 mt-2 text-base">{subtitle}</p>}
    </div>
  );
}

// ===================== CARD =====================
export function Card({ children, className, padding = true }: {
  children: React.ReactNode; className?: string; padding?: boolean;
}) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-sm border border-gray-100', padding && 'p-6', className)}>
      {children}
    </div>
  );
}

// ===================== MINI TABLE =====================
export function MiniTable({ headers, rows }: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full text-base min-w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h) => (
              <th key={h} className="text-left text-sm font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-6 py-3.5 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
