import type { PaymentInfo } from '../api/AccountReferralTypes';

export type PaymentMethod = 'mobile_money' | 'bank' | '';

export interface PaymentFormState {
  payment_method: PaymentMethod;
  mobile_money_provider: string;
  mobile_money_number: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  bank_branch: string;
}

export const EMPTY_FORM: PaymentFormState = {
  payment_method: '',
  mobile_money_provider: '',
  mobile_money_number: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_branch: '',
};

export function paymentInfoToForm(info: PaymentInfo | undefined): PaymentFormState {
  if (!info) return EMPTY_FORM;
  return {
    payment_method: (info.payment_method as PaymentMethod) || '',
    mobile_money_provider: info.mobile_money_provider ?? '',
    mobile_money_number: info.mobile_money_number ?? '',
    bank_name: info.bank_name ?? '',
    bank_account_name: info.bank_account_name ?? '',
    bank_account_number: info.bank_account_number ?? '',
    bank_branch: info.bank_branch ?? '',
  };
}

export interface PaymentFormErrors {
  mobile_money_provider?: string;
  mobile_money_number?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
}

export function validatePaymentForm(form: PaymentFormState): PaymentFormErrors {
  const errors: PaymentFormErrors = {};
  if (form.payment_method === 'mobile_money') {
    if (!form.mobile_money_provider.trim()) {
      errors.mobile_money_provider = 'Select or enter a provider';
    }
    const digits = form.mobile_money_number.replace(/\D/g, '');
    if (!digits) {
      errors.mobile_money_number = 'Enter the mobile money number';
    } else if (digits.length < 6 || digits.length > 15) {
      errors.mobile_money_number = 'Enter a valid number (6–15 digits)';
    }
  } else if (form.payment_method === 'bank') {
    if (!form.bank_name.trim()) {
      errors.bank_name = 'Select or enter a bank';
    }
    if (form.bank_account_name.trim().length < 2) {
      errors.bank_account_name = 'Enter the full account holder name';
    }
    const accountDigits = form.bank_account_number.trim();
    if (!accountDigits) {
      errors.bank_account_number = 'Enter the account number';
    } else if (accountDigits.replace(/\D/g, '').length < 6 || accountDigits.length > 30) {
      errors.bank_account_number = 'Enter a valid account number (6–30 digits)';
    }
    if (!form.bank_branch.trim()) {
      errors.bank_branch = 'Enter the branch';
    }
  }
  return errors;
}
