import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-BD', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-BD', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ai_analyzed: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    responded: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
    escalated: 'bg-red-100 text-red-800',
    confirmed: 'bg-green-100 text-green-800',
    negotiating: 'bg-amber-100 text-amber-800',
    locked: 'bg-indigo-100 text-indigo-800',
    order_placed: 'bg-cyan-100 text-cyan-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    dispatched: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-teal-100 text-teal-800',
    cancelled: 'bg-red-100 text-red-800',
    returned: 'bg-orange-100 text-orange-800',
    active: 'bg-green-100 text-green-800',
    matched: 'bg-blue-100 text-blue-800',
    sold: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800',
    trial: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}
