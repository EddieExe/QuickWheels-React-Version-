import { useState, useEffect, useRef } from 'react';
import { uploadToCloudinary } from '../utils/uploadImage';
import { useAuth } from '../context/AuthContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * ProfileImageUpload Component
 * Handles uploading, previewing, and removing profile images
 */
export default function ProfileImageUpload({ currentImageUrl, onImageUpdate }) {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 5MB. Please compress or choose a smaller image.';
    }
    return null;
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!image || !user) return;

    setUploading(true);
    setError('');

    try {
      const result = await uploadToCloudinary(image, (progress) => {
        setUploadProgress(progress);
      });

      setPreview(result.url);
      onImageUpdate(result.url);
      setUploading(false);
      setUploadProgress(0);
      setImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error?.message || 'Failed to upload image. Please try again.');
      setUploading(false);
    }
  }

  async function handleRemove() {
    setPreview(null);
    setImage(null);
    setError('');
    onImageUpdate(null);
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <label className="form_label" style={{ marginBottom: '12px', display: 'block' }}>
        Profile Image
      </label>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Image Preview */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
              style={{ width: '46px', height: '46px' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          )}
        </div>

        {/* Controls */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn"
              style={{
                fontSize: '13px',
                fontWeight: '600',
                padding: '10px 16px',
                borderRadius: '8px',
              }}
            >
              Choose Image
            </button>

            {image && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  backgroundColor: uploading ? "#6b7280" : "#16a34a",
                  transition: "all 0.075s ease-in-out",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  fontFamily: "Quicksand, sans-serif",
                  borderRadius: "8px",
                  border: "none",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.backgroundColor = "#15803d";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.backgroundColor = "#16a34a";
                  }
                }}
              >
                <svg
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    height: "20px",
                    width: "20px",
                    marginRight: "8px"
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                {uploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Upload'}
              </button>
            )}

            {currentImageUrl && !image && (
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  backgroundColor: "#dc2626",
                  transition: "all 0.075s ease-in-out",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "600",
                  fontFamily: "Quicksand, sans-serif",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
              >
                <svg
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    height: "20px",
                    width: "20px",
                    marginRight: "8px"
                  }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                Remove
              </button>
            )}
          </div>

          {error && (
            <p style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '8px',
              marginBottom: 0
            }}>
              {error}
            </p>
          )}

          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '11px',
            marginTop: '6px',
            marginBottom: 0
          }}>
            Max 5MB · JPG, PNG, WebP, or GIF
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginTop: '12px' }}>
          <div style={{
            height: '4px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${uploadProgress}%`,
              background: 'linear-gradient(90deg, #4338ca, #9333ea)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}