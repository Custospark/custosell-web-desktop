import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500">Last updated: June 2026</p>
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
        <p className="text-gray-600 leading-relaxed">Custosell collects information you provide when creating an account, processing sales, and managing your business. This includes business name, contact details, transaction data, and customer information you choose to store.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
        <p className="text-gray-600 leading-relaxed">We use your information solely to operate and improve the Custosell platform. This includes processing transactions, generating reports, synchronizing data across devices, and providing customer support.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">3. Data Storage & Security</h2>
        <p className="text-gray-600 leading-relaxed">Your data is stored securely with enterprise-grade encryption. All data is encrypted in transit and at rest. We implement industry-standard security measures to protect your business information.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">4. Data Sharing</h2>
        <p className="text-gray-600 leading-relaxed">We do not sell your data. Your business data belongs to you. We only share information with third parties as necessary to provide the service and only under strict data processing agreements.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">5. Offline Mode</h2>
        <p className="text-gray-600 leading-relaxed">Custosell stores transaction data locally on your device for offline functionality. This data is synchronized with our servers when connectivity is restored. Local data is encrypted and isolated to the Custosell application.</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">6. Contact</h2>
        <p className="text-gray-600 leading-relaxed">For privacy-related inquiries, contact us at <a href="mailto:support@custospark.com" className="text-blue-600 hover:underline">support@custospark.com</a>.</p>
      </section>
      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
        <Shield className="w-5 h-5 text-blue-500 shrink-0" />
        <span>Your data is protected with enterprise-grade encryption and security practices.</span>
      </div>
    </div>
  );
}
