// Countries offered in the signup form's contact-number picker. `iso` is the lowercase ISO
// 3166-1 code, which is also the flag-icons class (`fi fi-in`). Flag images are bundled with the
// app (emoji flags don't render on Windows, and the kiosk may be offline).
export const COUNTRIES = [
  { iso: 'in', name: 'India', dial: '91', min: 10, max: 10 },
  { iso: 'ae', name: 'United Arab Emirates', dial: '971', min: 9, max: 9 },
  ...[
    { iso: 'am', name: 'Armenia', dial: '374', min: 8, max: 8 },
    { iso: 'az', name: 'Azerbaijan', dial: '994', min: 9, max: 9 },
    { iso: 'bn', name: 'Brunei', dial: '673', min: 7, max: 7 },
    { iso: 'kh', name: 'Cambodia', dial: '855', min: 8, max: 9 },
    { iso: 'cy', name: 'Cyprus', dial: '357', min: 8, max: 8 },
    { iso: 'ge', name: 'Georgia', dial: '995', min: 9, max: 9 },
    { iso: 'ir', name: 'Iran', dial: '98', min: 10, max: 10 },
    { iso: 'il', name: 'Israel', dial: '972', min: 9, max: 9 },
    { iso: 'jo', name: 'Jordan', dial: '962', min: 9, max: 9 },
    { iso: 'kz', name: 'Kazakhstan', dial: '7', min: 10, max: 10 },
    { iso: 'kg', name: 'Kyrgyzstan', dial: '996', min: 9, max: 9 },
    { iso: 'la', name: 'Laos', dial: '856', min: 9, max: 10 },
    { iso: 'lb', name: 'Lebanon', dial: '961', min: 7, max: 8 },
    { iso: 'mo', name: 'Macau', dial: '853', min: 8, max: 8 },
    { iso: 'mv', name: 'Maldives', dial: '960', min: 7, max: 7 },
    { iso: 'mn', name: 'Mongolia', dial: '976', min: 8, max: 8 },
    { iso: 'kp', name: 'North Korea', dial: '850', min: 10, max: 10 },
    { iso: 'ps', name: 'Palestine', dial: '970', min: 9, max: 9 },
    { iso: 'sy', name: 'Syria', dial: '963', min: 9, max: 9 },
    { iso: 'tw', name: 'Taiwan', dial: '886', min: 9, max: 9 },
    { iso: 'tj', name: 'Tajikistan', dial: '992', min: 9, max: 9 },
    { iso: 'tl', name: 'Timor-Leste', dial: '670', min: 8, max: 8 },
    { iso: 'tm', name: 'Turkmenistan', dial: '993', min: 8, max: 8 },
    { iso: 'uz', name: 'Uzbekistan', dial: '998', min: 9, max: 9 },
    { iso: 'ye', name: 'Yemen', dial: '967', min: 9, max: 9 }
  ],
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
].sort((a, b) => {
  // India and UAE stay pinned on top; the rest are alphabetical
  const pin = (c) => (c.iso === 'in' ? 0 : c.iso === 'ae' ? 1 : 2)
  return pin(a) - pin(b) || a.name.localeCompare(b.name)
})

export const DEFAULT_COUNTRY = COUNTRIES[0] // India

// `min`/`max` are the digits of the national number (no dial code, no leading 0). Indian numbers
// stay bare 10 digits (how every existing player is stored); any other country is stored as dial
// code + number, so the phone stays a unique digits-only key.

export const fullPhone = (country, national) =>
  country.iso === 'in' ? national : `${country.dial}${national}`

// Reverse of fullPhone: bare 10 digits are Indian; otherwise match the dial code + length.
export const dialCodeFromPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return '+91'
  const match = COUNTRIES.filter(
    (c) =>
      c.iso !== 'in' &&
      digits.startsWith(c.dial) &&
      digits.length - c.dial.length >= c.min &&
      digits.length - c.dial.length <= c.max
  ).sort((a, b) => b.dial.length - a.dial.length)[0]
  return match ? `+${match.dial}` : ''
}
