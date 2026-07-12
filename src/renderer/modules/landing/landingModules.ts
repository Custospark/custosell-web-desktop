import type { ElementType } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Kanban,
  FileSpreadsheet,
  Receipt,
  BookOpen,
  LineChart,
  Files,
  IdCard,
} from 'lucide-react';

/** Public landing capabilities — product names + outcome-led copy. */
export interface LandingModule {
  title: string;
  description: string;
  icon: ElementType;
  color: string;
}

export const LANDING_MODULES: LandingModule[] = [
  {
    title: 'Dashboard',
    description: 'See if today is a good day in seconds — sales, costs, and what needs attention.',
    icon: LayoutDashboard,
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: 'POS System',
    description: 'Serve customers faster. Ring sales, take payments, run shifts, and print receipts without the chaos.',
    icon: ShoppingCart,
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    title: 'Inventory & Supply Chain Management',
    description: 'Never guess stock again. Track products, buy from suppliers, and keep the shelves right.',
    icon: Package,
    color: 'from-amber-500 to-amber-600',
  },
  {
    title: 'Customers',
    description: 'Know who buys from you. Keep contacts, history, and follow-ups in one list.',
    icon: Users,
    color: 'from-sky-500 to-sky-600',
  },
  {
    title: 'Sales Pipeline (CRM)',
    description: 'Close more deals. Move leads across boards so nothing slips through the cracks.',
    icon: Kanban,
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: 'Productivity & Project Management',
    description: 'Quote, deliver, and get paid. Run estimates and projects from first ask to done.',
    icon: FileSpreadsheet,
    color: 'from-violet-500 to-violet-600',
  },
  {
    title: 'Expenses',
    description: 'Stop money leaking. Log spending and see where cash really goes.',
    icon: Receipt,
    color: 'from-orange-500 to-orange-600',
  },
  {
    title: 'Accounting',
    description: 'Books you can trust. Statements and numbers ready when you need them.',
    icon: BookOpen,
    color: 'from-teal-500 to-teal-600',
  },
  {
    title: 'Financial Forecasting',
    description: 'Plan ahead with confidence. Cash outlook and scenarios before you commit.',
    icon: LineChart,
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    title: 'Document Management',
    description: 'Find any file fast. Keep contracts, invoices, and records organized for the team.',
    icon: Files,
    color: 'from-slate-500 to-slate-600',
  },
  {
    title: 'HR & Payroll',
    description: 'Pay people on time. Attendance, leave, and payroll without spreadsheet stress.',
    icon: IdCard,
    color: 'from-rose-500 to-rose-600',
  },
];
