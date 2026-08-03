import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routes/constants/shared.paths';
import { LifeBuoy, MessageSquare, BookOpen, HelpCircle, ArrowRight, Mail, Phone } from 'lucide-react';
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from '../../shared/brand/custosellBrand';

export default function AccountReferralsHelpTab() {
  const navigate = useNavigate();

  const links = [
    {
      icon: BookOpen,
      title: 'Tutorials & Guides',
      desc: 'Step-by-step walkthroughs for using Custosell features',
      to: ROUTES.GUIDE.TUTORIALS,
    },
    {
      icon: HelpCircle,
      title: 'Frequently Asked Questions',
      desc: 'Find answers to common questions about Custosell',
      to: ROUTES.GUIDE.FAQS,
    },
    {
      icon: MessageSquare,
      title: 'Send Feedback',
      desc: 'Share your thoughts and suggestions with the team',
      to: ROUTES.GUIDE.FEEDBACK,
    },
    {
      icon: LifeBuoy,
      title: 'Contact & Help',
      desc: 'Reach out to our support team for assistance',
      to: ROUTES.GUIDE.CONTACT,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Need help with your referrals, rewards, or payouts? Browse our guides or reach out to us directly.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.to}
                type="button"
                onClick={() => navigate(link.to)}
                className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">{link.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-900">Still need help?</span>
          </div>
          <p className="text-sm text-indigo-700">
            Visit the <strong>Contact & Help</strong> page to send us a message directly. Our team typically responds within 24 hours.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {SUPPORT_EMAIL}
            </a>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {SUPPORT_PHONE}
            </a>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
