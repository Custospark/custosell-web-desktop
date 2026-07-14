import { PRODUCT_NAME, TAGLINE } from '../../brand/custosellBrand';

export function Footer() {
  // Brand footer is desktop-only — mobile uses the bottom tab bar instead.
  return (
    <footer className="hidden lg:flex shrink-0 px-6 py-3 border-t border-gray-200 bg-white lg:flex-col xl:flex-row items-center justify-between gap-2 text-xs">
      <span className="text-gray-500 text-center sm:text-left">
        <span className="font-semibold text-blue-600">{PRODUCT_NAME}</span>
        {' '}
        &mdash;
        {' '}
        {TAGLINE}
      </span>
      <span className="text-blue-600 text-center sm:text-right">
        {PRODUCT_NAME} is a product of{' '}
        <a
          href="https://www.custospark.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline hover:text-blue-800"
        >
          Custospark Company Ltd.
        </a>
      </span>
    </footer>
  );
}
