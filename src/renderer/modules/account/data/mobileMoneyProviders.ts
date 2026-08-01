export interface MobileMoneyProviderGroup {
  countryCode: string;
  providers: string[];
}

export const MOBILE_MONEY_PROVIDERS_BY_COUNTRY: MobileMoneyProviderGroup[] = [
  { countryCode: 'UG', providers: ['MTN Mobile Money', 'Airtel Money', 'Vodafone Cash'] },
  { countryCode: 'KE', providers: ['M-Pesa', 'Airtel Money'] },
  { countryCode: 'TZ', providers: ['M-Pesa (Vodacom)', 'Airtel Money', 'Tigo Pesa', 'Halotel Money'] },
  { countryCode: 'RW', providers: ['MTN MoMo', 'Airtel Money'] },
  { countryCode: 'BI', providers: ['Lumitel', 'Ecocash'] },
  { countryCode: 'SS', providers: ['MTN Mobile Money', 'Zain Money'] },
  { countryCode: 'ET', providers: ['telebirr', 'M-Pesa (Safaricom)'] },
  { countryCode: 'CD', providers: ['M-Pesa', 'Airtel Money', 'Orange Money'] },
  { countryCode: 'NG', providers: ['MTN MoMo', 'Airtel Money', 'Opay', 'Paga', 'PalmPay'] },
  { countryCode: 'GH', providers: ['MTN MoMo', 'Vodafone Cash', 'AT Money', 'AirtelTigo Money'] },
  { countryCode: 'ZM', providers: ['MTN Mobile Money', 'Airtel Money', 'Zamtel Kwacha'] },
  { countryCode: 'MW', providers: ['TNM Mpamba', 'Airtel Money'] },
  { countryCode: 'MZ', providers: ['M-Pesa (Vodacom)', 'e-Mola'] },
  { countryCode: 'ZW', providers: ['EcoCash', 'OneMoney'] },
  { countryCode: 'ZA', providers: ['MTN MoMo', 'Vodacom VodaPay'] },
  { countryCode: 'EG', providers: ['Vodafone Cash', 'Fawry', 'Orange Money', 'Etisalat Cash'] },
  { countryCode: 'MA', providers: ['M-Wallet (Maroc Telecom)', 'Orange Money', 'CIH Cash'] },
  { countryCode: 'TN', providers: ['Orange Money', 'D17 (Ooredoo)', 'Smart Cash'] },
  { countryCode: 'SO', providers: ['EVC Plus (Hormuud)', 'Sahal (Telesom)', 'Golis Mobile Money'] },
  { countryCode: 'GM', providers: ['Afrimoney', 'QMoney'] },
  { countryCode: 'SL', providers: ['Afrimoney', 'QMoney', 'Orange Money'] },
  { countryCode: 'LR', providers: ['Orange Money', 'Lonestar Cell MTN MoMo'] },
  { countryCode: 'CI', providers: ['MTN MoMo', 'Orange Money', 'Wave'] },
  { countryCode: 'SN', providers: ['Orange Money', 'Wave', 'Free Money'] },
  { countryCode: 'ML', providers: ['Orange Money', 'Moov Money'] },
  { countryCode: 'BF', providers: ['Orange Money', 'Moov Money'] },
  { countryCode: 'NE', providers: ['Orange Money', 'Moov Money'] },
  { countryCode: 'TD', providers: ['Airtel Money', 'Tigo Money'] },
  { countryCode: 'CM', providers: ['MTN MoMo', 'Orange Money'] },
  { countryCode: 'GA', providers: ['Airtel Money', 'Moov Money'] },
  { countryCode: 'CG', providers: ['MTN MoMo', 'Airtel Money'] },
  { countryCode: 'AO', providers: ['Unitel Money', 'Afrimoney'] },
  { countryCode: 'BW', providers: ['Orange Money'] },
  { countryCode: 'NA', providers: ['MTC Afrimoney'] },
];

export function mobileMoneyProvidersFor(countryCode: string): string[] {
  const group = MOBILE_MONEY_PROVIDERS_BY_COUNTRY.find((g) => g.countryCode === countryCode);
  return group?.providers ?? [];
}
