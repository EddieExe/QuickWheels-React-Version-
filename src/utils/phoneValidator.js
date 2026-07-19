/**
 * Phone number validation utilities
 * Supports multiple formats and country-specific validation
 */

/**
 * Validate a phone number
 * @param {string} phone - Phone number to validate
 * @param {string} label - Field label used in error messages
 * @returns {string|null} Error message or null when valid
 */
export function validatePhone(phone, label = 'Phone number') {
  if (!phone || phone.trim() === '') {
    return `${label} is required.`;
  }

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return `${label} must be 10 digits.`;
  }

  if (cleaned.length > 10) {
    return `${label} must be 10 digits.`;
  }

  if (/^(\d)\1+$/.test(cleaned)) {
    return `Please enter a valid ${label.toLowerCase()}.`;
  }

  return null;
}

/**
 * Clean a phone number for storage
 * @param {string} phone - Raw phone number
 * @returns {string} Digits-only phone number
 */
export function cleanPhone(phone) {
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5, 10)}`;
  }
  
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return `+${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }
  
  return cleaned;
}