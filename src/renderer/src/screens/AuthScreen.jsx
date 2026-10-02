import { useEffect, useState } from 'react'
import SearchableSelect from '../components/SearchableSelect'
import { emailAlreadyPlayed, phoneAlreadyPlayed, signUp } from '../lib/auth'
import { getLeaderboardSettings } from '../lib/leaderboard'
import { INDIAN_STATES } from '../data/indianStates'

const PHONE_LENGTH = 10
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

function validate(form) {
  const errs = {}
  const firstName = form.firstName.trim()
  const lastName = form.lastName.trim()
  const email = form.email.trim()
  const company = form.company.trim()
  const designation = form.designation.trim()
  const state = form.state.trim()
  const industry = form.industry.trim()

  if (!firstName) errs.firstName = 'First name is required'
  else if (firstName.length < 2) errs.firstName = 'First name must be at least 2 characters'
  else if (firstName.length > 50) errs.firstName = 'First name must be under 50 characters'
  else if (!NAME_RE.test(firstName)) errs.firstName = 'First name can only contain letters'

  if (!lastName) errs.lastName = 'Last name is required'
  else if (lastName.length < 2) errs.lastName = 'Last name must be at least 2 characters'
  else if (lastName.length > 50) errs.lastName = 'Last name must be under 50 characters'
  else if (!NAME_RE.test(lastName)) errs.lastName = 'Last name can only contain letters'

  if (!form.phone) errs.phone = 'Mobile number is required'
  else if (form.phone.length !== PHONE_LENGTH)
    errs.phone = `Mobile number must be exactly ${PHONE_LENGTH} digits`

  if (!email) errs.email = 'Email is required'
  else if (email.length > 100 || !EMAIL_RE.test(email)) errs.email = 'Enter a valid email address'

  if (!company) errs.company = 'Company is required'
  else if (company.length < 2) errs.company = 'Company must be at least 2 characters'
  else if (company.length > 100) errs.company = 'Company must be under 100 characters'

  if (designation.length > 50) errs.designation = 'Job title must be under 50 characters'

  if (state.length > 50) errs.state = 'State must be under 50 characters'

  if (!industry) errs.industry = 'Industry is required'
  else if (industry.length < 2) errs.industry = 'Industry must be at least 2 characters'
  else if (industry.length > 100) errs.industry = 'Industry must be under 100 characters'

  if (!form.consent) errs.consent = 'Please accept to continue'
  return errs
}

const EMPTY = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  company: '',
  designation: '',
  state: '',
  industry: '',
  consent: false,
  marketingConsent: false
}

export default function AuthScreen({ onAuth, onLeaderboard, onAdmin }) {
  const [leaderboardVisible, setLeaderboardVisible] = useState(false)
  const [activeEvent, setActiveEvent] = useState('')

  useEffect(() => {
    let cancelled = false
    getLeaderboardSettings()
      .then((s) => {
        if (!cancelled) setLeaderboardVisible(s.visible)
      })
      .catch(() => {}) // if this fails, just keep the link hidden
    window.api.db
      .getGameSettings()
      .then((s) => {
        if (!cancelled) setActiveEvent(s.activeEvent || '')
      })
      .catch(() => {}) // no admin-set event: just don't show one
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="screen signup-screen">
      <div className="lb-angles" aria-hidden="true" />

      <header className="leaderboard-header">
        <div className="lb-logo">
          <span className="lb-logo-main">PIP</span>
          <span className="lb-logo-sub">Global Safety</span>
        </div>
        <div className="lb-heading">
          <h1>
            <span className="lb-chevrons">›››</span> Spot The Hazards
          </h1>
          <p className="lb-sub">
            Safety Challenge <span className="lb-sep">|</span> One attempt per mobile number
          </p>
        </div>
      </header>

      {activeEvent && (
        <div className="lb-event-badge-row">
          <p className="lb-event-badge">
            <span className="lb-event-badge-dot" aria-hidden="true" />
            {activeEvent}
          </p>
        </div>
      )}

      <div className="signup-card">
        <SignUpForm onAuth={onAuth} />
      </div>

      <div className="signup-footer">
        {leaderboardVisible && (
          <>
            <button type="button" className="signup-link" onClick={onLeaderboard}>
              View Leaderboard
            </button>
            <span className="lb-sep">|</span>
          </>
        )}
        <button type="button" className="signup-link signup-link-muted" onClick={onAdmin}>
          Admin
        </button>
      </div>
    </div>
  )
}

function SignUpForm({ onAuth }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    // clear this field's error as soon as the player edits it
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const update = (key) => (e) => {
    let value = key === 'consent' || key === 'marketingConsent' ? e.target.checked : e.target.value
    // mobile: digits only, never more than 10 (also blocks pasting a longer number)
    if (key === 'phone') value = value.replace(/\D/g, '').slice(0, PHONE_LENGTH)
    setField(key, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSubmitting(true)
    try {
      // duplicate checks need the database, so they run after the form itself is valid
      const [phoneTaken, emailTaken] = await Promise.all([
        phoneAlreadyPlayed(form.phone),
        emailAlreadyPlayed(form.email)
      ])
      if (phoneTaken || emailTaken) {
        setErrors({
          phone: phoneTaken
            ? 'This mobile number already exists. Each player gets one attempt.'
            : undefined,
          email: emailTaken ? 'This email already exists. Each player gets one attempt.' : undefined
        })
        return
      }
      onAuth(await signUp(form))
    } catch (err) {
      setErrors({ form: `Could not save your details: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h2 className="signup-title">Player Details</h2>
      <p className="signup-sub">Fill in your details to start playing.</p>
      <form className="signup-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            value={form.firstName}
            onChange={update('firstName')}
            placeholder="First name"
            maxLength={50}
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName && <span className="error">{errors.firstName}</span>}
        </div>

        <div className="field">
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            value={form.lastName}
            onChange={update('lastName')}
            placeholder="Last name"
            maxLength={50}
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName && <span className="error">{errors.lastName}</span>}
        </div>

        <div className="field">
          <label htmlFor="company">Company Name</label>
          <input
            id="company"
            value={form.company}
            onChange={update('company')}
            placeholder="Company name"
            maxLength={100}
            aria-invalid={Boolean(errors.company)}
          />
          {errors.company && <span className="error">{errors.company}</span>}
        </div>

        <div className="field">
          <label htmlFor="designation">Job Title</label>
          <input
            id="designation"
            value={form.designation}
            onChange={update('designation')}
            placeholder="Your job title"
            maxLength={50}
            aria-invalid={Boolean(errors.designation)}
          />
          {errors.designation && <span className="error">{errors.designation}</span>}
        </div>

        <div className="field">
          <label htmlFor="email">Business Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="you@company.com"
            maxLength={100}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div className="field">
          <label htmlFor="phone">Contact Number</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={update('phone')}
            placeholder="10-digit mobile number"
            maxLength={PHONE_LENGTH}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <span className="error">{errors.phone}</span>}
        </div>

        <div className="field">
          <label htmlFor="state">State</label>
          <SearchableSelect
            id="state"
            value={form.state}
            onChange={(v) => setField('state', v)}
            options={INDIAN_STATES}
            placeholder="Select your state"
            searchPlaceholder="Search states..."
            ariaInvalid={Boolean(errors.state)}
          />
          {errors.state && <span className="error">{errors.state}</span>}
        </div>

        <div className="field">
          <label htmlFor="industry">Industry</label>
          <input
            id="industry"
            value={form.industry}
            onChange={update('industry')}
            placeholder="Your industry"
            maxLength={100}
            aria-invalid={Boolean(errors.industry)}
          />
          {errors.industry && <span className="error">{errors.industry}</span>}
        </div>

        <div className="field field-wide field-consent">
          <label className="consent-label">
            <input type="checkbox" checked={form.consent} onChange={update('consent')} />
            <span>
              I would like to be contacted by PIP Global Safety to discuss my specific requirements.
            </span>
          </label>
          {errors.consent && <span className="error">{errors.consent}</span>}
        </div>

        <div className="field field-wide field-consent">
          <label className="consent-label">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={update('marketingConsent')}
            />
            <span>
              By checking this box, you agree to receive marketing e-communications, including
              updates about our offering, special offers, news and events from PIP Global Safety.
            </span>
          </label>
        </div>

        {errors.form && <p className="error field-wide">{errors.form}</p>}

        <button type="submit" className="lb-button signup-submit field-wide" disabled={submitting}>
          {submitting ? 'Please wait...' : 'Start Game'}
        </button>
      </form>
    </>
  )
}
