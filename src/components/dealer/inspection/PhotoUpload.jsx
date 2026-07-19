// src/components/dealer/inspection/PhotoUpload.jsx
import { useState, useRef } from "react";

const T = {
  cyan: "#9333ea",
  green: "#22c55e",
  red: "#ef4444",
  textSec: "rgba(255,255,255,0.4)",
};

export default function PhotoUpload({ 
  section, 
  photos = [], 
  onPhotosChange, 
  maxPhotos = 10,
  multiple = true 
}) {
  const [previewUrls, setPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed for this section`);
      return;
    }
    
    const newPhotos = [...photos, ...files];
    onPhotosChange(newPhotos);
    
    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
    
    // Revoke URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    const newPreviews = [...previewUrls];
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "12px"
      }}>
        <label style={{ 
          fontSize: "13px", 
          fontWeight: "600", 
          color: T.cyan,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}>
          {section} Photos
        </label>
        <span style={{ fontSize: "11px", color: T.textSec }}>
          {photos.length}/{maxPhotos}
        </span>
      </div>
      
      {/* Photo grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
        gap: "10px",
        marginBottom: "12px"
      }}>
        {previewUrls.map((url, index) => (
          <div key={index} style={{ position: "relative" }}>
            <img 
              src={url} 
              alt={`${section} ${index + 1}`}
              style={{
                width: "100%",
                height: "100px",
                objectFit: "cover",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,.1)"
              }}
            />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "rgba(0,0,0,.7)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px"
              }}
            >
              ×
            </button>
          </div>
        ))}
        
        {/* Add photo button */}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: "100px",
              background: "rgba(255,255,255,.03)",
              border: "2px dashed rgba(255,255,255,.1)",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              transition: "all .2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.cyan;
              e.currentTarget.style.background = `${T.cyan}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,.1)";
              e.currentTarget.style.background = "rgba(255,255,255,.03)";
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textSec} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span style={{ fontSize: "11px", color: T.textSec }}>Add Photo</span>
          </button>
        )}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      
      <div style={{ fontSize: "10px", color: T.textSec, marginTop: "4px" }}>
        Supported formats: JPG, PNG, WebP. Max 5MB per photo.
      </div>
    </div>
  );
}