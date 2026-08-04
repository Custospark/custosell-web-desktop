import { CURRENCIES } from '../../../shared/utils/currencies';
import { countryCodes } from '../../../shared/utils/countryCodes';

/**
 * Authoritative storefront location / currency reference data for the filter
 * UI — East Africa first, then the rest. Pure reference data mirrors the
 * Backend's config/storefront-{countries,cities,currencies}.php so the filter
 * bar always shows a complete option set even when few shops have set details.
 *
 * Countries and currencies are derived from the existing shared utilities to
 * stay in sync; cities are a curated reference list (add cities here to expose
 * them in the storefront city filter before any business has set them).
 */

/** Curated storefront city list — East Africa first. */
const STOREFRONT_CITIES: string[] = [
  // East Africa
  'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Kira', 'Nansana', 'Gulu', 'Lira',
  'Arua', 'Jinja', 'Mbale', 'Soroti', 'Mbarara', 'Fort Portal', 'Masaka',
  'Kabale', 'Hoima', 'Tororo', 'Busia', 'Iganga', 'Kasese', 'Mityana',
  'Ntungamo', 'Rukungiri', 'Kitgum', 'Kotido', 'Moroto', 'Nebbi', 'Pader',
  // Uganda — full district/town coverage
  'Abim', 'Adjumani', 'Agago', 'Alebtong', 'Amolatar', 'Amudat', 'Amuria',
  'Amuru', 'Apac', 'Budaka', 'Bududa', 'Bugiri', 'Bugweri', 'Buhweju',
  'Buikwe', 'Bukedea', 'Bukomansimbi', 'Bukwo', 'Bulambuli', 'Buliisa',
  'Bundibugyo', 'Bunyangabu', 'Bushenyi', 'Butaleja', 'Butambala',
  'Butebo', 'Buvuma', 'Buyende', 'Dokolo', 'Gomba', 'Ibanda',
  'Isingiro', 'Kaabong', 'Kabarole', 'Kaberamaido',
  'Kagadi', 'Kakumiro', 'Kalaki', 'Kalangala', 'Kaliro', 'Kalungu',
  'Kamuli', 'Kamwenge', 'Kanungu', 'Kapchorwa', 'Kapelebyong', 'Karenga',
  'Kasanda', 'Katakwi', 'Kayunga', 'Kazo', 'Kibaale', 'Kiboga',
  'Kibuku', 'Kikuube', 'Kiruhura', 'Kiryandongo', 'Kisoro', 'Koboko',
  'Kole', 'Kumi', 'Kween', 'Kyankwanzi', 'Kyegegwa', 'Kyenjojo',
  'Kyotera', 'Lamwo', 'Luuka', 'Luwero', 'Lwengo', 'Lyantonde', 'Madi-Okollo',
  'Manafwa', 'Maracha', 'Masindi', 'Mayuge', 'Mitooma',
  'Moyo', 'Mpigi', 'Mubende',
  'Nabilatuk', 'Nakapiripirit', 'Nakaseke', 'Nakasongola', 'Namayingo',
  'Namisindwa', 'Namutumba', 'Napak', 'Ngora', 'Ntoroko',
  'Nwoya', 'Obongi', 'Omoro', 'Otuke', 'Oyam', 'Pakwach', 'Pallisa',
  'Rakai', 'Rubanda', 'Rubirizi', 'Rwampara', 'Sembabule', 'Serere',
  'Sheema', 'Sironko', 'Terego', 'Yumbe', 'Zombo',
  // Kenya
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Naivasha',
  'Machakos', 'Nyeri', 'Kitale', 'Malindi', 'Lamu', 'Garissa', 'Kakamega',
  // Tanzania
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza', 'Mbeya', 'Zanzibar City',
  'Tanga', 'Morogoro', 'Songea', 'Bukoba', 'Kigoma', 'Iringa', 'Moshi',
  // Rwanda
  'Kigali', 'Huye', 'Musanze', 'Rubavu', 'Muhanga', 'Gicumbi', 'Rusizi',
  // Burundi
  'Bujumbura', 'Gitega', 'Ngozi', 'Muyinga', 'Rumonge',
  // South Sudan
  'Juba', 'Wau', 'Malakal', 'Yei', 'Bor', 'Rumbek', 'Aweil',
  // Ethiopia
  'Addis Ababa', 'Dire Dawa', 'Hawassa', 'Bahir Dar', 'Mekelle', 'Gondar',
  // Somalia
  'Mogadishu', 'Hargeisa', 'Kismayo', 'Baidoa', 'Garowe',
  // Djibouti / Eritrea
  'Djibouti City', 'Asmara', 'Mendefera',
  // West Africa
  'Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan', 'Kaduna', 'Enugu', 'Onitsha',
  'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Dakar', 'Bamako', 'Ouagadougou',
  'Abidjan', 'Conakry', 'Freetown', 'Monrovia', 'Niamey', 'Nouakchott', 'Cotonou', 'Lomé',
  // Central Africa
  'Kinshasa', 'Lubumbashi', 'Douala', 'Yaoundé', 'Brazzaville', 'Libreville', 'Bangui', 'Malabo',
  // Southern Africa
  'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Windhoek', 'Gaborone', 'Harare',
  'Bulawayo', 'Lusaka', 'Ndola', 'Lilongwe', 'Blantyre', 'Maputo', 'Beira', 'Antananarivo', 'Port Louis',
  // North Africa
  'Cairo', 'Alexandria', 'Giza', 'Casablanca', 'Rabat', 'Marrakesh', 'Tangier', 'Tunis',
  'Algiers', 'Tripoli', 'Khartoum', 'Omdurman',
  // Asia
  'Dubai', 'Abu Dhabi', 'Sharjah', 'Riyadh', 'Jeddah', 'Doha', 'Kuwait City', 'Manama', 'Muscat',
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune',
  'Karachi', 'Lahore', 'Islamabad', 'Dhaka', 'Chittagong', 'Kathmandu', 'Colombo',
  'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Chengdu', 'Hong Kong', 'Taipei',
  'Seoul', 'Busan', 'Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Singapore', 'Kuala Lumpur',
  'Bangkok', 'Hanoi', 'Ho Chi Minh City', 'Manila', 'Jakarta', 'Surabaya', 'Bandung',
  'Yangon', 'Phnom Penh', 'Vientiane', 'Ulaanbaatar', 'Astana', 'Almaty', 'Tashkent',
  'Baku', 'Tbilisi', 'Yerevan', 'Istanbul', 'Ankara', 'Izmir', 'Amman', 'Beirut',
  'Damascus', 'Baghdad', 'Basra', 'Tehran', 'Mashhad', 'Tel Aviv', 'Jerusalem',
  // Europe
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol',
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Berlin', 'Hamburg', 'Munich', 'Frankfurt', 'Cologne',
  'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Lisbon', 'Porto', 'Rome', 'Milan', 'Naples', 'Turin', 'Venice',
  'Amsterdam', 'Rotterdam', 'The Hague', 'Brussels', 'Antwerp', 'Vienna', 'Graz', 'Zurich', 'Geneva', 'Basel',
  'Stockholm', 'Gothenburg', 'Oslo', 'Bergen', 'Copenhagen', 'Helsinki', 'Reykjavik',
  'Warsaw', 'Kraków', 'Prague', 'Budapest', 'Bratislava', 'Ljubljana', 'Zagreb', 'Sarajevo',
  'Belgrade', 'Skopje', 'Tirana', 'Bucharest', 'Cluj-Napoca', 'Sofia', 'Athens', 'Thessaloniki',
  'Kyiv', 'Odesa', 'Minsk', 'Moscow', 'Saint Petersburg', 'Dublin', 'Cork', 'Edinburgh', 'Cardiff', 'Belfast',
  // North America
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
  'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus',
  'Seattle', 'Denver', 'Washington DC', 'Boston', 'Nashville', 'Atlanta', 'Miami', 'Tampa', 'Orlando',
  'San Francisco', 'Portland', 'Las Vegas', 'Detroit', 'Minneapolis', 'Milwaukee', 'Kansas City',
  'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City',
  'Mexico City', 'Guadalajara', 'Monterrey', 'Tijuana', 'Puebla', 'Cancún', 'Guatemala City',
  'San Juan', 'Havana', 'Kingston', 'Port-au-Prince', 'Santo Domingo', 'Panama City', 'San José',
  'Managua', 'Tegucigalpa', 'San Salvador',
  // South America
  'São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus',
  'Buenos Aires', 'Córdoba', 'Rosario', 'Lima', 'Arequipa', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla',
  'Caracas', 'Maracaibo', 'Santiago', 'Valparaíso', 'Quito', 'Guayaquil', 'La Paz', 'Santa Cruz',
  'Asunción', 'Montevideo', 'Georgetown', 'Paramaribo',
  // Oceania
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'Gold Coast',
  'Auckland', 'Wellington', 'Christchurch', 'Hobart', 'Suva', 'Port Moresby', 'Nouméa',
];

/** Currency codes to surface first in the storefront currency filter (East Africa). */
const EAST_AFRICA_FIRST: string[] = ['UGX', 'KES', 'TZS', 'RWF', 'BIF', 'SSP', 'ETB', 'SOS', 'DJF', 'ERN'];

/** Currencies as { code, symbol, name }, East Africa first, then the rest. */
export const STOREFRONT_CURRENCIES = (() => {
  const seen = new Set<string>();
  const ordered: typeof CURRENCIES = [];
  for (const code of EAST_AFRICA_FIRST) {
    const c = CURRENCIES.find((x) => x.code === code);
    if (c) {
      ordered.push(c);
      seen.add(code);
    }
  }
  for (const c of CURRENCIES) {
    if (!seen.has(c.code)) ordered.push(c);
  }
  return ordered;
})();

/** Country names, East Africa first, then the rest. */
export const STOREFRONT_COUNTRIES = (() => {
  const names = countryCodes.map((c) => c.name);
  const priority = [
    'Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
    'Ethiopia', 'Somalia', 'Djibouti', 'Eritrea',
  ];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const n of priority) {
    const hit = names.find((x) => x === n);
    if (hit) {
      ordered.push(hit);
      seen.add(hit);
    }
  }
  for (const n of names) {
    if (!seen.has(n)) ordered.push(n);
  }
  return ordered;
})();

/** Deduplicated city list, East Africa first. */
export const STOREFRONT_CITIES_REF = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const city of STOREFRONT_CITIES) {
    const key = city.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(city);
    }
  }
  return out;
})();