import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { FEATURE_SEO } from '../seo/seoContent';

/**
 * Rich, crawlable feature sections rendered on the landing page. Gives search
 * engines and AI agents real sentence copy per capability (POS, Accounting,
 * Inventory, HR, etc.) instead of only short cards — improving feature-term
 * relevance and machine-readability.
 */
export function FeatureSeoSections() {
  return (
    <section
      aria-labelledby="features-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 lg:pb-24"
    >
      <div className="text-center mb-12">
        <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          One system for sales, stock, money, and people
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          From the sales counter to the boardroom, every tool you run your business with lives in Custosell.
        </p>
      </div>

      <div className="space-y-12">
        {FEATURE_SEO.map((feature, idx) => (
          <motion.div
            key={feature.anchor}
            id={feature.anchor}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(idx * 0.03, 0.3) }}
            className="grid gap-6 rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10 scroll-mt-24"
          >
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{feature.heading}</h3>
              <p className="mt-2 text-base font-semibold text-blue-700">{feature.subtitle}</p>
            </div>
            <div className="space-y-3">
              {feature.paragraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-600">
                  {p}
                </p>
              ))}
              <ul className="grid sm:grid-cols-1 gap-2 pt-1">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}