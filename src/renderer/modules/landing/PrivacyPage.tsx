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
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
            <p className="text-green-800 font-semibold text-base">We do not share your data. Period.</p>
            <p className="text-green-700 leading-relaxed">Your business data belongs to you and only you. We never sell, rent, or share your information with third parties for their own use. We do not use your business data for advertising, profiling, or any purpose beyond operating the Custosell platform you paid for.</p>
            <p className="text-green-700 leading-relaxed">Data is processed solely to deliver the service you requested — processing sales, storing inventory, and generating reports — all within the Custosell application infrastructure.</p>
          </div>
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
