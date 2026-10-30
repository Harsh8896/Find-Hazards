// Sign-up fields the admin can mark required/optional (mobile is the player key: always required).
export const SIGNUP_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'company', label: 'Company Name' },
  { key: 'designation', label: 'Job Title' },
  { key: 'email', label: 'Business Email' },
  { key: 'state', label: 'State' },
  { key: 'industry', label: 'Industry' },
  { key: 'consent', label: 'Contact Consent' },
  { key: 'marketingConsent', label: 'Marketing Consent' }
]

// Matches the original hard-coded form rules; used until settings load.
export const DEFAULT_REQUIRED_FIELDS = {
  firstName: true,
  lastName: true,
  company: true,
  designation: false,
  email: true,
  state: false,
  industry: false,
  consent: true,
  marketingConsent: true
}
