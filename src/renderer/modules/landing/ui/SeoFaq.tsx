import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SEO_FAQ } from '../seo/seoContent';

/**
 * Landing-page FAQ accordion with static, crawlable questions and answers.
 * Also emits the matching JSON-LD FAQPage schema so search engines and AI
 * agents can extract direct answers to common queries.
 */
export function SeoFaq() {
  const [open, setOpen] = useState<number | null>(0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SEO_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <section
      aria-labelledby="faq-heading"
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="text-center mb-10">
        <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Frequently asked questions
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Quick answers about what Custosell is and how it helps your business.
        </p>
      </div>

      <div className="space-y-3">
        {SEO_FAQ.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <div key={item.question} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-gray-800 sm:text-base">{item.question}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{item.answer}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}