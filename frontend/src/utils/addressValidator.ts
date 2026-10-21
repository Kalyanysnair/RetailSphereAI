import { UserProfile } from '../services/api';

const INVALID_PLACEHOLDERS = new Set([
  'default address',
  'default city',
  'default state',
  'not provided',
  'none',
  'n/a',
  'na',
  'test',
  'sample',
  '000000',
  '123456',
]);

export interface AddressValidationResult {
  isValid: boolean;
  missingFields: string[];
  reason?: string;
  formattedAddress?: string;
}

/**
 * Checks whether an authenticated user profile contains a complete, genuine,
 * and valid delivery address in the PostgreSQL database.
 * 
 * Rules:
 * - Recipient Full Name: minimum 2 characters
 * - Contact Phone: valid 10-digit Indian phone number
 * - Address: house, street, locality (minimum 5 chars, not placeholder)
 * - City / District: minimum 2 chars, not placeholder
 * - State: minimum 2 chars, not placeholder
 * - PIN Code: valid 6-digit Indian postal code (regex /^\d{6}$/ and not '000000')
 */
export function isProfileAddressValid(user: UserProfile | null | undefined): AddressValidationResult {
  if (!user) {
    return {
      isValid: false,
      missingFields: ['user'],
      reason: 'Please log in to your account to verify your delivery address.',
    };
  }

  const missing: string[] = [];

  const fullName = (user.full_name || '').trim();
  if (!fullName || fullName.length < 2) {
    missing.push('Full Name');
  }

  const rawPhone = (user.phone || '').trim().replace(/\D/g, '');
  if (!rawPhone || rawPhone.length < 10) {
    missing.push('Phone Number (10 digits)');
  }

  const cust = user.customer;
  if (!cust) {
    return {
      isValid: false,
      missingFields: ['Address', 'City', 'State', 'PIN Code'],
      reason: 'No saved delivery profile found. Please add your delivery address.',
    };
  }

  const address = (cust.address || '').trim();
  if (!address || address.length < 5 || INVALID_PLACEHOLDERS.has(address.toLowerCase())) {
    missing.push('Street / House Address');
  }

  const city = (cust.city || '').trim();
  if (!city || city.length < 2 || INVALID_PLACEHOLDERS.has(city.toLowerCase())) {
    missing.push('City / District');
  }

  const state = (cust.state || '').trim();
  if (!state || state.length < 2 || INVALID_PLACEHOLDERS.has(state.toLowerCase())) {
    missing.push('State');
  }

  const pincode = (cust.pincode || '').trim().replace(/\D/g, '');
  if (!pincode || !/^\d{6}$/.test(pincode) || INVALID_PLACEHOLDERS.has(pincode)) {
    missing.push('Valid 6-digit PIN Code');
  }

  if (missing.length > 0) {
    return {
      isValid: false,
      missingFields: missing,
      reason: `Missing or incomplete fields: ${missing.join(', ')}.`,
    };
  }

  const formatted = [
    fullName,
    address,
    city,
    `${state} - ${pincode}`,
    `Phone: ${rawPhone}`,
  ]
    .filter(Boolean)
    .join(', ');

  return {
    isValid: true,
    missingFields: [],
    formattedAddress: formatted,
  };
}
