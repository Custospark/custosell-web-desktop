export interface EastAfricaBank {
  name: string;
  branches: string[];
}

export interface EastAfricaBankGroup {
  country: string;
  banks: EastAfricaBank[];
}

export const OTHER_OPTION = '__other__';

export const EAST_AFRICA_BANKS_BY_COUNTRY: EastAfricaBankGroup[] = [
  {
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
      { name: 'Banque de l\'Habitat du Rwanda', branches: ['Head Office', 'Kigali'] },
      { name: 'Unguka Bank', branches: ['Head Office', 'Kigali'] },
      { name: 'Zigama CSS', branches: ['Head Office', 'Kigali', 'Huye', 'Musanze'] },
    ],
  },
  {
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
];

export function findBankByName(name: string): EastAfricaBank | undefined {
  for (const group of EAST_AFRICA_BANKS_BY_COUNTRY) {
    const bank = group.banks.find((b) => b.name === name);
    if (bank) return bank;
  }
  return undefined;
}

export function bankBranches(bankName: string): string[] {
  return findBankByName(bankName)?.branches ?? [];
}
