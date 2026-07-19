// src/components/ReviewModal.jsx
import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

function ReviewModal({ booking, onClose, onReviewSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const reviewId = `${booking.bookingId}_${Date.now()}`;
      const reviewData = {
        bookingId: booking.bookingId,
        userId: booking.userId,
        userEmail: booking.userEmail,
        userName: booking.userName || booking.userEmail,
        carModel: booking.carModel,
        dealerId: booking.dealerId,
        dealerName: booking.dealerBusinessName,
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "reviews", reviewId), reviewData);
      
      // Also update the booking to mark as reviewed
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        reviewed: true,
        reviewedAt: serverTimestamp(),
      });

      onReviewSubmitted();
      onClose();
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e, #0f0f2a)",
          borderRadius: "24px",
          maxWidth: "500px",
          width: "100%",
          padding: "32px",
          border: "1px solid rgba(255,215,0,0.2)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "rgba(255,255,255,0.05)",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: "16px",
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "48px" }}>⭐</span>
          <h2 style={{ color: "#fff", margin: "8px 0 4px", fontSize: "24px" }}>
            Rate Your Experience
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
            {booking.carModel} · #{booking.bookingId}
          </p>
        </div>

        {/* Star Rating */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "40px",
                  padding: "0",
                  transition: "transform 0.2s",
                  transform: rating >= star || hoverRating >= star ? "scale(1.1)" : "scale(1)",
                }}
              >
                <span
                  style={{
                    color: rating >= star || hoverRating >= star ? "#fbbf24" : "rgba(255,255,255,0.2)",
                    textShadow: rating >= star || hoverRating >= star ? "0 0 10px rgba(251,191,36,0.5)" : "none",
                  }}
                >
                  ★
                </span>
              </button>
            ))}
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: 0 }}>
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent!"}
          </p>
        </div>

        {/* Comment */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#fff", fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
            Your Feedback (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with the car and dealer..."
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#fbbf24")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "16px",
              color: "#ef4444",
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: loading
              ? "rgba(251,191,36,0.3)"
              : "linear-gradient(135deg, #fbbf24, #f59e0b)",
            color: "#000",
            fontWeight: "800",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(251,191,36,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center", marginTop: "16px" }}>
          Your review helps other drivers make better choices
        </p>
      </div>
    </div>
  );
}

export default ReviewModal;