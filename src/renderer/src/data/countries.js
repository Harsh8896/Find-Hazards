// Countries offered in the signup form's contact-number picker. `iso` is the lowercase ISO
// 3166-1 code, which is also the flag-icons class (`fi fi-in`). Flag images are bundled with the
// app (emoji flags don't render on Windows, and the kiosk may be offline).
export const COUNTRIES = [
  { iso: 'in', name: 'India', dial: '91', min: 10, max: 10 },
  { iso: 'ae', name: 'United Arab Emirates', dial: '971', min: 9, max: 9 },
  { iso: 'af', name: 'Afghanistan', dial: '93', min: 9, max: 9 },
  { iso: 'au', name: 'Australia', dial: '61', min: 9, max: 9 },
  { iso: 'bd', name: 'Bangladesh', dial: '880', min: 10, max: 10 },
  { iso: 'bh', name: 'Bahrain', dial: '973', min: 8, max: 8 },
  { iso: 'bt', name: 'Bhutan', dial: '975', min: 8, max: 8 },
  { iso: 'br', name: 'Brazil', dial: '55', min: 10, max: 11 },
  { iso: 'ca', name: 'Canada', dial: '1', min: 10, max: 10 },
  { iso: 'cn', name: 'China', dial: '86', min: 11, max: 11 },
  { iso: 'de', name: 'Germany', dial: '49', min: 10, max: 11 },
  { iso: 'eg', name: 'Egypt', dial: '20', min: 10, max: 10 },
  { iso: 'es', name: 'Spain', dial: '34', min: 9, max: 9 },
  { iso: 'fr', name: 'France', dial: '33', min: 9, max: 9 },
  { iso: 'gb', name: 'United Kingdom', dial: '44', min: 10, max: 10 },
  { iso: 'hk', name: 'Hong Kong', dial: '852', min: 8, max: 8 },
  { iso: 'id', name: 'Indonesia', dial: '62', min: 9, max: 12 },
  { iso: 'iq', name: 'Iraq', dial: '964', min: 10, max: 10 },
  { iso: 'it', name: 'Italy', dial: '39', min: 9, max: 10 },
  { iso: 'jp', name: 'Japan', dial: '81', min: 10, max: 10 },
  { iso: 'ke', name: 'Kenya', dial: '254', min: 9, max: 9 },
  { iso: 'kr', name: 'South Korea', dial: '82', min: 9, max: 10 },
  { iso: 'kw', name: 'Kuwait', dial: '965', min: 8, max: 8 },
  { iso: 'lk', name: 'Sri Lanka', dial: '94', min: 9, max: 9 },
  { iso: 'mm', name: 'Myanmar', dial: '95', min: 8, max: 10 },
  { iso: 'mu', name: 'Mauritius', dial: '230', min: 8, max: 8 },
  { iso: 'my', name: 'Malaysia', dial: '60', min: 9, max: 10 },
  { iso: 'ng', name: 'Nigeria', dial: '234', min: 10, max: 10 },
  { iso: 'np', name: 'Nepal', dial: '977', min: 10, max: 10 },
  { iso: 'nl', name: 'Netherlands', dial: '31', min: 9, max: 9 },
  { iso: 'nz', name: 'New Zealand', dial: '64', min: 8, max: 10 },
  { iso: 'om', name: 'Oman', dial: '968', min: 8, max: 8 },
  { iso: 'pk', name: 'Pakistan', dial: '92', min: 10, max: 10 },
  { iso: 'ph', name: 'Philippines', dial: '63', min: 10, max: 10 },
  { iso: 'qa', name: 'Qatar', dial: '974', min: 8, max: 8 },
  { iso: 'ru', name: 'Russia', dial: '7', min: 10, max: 10 },
  { iso: 'sa', name: 'Saudi Arabia', dial: '966', min: 9, max: 9 },
  { iso: 'sg', name: 'Singapore', dial: '65', min: 8, max: 8 },
  { iso: 'th', name: 'Thailand', dial: '66', min: 9, max: 9 },
  { iso: 'tr', name: 'Turkey', dial: '90', min: 10, max: 10 },
  { iso: 'us', name: 'United States', dial: '1', min: 10, max: 10 },
  { iso: 'vn', name: 'Vietnam', dial: '84', min: 9, max: 10 },
  { iso: 'za', name: 'South Africa', dial: '27', min: 9, max: 9 }
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // India

// `min`/`max` are the digits of the national number (no dial code, no leading 0). Indian numbers
// stay bare 10 digits (how every existing player is stored); any other country is stored as dial
// code + number, so the phone stays a unique digits-only key.

export const fullPhone = (country, national) =>
  country.iso === 'in' ? national : `${country.dial}${national}`
