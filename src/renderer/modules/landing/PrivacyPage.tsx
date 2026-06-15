import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Download, Building2, CheckCircle2, Globe, Clock } from 'lucide-react';

const sections = [
  {
    title: 'Data Protection & Encryption',
    icon: Shield,
    items: [
      'All data encrypted at rest using AES-256 encryption',
      'All data encrypted in transit using TLS 1.3',
      'Field-level encryption for sensitive business and customer information',
      'Encryption keys managed through secure infrastructure',
    ],
  },
  {
    title: 'Access Control & Authentication',
    icon: Lock,
    items: [
      'Role-based access control — each staff member gets the right permissions',
      'Secure authentication for all accounts',
      'Session management with automatic timeout on inactivity',
      'Each user has a unique identity with full audit trail',
    ],
  },
  {
    title: 'Audit Trail & Accountability',
    icon: Eye,
    items: [
      'Every sale, modification, and deletion is logged with timestamp and user identity',
      'Immutable audit logs — no user can alter or delete their activity trail',
      'Shift-level tracking showing exactly which staff processed each transaction',
      'Exportable audit reports for internal review',
    ],
  },
  {
    title: 'Data Storage & Residency',
    icon: Database,
    items: [
      'Your data stays in the region you operate in',
      'Primary infrastructure on secure cloud providers with regional data centers',
      'Data never leaves your chosen jurisdiction without explicit authorization',
      'Automated daily backups with encrypted storage',
    ],
  },
  {
    title: 'Data Sharing & Third Parties',
    icon: Globe,
    items: [
      'We do not sell, rent, or share your business data with third parties',
      'Your data is processed solely to deliver the Custosell platform services',
      'We never use your business data for advertising, profiling, or analytics beyond the platform',
      'When you delete your account, your data is permanently erased within 30 days',
    ],
  },
  {
    title: 'Data Export & Portability',
    icon: Download,
    items: [
      'Full data export at any time — no lock-in, no data hostage',
      'Export your sales, inventory, customer, and expense data on demand',
      'No hidden fees or barriers to leaving the platform',
      'Transition assistance available for business accounts',
    ],
  },
  {
    title: 'Business Continuity',
    icon: Clock,
    items: [
      'Automated daily backups with 30-day retention',
      'Point-in-time recovery capability for rapid restoration',
      '99.9% uptime for the Custosell platform',
      'Offline mode ensures your business keeps running during internet outages',
    ],
  },
  {
    title: 'Infrastructure & Physical Security',
    icon: Building2,
    items: [
      'Cloud infrastructure hosted on secure, compliant providers',
      'Network segmentation, firewalls, and intrusion detection systems',
      'All access to production environments requires authentication',
      'Regular security assessments and monitoring',
    ],
  },
];

const faqItems = [
  {
    q: 'Who owns the data entered into Custosell?',
    a: 'You do. Your business data belongs to you. Custosell is a data processor — we store and process data on your behalf. We never access, use, or share your data except as necessary to provide the service.',
  },
  {
    q: 'Do you share my business data with third parties?',
    a: 'No. We do not sell or share your business data. Your data is processed solely to deliver the Custosell platform. We do not use your data for advertising, research, or any purpose beyond operating the service you paid for.',
  },
  {
    q: 'What happens if Custosell goes out of business?',
    a: 'You retain the ability to export all your data at any time. In the event of business closure, we commit to a 90-day wind-down period during which all customers can export their complete data. After that, all customer data is permanently deleted.',
  },
  {
    q: 'How do you handle a data breach?',
    a: 'We will notify affected customers within 72 hours of confirming a breach. Notification includes the nature of the breach, data involved, remediation steps, and contact information for follow-up.',
  },
  {
    q: 'Is my data safe if I use Custosell offline?',
    a: 'Yes. When you use Custosell offline, your data is stored locally on your device with the same encryption standards. Data is synchronized securely when connectivity is restored. Local data is isolated to the Custosell application.',
  },
  {
    q: 'Can I delete my data when I close my account?',
    a: 'Yes. When you close your account, all your data is permanently deleted within 30 days. You can also request earlier deletion. We recommend exporting your data before account closure.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-700 mb-5">
          <Shield className="w-3.5 h-3.5" />
          Privacy & Security
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          Your Business Data Is{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
            Always Protected
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          We built Custosell on the principle that your business data belongs to you — never to us.
          Every decision, every policy, and every line of code reflects that commitment.
        </p>
      </motion.div>

      {/* Principles bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 mb-14 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center"
      >
        {[
          { icon: Lock, title: 'Encrypted by Default', desc: 'AES-256 at rest, TLS 1.3 in transit' },
          { icon: Eye, title: 'Full Audit Trail', desc: 'Every action logged. Nothing hidden.' },
          { icon: Globe, title: 'Your Data Stays Yours', desc: 'We never share or sell your data.' },
        ].map((item) => (
          <div key={item.title}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-3">
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 mb-1">{item.title}</h3>
            <p className="text-xs text-gray-500">{item.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Content sections */}
      <div className="space-y-6 mb-14">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-2xl border-2 border-gray-200 bg-white/80 p-6 sm:p-8"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shrink-0 shadow-md">
                <section.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            </div>
            <ul className="space-y-2 ml-1">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-base text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.q} className="rounded-xl border-2 border-gray-200 bg-white/80 p-5">
              <h3 className="font-bold text-base text-gray-900 mb-2">{item.q}</h3>
              <p className="text-base text-gray-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center text-xs text-gray-400 space-y-1">
        <p>Last updated: June 2026</p>
        <p>
          Questions about data privacy? Contact{' '}
          <a href="mailto:support@custosell.com" className="text-blue-600 hover:underline font-medium">support@custosell.com</a>
        </p>
      </motion.div>
    </div>
  );
}
