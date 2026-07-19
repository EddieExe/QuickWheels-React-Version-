/**
 * Emergency Contact Card Component
 * Shows the user's emergency contact info
 *
 * FIXES:
 * - No longer navigates away with useNavigate (terrible during an emergency!)
 * - Accepts onOpenModal prop — opens the modal inline instead
 * - Falls back to navigate('/profile') only if no modal handler provided
 * - Phone number shown as a callable link
 */

import { useNavigate } from 'react-router-dom';

export default function EmergencyContactCard({ contact, onOpenModal }) {
  const navigate = useNavigate();

  function handleEdit() {
    if (onOpenModal) {
      onOpenModal();
    } else {
      // Fallback for places that don't have a modal wired up (e.g. Profile page)
      navigate('/profile', { state: { tab: 'emergency' } });
    }
  }

  if (!contact) {
    return (
      <div style={{
        padding: '16px',
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: '22px' }}>⚠️</span>
        <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '700', margin: '8px 0 4px' }}>
          No Emergency Contact Set
        </p>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11px', margin: '0 0 12px' }}>
          Add a contact to receive SOS alerts on your behalf
        </p>
        <button
          onClick={handleEdit}
          style={{
            padding: '7px 18px', borderRadius: '8px',
            border: '1px solid rgba(76,227,247,0.3)',
            background: 'rgba(76,227,247,0.08)',
            color: '#4ce3f7', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(76,227,247,0.14)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(76,227,247,0.08)'}
        >
          + Add Emergency Contact
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(34,197,94,0.05)',
      border: '1px solid rgba(34,197,94,0.2)',
      borderRadius: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Avatar */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #22c55e, #4ce3f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', color: '#fff', fontWeight: '800',
        }}>
          {contact.name?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: '700', lineHeight: 1.2 }}>
            {contact.name}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '3px' }}>
            {contact.relation} ·{' '}
            <a
              href={`tel:${contact.phone}`}
              style={{ color: '#4ce3f7', fontWeight: '600', textDecoration: 'none' }}
            >
              📞 {contact.phone}
            </a>
          </div>
        </div>

        {/* Shared badge */}
        {contact.shareWithSupport && (
          <span style={{
            padding: '2px 8px', borderRadius: '6px', flexShrink: 0,
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
            fontSize: '9px', color: '#22c55e', fontWeight: '700',
          }}>
            SHARED ✓
          </span>
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={handleEdit}
        style={{
          marginTop: '10px',
          padding: '4px 12px', borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '600',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        }}
      >
        ✏️ Edit Contact
      </button>
    </div>
  );
}