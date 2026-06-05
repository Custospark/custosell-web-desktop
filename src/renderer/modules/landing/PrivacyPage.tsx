import { Shield, Database, Lock, Share2, Wifi, Mail, CheckCircle } from 'lucide-react';

const sections = [
  {
    icon: Database,
    title: '1. Information We Collect',
    content: 'Custosell collects information you provide when creating an account, processing sales, and managing your business. This includes business name, contact details, transaction data, and customer information you choose to store. We only collect what is necessary to operate the platform.',
  },
  {
    icon: Lock,
    title: '2. How We Use Your Information',
    content: 'We use your information solely to operate and improve the Custosell platform. This includes processing transactions, generating reports, synchronizing data across devices, and providing customer support. Your data is never used for purposes beyond what you signed up for.',
  },
  {
    icon: Shield,
    title: '3. Data Storage & Security',
    content: 'Your data is stored securely with enterprise-grade encryption. All data is encrypted in transit (TLS) and at rest (AES-256). We implement industry-standard security measures to protect your business information, including regular security audits and access controls.',
  },
  {
    icon: Share2,
    title: '4. Data Sharing',
    content: null,
    special: true,
  },
  {
    icon: Wifi,
    title: '5. Offline Mode',
    content: 'Custosell stores transaction data locally on your device for offline functionality. This data is synchronized with our servers when connectivity is restored. Local data is encrypted and isolated to the Custosell application — no other app can access it.',
  },
  {
    icon: Mail,
    title: '6. Contact',
    content: 'For privacy-related inquiries, contact us at support@custospark.com. We respond to all privacy requests within 48 hours.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center space-y-3 pb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 rounded-full text-xs font-semibold text-blue-600">
          <Shield className="w-3.5 h-3.5" />
          Privacy Policy
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Your Data, Your Control</h1>
        <p className="text-gray-500 max-w-xl mx-auto">We believe your business data belongs to you. Here's how we protect it.</p>
        <p className="text-xs text-gray-400">Last updated: June 2026</p>
      </div>

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.title} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
            </div>
            {section.special ? (
              <div className="ml-11 bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
                <p className="text-green-800 font-bold text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  We do not share your data. Period.
                </p>
                <p className="text-green-700 leading-relaxed text-sm">
                  Your business data belongs to you and only you. We never sell, rent, or share your information with third parties for their own use. We do not use your business data for advertising, profiling, or any purpose beyond operating the Custosell platform.
                </p>
                <p className="text-green-700 leading-relaxed text-sm">
                  Data is processed solely to deliver the service you requested — processing sales, storing inventory, and generating reports — all within the Custosell application infrastructure. When you delete your account, your data is permanently erased within 30 days.
                </p>
              </div>
            ) : (
              <p className="ml-11 text-gray-600 leading-relaxed">{section.content}</p>
            )}
          </section>
        );
      })}

      <div className="flex items-center gap-3 p-5 bg-blue-50 rounded-xl border border-blue-100">
        <Shield className="w-6 h-6 text-blue-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Enterprise-Grade Protection</p>
          <p className="text-sm text-blue-700">Your data is encrypted in transit and at rest. Regular security audits ensure your information stays safe.</p>
        </div>
      </div>
    </div>
  );
}
