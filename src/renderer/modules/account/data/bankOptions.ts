export interface BankOption {
  name: string;
  branches: string[];
}

export interface BankGroup {
  region: string;
  country: string;
  banks: BankOption[];
}

export const OTHER_OPTION = '__other__';

export const BANK_GROUPS: BankGroup[] = [
  {
    region: 'East Africa',
    country: 'Uganda',
    banks: [
      { name: 'Stanbic Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Garden City', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale'] },
      { name: 'Absa Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Garden City', 'Entebbe', 'Jinja', 'Mbarara', 'Lira', 'Arua'] },
      { name: 'DFCU Bank', branches: ['Head Office', 'Kampala Road', 'Ntinda', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Masaka'] },
      { name: 'Standard Chartered Bank Uganda', branches: ['Head Office', 'Speke Road', 'Kampala Road', 'Garden City', 'Entebbe', 'Mbarara'] },
      { name: 'Bank of Africa Uganda', branches: ['Head Office', 'Jinja Road', 'Kampala Road', 'Entebbe', 'Gulu', 'Mbarara'] },
      { name: 'Equity Bank Uganda', branches: ['Head Office', 'Garden City', 'Kampala Road', 'Jinja', 'Mbarara', 'Gulu'] },
      { name: 'Centenary Bank', branches: ['Head Office', 'Entebbe Road', 'Kampala Road', 'Jinja', 'Mbarara', 'Masaka', 'Gulu'] },
      { name: 'PostBank Uganda', branches: ['Head Office', 'Kampala Road', 'Jinja Road', 'Entebbe', 'Mbale', 'Gulu'] },
      { name: 'NCBA Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Garden City', 'Entebbe', 'Jinja'] },
      { name: 'Housing Finance Bank', branches: ['Head Office', 'Kampala Road', 'Entebbe', 'Jinja', 'Mbarara'] },
      { name: 'Diamond Trust Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Garden City', 'Entebbe', 'Jinja', 'Mbarara'] },
      { name: 'KCB Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Garden City', 'Entebbe', 'Jinja', 'Mbarara'] },
      { name: 'Ecobank Uganda', branches: ['Head Office', 'Kampala Road', 'Entebbe', 'Jinja'] },
      { name: 'Orient Bank', branches: ['Head Office', 'Kampala Road', 'Entebbe', 'Jinja', 'Mbarara'] },
      { name: 'United Bank for Africa Uganda', branches: ['Head Office', 'Kampala Road', 'Entebbe'] },
      { name: 'Exim Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Entebbe'] },
      { name: 'Cairo Bank Uganda', branches: ['Head Office', 'Kampala Road'] },
      { name: 'Bank of Baroda Uganda', branches: ['Head Office', 'Kampala Road', 'Entebbe', 'Jinja'] },
      { name: 'Citibank Uganda', branches: ['Head Office', 'Kampala Road'] },
      { name: 'Finance Trust Bank', branches: ['Head Office', 'Kampala Road', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu'] },
      { name: 'Opportunity Bank Uganda', branches: ['Head Office', 'Kampala Road', 'Jinja', 'Mbarara', 'Gulu'] },
    ],
  },
  {
    region: 'East Africa',
    country: 'Kenya',
    banks: [
      { name: 'Equity Bank Kenya', branches: ['Head Office', 'Upper Hill', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Machakos', 'Thika'] },
      { name: 'KCB Bank Kenya', branches: ['Head Office', 'Kenyatta Avenue', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Nyeri', 'Thika'] },
      { name: 'Cooperative Bank of Kenya', branches: ['Head Office', 'Moi Avenue', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Kisii', 'Meru'] },
      { name: 'Absa Bank Kenya', branches: ['Head Office', 'Riverside Drive', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { name: 'Standard Chartered Bank Kenya', branches: ['Head Office', 'City Square', 'Mombasa', 'Kisumu', 'Nakuru'] },
      { name: 'Stanbic Bank Kenya', branches: ['Head Office', 'Westlands', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { name: 'NCBA Bank', branches: ['Head Office', 'Upper Hill', 'Mombasa', 'Kisumu', 'Nakuru'] },
      { name: 'Diamond Trust Bank Kenya', branches: ['Head Office', 'Moi Avenue', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { name: 'I&M Bank', branches: ['Head Office', 'Kenya Re Towers', 'Mombasa', 'Kisumu', 'Nakuru'] },
      { name: 'Family Bank', branches: ['Head Office', 'Mama Ngina Street', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { name: 'National Bank of Kenya', branches: ['Head Office', 'Harambee Avenue', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'] },
      { name: 'Bank of Baroda Kenya', branches: ['Head Office', 'Nairobi CBD', 'Mombasa', 'Kisumu'] },
      { name: 'Citibank Kenya', branches: ['Head Office', 'Nairobi CBD'] },
      { name: 'Prime Bank', branches: ['Head Office', 'Nairobi CBD', 'Mombasa', 'Kisumu'] },
      { name: 'SBM Bank Kenya', branches: ['Head Office', 'Nairobi CBD', 'Mombasa', 'Kisumu', 'Nakuru'] },
      { name: 'Gulf African Bank', branches: ['Head Office', 'Nairobi CBD', 'Mombasa', 'Kisumu'] },
      { name: 'HFC Bank', branches: ['Head Office', 'Nairobi CBD', 'Mombasa'] },
      { name: 'Sidian Bank', branches: ['Head Office', 'Nairobi CBD', 'Mombasa', 'Kisumu'] },
      { name: 'Victoria Commercial Bank', branches: ['Head Office', 'Nairobi CBD'] },
      { name: 'Guardian Bank', branches: ['Head Office', 'Nairobi CBD', 'Mombasa'] },
    ],
  },
  {
    region: 'East Africa',
    country: 'Tanzania',
    banks: [
      { name: 'CRDB Bank', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga'] },
      { name: 'NMB Bank', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga'] },
      { name: 'NBC Bank', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma', 'Mbeya', 'Tanga'] },
      { name: 'Equity Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Mbeya'] },
      { name: 'Stanbic Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Mbeya'] },
      { name: 'Standard Chartered Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza'] },
      { name: 'Absa Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Mbeya'] },
      { name: 'Exim Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma'] },
      { name: 'Diamond Trust Bank Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Mbeya'] },
      { name: 'Bank of Africa Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza'] },
      { name: 'NCBA Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza'] },
      { name: 'KCB Tanzania', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza'] },
      { name: 'TPB Bank', branches: ['Head Office', 'Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha'] },
      { name: 'Akiba Commercial Bank', branches: ['Head Office', 'Dar es Salaam', 'Arusha', 'Mwanza'] },
      { name: 'Azania Bank', branches: ['Head Office', 'Dar es Salaam', 'Mwanza'] },
      { name: 'Amana Bank', branches: ['Head Office', 'Dar es Salaam'] },
      { name: 'Mkombozi Commercial Bank', branches: ['Head Office', 'Dar es Salaam', 'Arusha'] },
      { name: 'Kilimanjaro Co-operative Bank', branches: ['Head Office', 'Moshi', 'Dar es Salaam'] },
    ],
  },
  {
    region: 'East Africa',
    country: 'Rwanda',
    banks: [
      { name: 'Bank of Kigali', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu', 'Muhanga'] },
      { name: 'I&M Bank Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu'] },
      { name: 'Equity Bank Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu', 'Nyagatare'] },
      { name: 'Ecobank Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze'] },
      { name: 'NCBA Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu'] },
      { name: 'KCB Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu'] },
      { name: 'Bank Populaire du Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze', 'Rubavu', 'Muhanga'] },
      { name: 'Cogebanque', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze'] },
      { name: 'Access Bank Rwanda', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze'] },
      { name: 'GTBank Rwanda', branches: ['Head Office', 'Kigali'] },
      { name: 'Stanbic Bank Rwanda', branches: ['Head Office', 'Kigali'] },
      { name: "Banque de l'Habitat du Rwanda", branches: ['Head Office', 'Kigali'] },
      { name: 'Unguka Bank', branches: ['Head Office', 'Kigali'] },
      { name: 'Zigama CSS', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze'] },
    ],
  },
  {
    region: 'East Africa',
    country: 'Burundi',
    banks: [
      { name: 'Interbank Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega', 'Ngozi', 'Muyinga'] },
      { name: 'Ecobank Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega', 'Ngozi'] },
      { name: 'KCB Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega'] },
      { name: 'Diamond Trust Bank Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega'] },
      { name: 'BGFI Bank Burundi', branches: ['Head Office', 'Bujumbura'] },
      { name: 'Banque Commerciale du Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega'] },
      { name: 'FinBank Burundi', branches: ['Head Office', 'Bujumbura', 'Gitega'] },
      { name: 'BNDE', branches: ['Head Office', 'Bujumbura'] },
    ],
  },
  {
    region: 'East Africa',
    country: 'South Sudan',
    banks: [
      { name: 'KCB South Sudan', branches: ['Head Office', 'Juba', 'Wau', 'Malakal', 'Torit'] },
      { name: 'Equity Bank South Sudan', branches: ['Head Office', 'Juba', 'Wau', 'Rumbek'] },
      { name: 'Stanbic Bank South Sudan', branches: ['Head Office', 'Juba'] },
      { name: 'Ecobank South Sudan', branches: ['Head Office', 'Juba', 'Wau', 'Malakal'] },
      { name: 'Nile Commercial Bank', branches: ['Head Office', 'Juba'] },
      { name: 'Agricultural Bank of South Sudan', branches: ['Head Office', 'Juba'] },
      { name: 'Ivory Bank', branches: ['Head Office', 'Juba'] },
      { name: 'Buffalo Commercial Bank', branches: ['Head Office', 'Juba'] },
      { name: 'Mountain Trade and Development Bank', branches: ['Head Office', 'Juba'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'South Africa',
    banks: [
      { name: 'Standard Bank South Africa', branches: ['Head Office'] },
      { name: 'Absa South Africa', branches: ['Head Office'] },
      { name: 'First National Bank (FNB)', branches: ['Head Office'] },
      { name: 'Nedbank', branches: ['Head Office'] },
      { name: 'Capitec Bank', branches: ['Head Office'] },
      { name: 'Investec', branches: ['Head Office'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Zambia',
    banks: [
      { name: 'Zanaco', branches: ['Head Office', 'Lusaka'] },
      { name: 'Stanbic Bank Zambia', branches: ['Head Office', 'Lusaka'] },
      { name: 'Absa Bank Zambia', branches: ['Head Office', 'Lusaka'] },
      { name: 'Standard Chartered Zambia', branches: ['Head Office', 'Lusaka'] },
      { name: 'Indo-Zambia Bank', branches: ['Head Office', 'Lusaka'] },
      { name: 'Access Bank Zambia', branches: ['Head Office', 'Lusaka'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Zimbabwe',
    banks: [
      { name: 'CBZ Bank', branches: ['Head Office', 'Harare'] },
      { name: 'Stanbic Bank Zimbabwe', branches: ['Head Office', 'Harare'] },
      { name: 'FBC Bank', branches: ['Head Office', 'Harare'] },
      { name: 'NMB Bank Zimbabwe', branches: ['Head Office', 'Harare'] },
      { name: 'BancABC', branches: ['Head Office', 'Harare'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Mozambique',
    banks: [
      { name: 'Millennium BIM', branches: ['Head Office', 'Maputo'] },
      { name: 'Standard Bank Mozambique', branches: ['Head Office', 'Maputo'] },
      { name: 'Absa Mozambique', branches: ['Head Office', 'Maputo'] },
      { name: 'Ecobank Mozambique', branches: ['Head Office', 'Maputo'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Malawi',
    banks: [
      { name: 'National Bank of Malawi', branches: ['Head Office', 'Blantyre'] },
      { name: 'Standard Bank Malawi', branches: ['Head Office', 'Blantyre'] },
      { name: 'First Merchant Bank', branches: ['Head Office', 'Blantyre'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Botswana',
    banks: [
      { name: 'FNB Botswana', branches: ['Head Office', 'Gaborone'] },
      { name: 'Absa Botswana', branches: ['Head Office', 'Gaborone'] },
      { name: 'Stanbic Bank Botswana', branches: ['Head Office', 'Gaborone'] },
      { name: 'Standard Chartered Botswana', branches: ['Head Office', 'Gaborone'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Namibia',
    banks: [
      { name: 'FNB Namibia', branches: ['Head Office', 'Windhoek'] },
      { name: 'Standard Bank Namibia', branches: ['Head Office', 'Windhoek'] },
      { name: 'Nedbank Namibia', branches: ['Head Office', 'Windhoek'] },
      { name: 'Bank Windhoek', branches: ['Head Office', 'Windhoek'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'Angola',
    banks: [
      { name: 'BFA (Banco de Fomento Angola)', branches: ['Head Office', 'Luanda'] },
      { name: 'BAI (Banco Angolano de Investimentos)', branches: ['Head Office', 'Luanda'] },
      { name: 'Banco Millennium Atlântico', branches: ['Head Office', 'Luanda'] },
    ],
  },
  {
    region: 'Southern Africa',
    country: 'DRC',
    banks: [
      { name: 'Rawbank', branches: ['Head Office', 'Kinshasa'] },
      { name: 'Equity BCDC', branches: ['Head Office', 'Kinshasa'] },
      { name: 'Trust Merchant Bank', branches: ['Head Office', 'Kinshasa'] },
      { name: 'Afriland First Bank DRC', branches: ['Head Office', 'Kinshasa'] },
    ],
  },
  {
    region: 'West Africa',
    country: 'Nigeria',
    banks: [
      { name: 'Access Bank', branches: ['Head Office', 'Lagos'] },
      { name: 'Zenith Bank', branches: ['Head Office', 'Lagos'] },
      { name: 'Guaranty Trust Bank (GTBank)', branches: ['Head Office', 'Lagos'] },
      { name: 'United Bank for Africa (UBA)', branches: ['Head Office', 'Lagos'] },
      { name: 'First Bank of Nigeria', branches: ['Head Office', 'Lagos'] },
      { name: 'Fidelity Bank Nigeria', branches: ['Head Office', 'Lagos'] },
      { name: 'Stanbic IBTC', branches: ['Head Office', 'Lagos'] },
      { name: 'Ecobank Nigeria', branches: ['Head Office', 'Lagos'] },
    ],
  },
  {
    region: 'West Africa',
    country: 'Ghana',
    banks: [
      { name: 'GCB Bank', branches: ['Head Office', 'Accra'] },
      { name: 'Ecobank Ghana', branches: ['Head Office', 'Accra'] },
      { name: 'Stanbic Bank Ghana', branches: ['Head Office', 'Accra'] },
      { name: 'Absa Bank Ghana', branches: ['Head Office', 'Accra'] },
      { name: 'Zenith Bank Ghana', branches: ['Head Office', 'Accra'] },
      { name: 'Fidelity Bank Ghana', branches: ['Head Office', 'Accra'] },
    ],
  },
  {
    region: 'West Africa',
    country: "Côte d'Ivoire",
    banks: [
      { name: 'Ecobank Côte d’Ivoire', branches: ['Head Office', 'Abidjan'] },
      { name: 'SGBCI', branches: ['Head Office', 'Abidjan'] },
      { name: 'BNI (Banque Nationale d’Investissement)', branches: ['Head Office', 'Abidjan'] },
    ],
  },
  {
    region: 'West Africa',
    country: 'Senegal',
    banks: [
      { name: 'Ecobank Sénégal', branches: ['Head Office', 'Dakar'] },
      { name: 'Société Générale Sénégal', branches: ['Head Office', 'Dakar'] },
      { name: 'CBAO', branches: ['Head Office', 'Dakar'] },
    ],
  },
  {
    region: 'West Africa',
    country: 'Cameroon',
    banks: [
      { name: 'Afriland First Bank', branches: ['Head Office', 'Douala'] },
      { name: 'Ecobank Cameroun', branches: ['Head Office', 'Douala'] },
      { name: 'Société Générale Cameroun', branches: ['Head Office', 'Douala'] },
    ],
  },
  {
    region: 'North Africa',
    country: 'Egypt',
    banks: [
      { name: 'National Bank of Egypt', branches: ['Head Office', 'Cairo'] },
      { name: 'Banque Misr', branches: ['Head Office', 'Cairo'] },
      { name: 'Commercial International Bank (CIB)', branches: ['Head Office', 'Cairo'] },
      { name: 'QNB Alahli', branches: ['Head Office', 'Cairo'] },
      { name: 'Alexandria Bank', branches: ['Head Office', 'Cairo'] },
      { name: 'First Abu Dhabi Bank Egypt', branches: ['Head Office', 'Cairo'] },
    ],
  },
  {
    region: 'North Africa',
    country: 'Morocco',
    banks: [
      { name: 'Attijariwafa Bank', branches: ['Head Office', 'Casablanca'] },
      { name: 'BMCE Bank', branches: ['Head Office', 'Casablanca'] },
      { name: 'BMCI', branches: ['Head Office', 'Casablanca'] },
      { name: 'Société Générale Maroc', branches: ['Head Office', 'Casablanca'] },
      { name: 'CIH Bank', branches: ['Head Office', 'Casablanca'] },
    ],
  },
  {
    region: 'North Africa',
    country: 'Tunisia',
    banks: [
      { name: 'Société Tunisienne de Banque (STB)', branches: ['Head Office', 'Tunis'] },
      { name: 'Banque Nationale Agricole (BNA)', branches: ['Head Office', 'Tunis'] },
      { name: 'BIAT', branches: ['Head Office', 'Tunis'] },
      { name: 'Amen Bank', branches: ['Head Office', 'Tunis'] },
    ],
  },
  {
    region: 'North Africa',
    country: 'Algeria',
    banks: [
      { name: 'BNA (Banque Nationale d’Algérie)', branches: ['Head Office', 'Algiers'] },
      { name: 'BEA (Banque Extérieure d’Algérie)', branches: ['Head Office', 'Algiers'] },
      { name: 'CPA (Crédit Populaire d’Algérie)', branches: ['Head Office', 'Algiers'] },
    ],
  },
  {
    region: 'North Africa',
    country: 'Sudan',
    banks: [
      { name: 'Bank of Khartoum', branches: ['Head Office', 'Khartoum'] },
      { name: 'Omdurman National Bank', branches: ['Head Office', 'Khartoum'] },
    ],
  },
  {
    region: 'International',
    country: 'Global',
    banks: [
      { name: 'Citibank', branches: ['Head Office'] },
      { name: 'HSBC', branches: ['Head Office'] },
      { name: 'Barclays', branches: ['Head Office'] },
      { name: 'Standard Chartered', branches: ['Head Office'] },
      { name: 'Bank of America', branches: ['Head Office'] },
      { name: 'JPMorgan Chase', branches: ['Head Office'] },
      { name: 'Wells Fargo', branches: ['Head Office'] },
      { name: 'Deutsche Bank', branches: ['Head Office'] },
      { name: 'BNP Paribas', branches: ['Head Office'] },
      { name: 'Société Générale', branches: ['Head Office'] },
      { name: 'UBS', branches: ['Head Office'] },
      { name: 'DBS Bank', branches: ['Head Office'] },
      { name: 'Emirates NBD', branches: ['Head Office', 'Dubai'] },
      { name: 'First Abu Dhabi Bank', branches: ['Head Office', 'Abu Dhabi'] },
      { name: 'Qatar National Bank (QNB)', branches: ['Head Office', 'Doha'] },
      { name: 'National Bank of Kuwait', branches: ['Head Office', 'Kuwait City'] },
      { name: 'Riyad Bank', branches: ['Head Office', 'Riyadh'] },
      { name: 'Al Rajhi Bank', branches: ['Head Office', 'Riyadh'] },
      { name: 'State Bank of India', branches: ['Head Office', 'Mumbai'] },
      { name: 'HDFC Bank', branches: ['Head Office', 'Mumbai'] },
      { name: 'ICICI Bank', branches: ['Head Office', 'Mumbai'] },
    ],
  },
];

export function findBankByName(name: string): BankOption | undefined {
  for (const group of BANK_GROUPS) {
    const bank = group.banks.find((b) => b.name === name);
    if (bank) return bank;
  }
  return undefined;
}

export function bankBranches(bankName: string): string[] {
  return findBankByName(bankName)?.branches ?? [];
}
