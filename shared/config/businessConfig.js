/**
 * Brand and legal entity of the commercial offer, in one place so they can change (e.g. when a company is created):
 * the legal pages (terms, data processing agreement, privacy) and the product texts read them from here.
 */
export const BRAND = Object.freeze({
  product: 'CondoFlow', // what is sold: condominium management
  platform: 'Timeboard', // the platform it is a product of
  domain: 'timeboard.pt'
});

// Who sells the service and processes the data (today an individual; replace with the company's data later)
export const LEGAL_ENTITY = Object.freeze({
  name: 'Igor Matos',
  taxId: '290664063',
  email: 'igormatos@gmail.com',
  address: '',
  country: 'Portugal'
});

// Sub-processors used to run the service (privacy policy and data processing agreement)
export const SUBPROCESSORS = Object.freeze([
  Object.freeze({ name: 'Supabase', purposeKey: 'database' }),
  Object.freeze({ name: 'Vercel', purposeKey: 'hosting' }),
  Object.freeze({ name: 'Brevo', purposeKey: 'email' }),
  Object.freeze({ name: 'Google (Firebase Cloud Messaging)', purposeKey: 'push' }),
  Object.freeze({ name: 'Google (Sign-In)', purposeKey: 'login' })
]);

// Date the legal documents were last changed
export const LEGAL_LAST_UPDATED = '2026-10-21';
