import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveEmergencyContact, getEmergencyContact } from '../utils/emergencyService';
import { cleanPhone, validatePhone } from '../utils/phoneValidator';

/**
 * EmergencyContactModal Component
 * Allows users to add/edit emergency contact information
 *
 * FIXES:
 * - Success auto-close timer increased 1500ms → 2500ms (was too fast to read)
 * - onSave receives cleaned/trimmed data (consistent with what's saved to Firestore)
 * - Loading state properly blocked during submit (was possible to double-submit)
 * - Escape key closes modal
 * - Phone field shows +91 prefix hint for Indian numbers
 * - Phone + Relationship now sit side by side instead of stacked
 * - Modal header is now sticky within the card, and overlay padding accounts
 *   for the fixed navbar, so the title/close button never sit hidden behind
 *   it or scroll out of view
 * - Emoji glyphs replaced with inline SVGs colored to the site's indigo/purple system
 */
export default function EmergencyContactModal({ isOpen, onClose, onSave }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relation: '',
    shareWithSupport: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && user) {
      loadEmergencyContact();
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  async function loadEmergencyContact() {
    try {
      const contact = await getEmergencyContact(user.uid);
      if (contact) {
        setFormData({
          name: contact.name || '',
          phone: contact.phone || '',
          relation: contact.relation || '',
          shareWithSupport: contact.shareWithSupport || false,
        });
      }
    } catch (err) {
      console.error('Error loading emergency contact:', err);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
    setSuccess('');
  }

  function handlePhoneChange(e) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Emergency contact name is required.');
      return;
    }
    if (formData.name.trim().length > 50) {
      setError('Name must be 50 characters or less.');
      return;
    }

    const phoneErr = validatePhone(formData.phone, 'Contact number');
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    if (!formData.relation.trim()) {
      setError('Please select your relationship with this contact.');
      return;
    }

    setLoading(true);

    const cleanedData = {
      name: formData.name.trim(),
      phone: cleanPhone(formData.phone),
      relation: formData.relation.trim(),
      shareWithSupport: formData.shareWithSupport,
    };

    try {
      await saveEmergencyContact(user.uid, cleanedData);
      setSuccess('Emergency contact saved successfully!');

      if (onSave) onSave(cleanedData);

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      setError('Failed to save emergency contact. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const relationOptions = [
    'Spouse', 'Parent', 'Sibling', 'Child',
    'Friend', 'Partner', 'Guardian', 'Other',
  ];

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 10050, padding: '110px 20px 30px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(12,12,22,0.98) 0%, rgba(20,20,40,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          maxWidth: '480px',
          width: '100%',
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(147,51,234,0.1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header — stays visible even if the form scrolls, and
            never sits underneath the fixed site navbar since the overlay
            itself now starts below it */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 2,
          background: 'linear-gradient(135deg, rgba(12,12,22,0.98) 0%, rgba(20,20,40,0.98) 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '28px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px', flexShrink: 0, marginTop: '2px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.2px' }}>
                Emergency Contact
              </h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                Used for SOS alerts and emergency notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '9px',
              width: '34px', height: '34px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
              flexShrink: 0, transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 28px 24px' }}>
          {/* Feedback */}
          {error && (
            <div style={{
              padding: '11px 14px', background: 'rgba(239,68,68,0.09)',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px',
              marginBottom: '16px', color: '#ef4444', fontSize: '13px', fontWeight: '500',
            }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{
              padding: '11px 14px', background: 'rgba(34,197,94,0.09)',
              border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px',
              marginBottom: '16px', color: '#22c55e', fontSize: '13px', fontWeight: '500',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px', flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Contact Name *</label>
              <input
                style={inputStyle}
                type="text"
                name="name"
                placeholder="Full name of emergency contact"
                value={formData.name}
                onChange={handleChange}
                maxLength={50}
                required
                onFocus={(e) => e.target.style.borderColor = 'rgba(147,51,234,0.4)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Phone + Relationship — side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Contact Number *</label>
                <input
                  style={inputStyle}
                  type="tel"
                  name="phone"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                  onFocus={(e) => e.target.style.borderColor = 'rgba(147,51,234,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: '10.5px', lineHeight: '1.4' }}>
                  10-digit Indian mobile, no spaces/dashes
                </p>
              </div>

              <div>
                <label style={labelStyle}>Relationship *</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  required
                  onFocus={(e) => e.target.style.borderColor = 'rgba(147,51,234,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  <option value="" style={{ background: '#1a1a2e' }}>Select</option>
                  {relationOptions.map(opt => (
                    <option key={opt} value={opt} style={{ background: '#1a1a2e' }}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Share with support */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="shareWithSupport"
                  checked={formData.shareWithSupport}
                  onChange={handleChange}
                  style={{ width: '17px', height: '17px', accentColor: '#9333ea', cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                />
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '600' }}>
                    Share with QuickWheels Support
                  </span>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '11px', lineHeight: '1.4' }}>
                    Allow our support team to contact your emergency contact if needed
                  </p>
                </div>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn"
            >
              {loading ? (
                'Saving...'
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Emergency Contact
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div style={{
            marginTop: '18px', padding: '12px 14px',
            background: 'rgba(147,51,234,0.04)',
            border: '1px solid rgba(147,51,234,0.1)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'flex-start', gap: '8px',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', flexShrink: 0, marginTop: '2px' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '11px', lineHeight: '1.5' }}>
              Your emergency contact information is securely stored and only shared with
              QuickWheels support if you enable the option above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}