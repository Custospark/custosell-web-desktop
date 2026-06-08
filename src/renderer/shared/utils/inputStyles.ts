const focusStyles = 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors';

export const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 ${focusStyles}`;

export const textareaClass = `${inputClass} resize-y`;

export const selectClass = `${inputClass} bg-white`;

/** Search fields with left icon padding (e.g. Guide FAQs). */
export const searchInputClass = `w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 ${focusStyles}`;

export const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
