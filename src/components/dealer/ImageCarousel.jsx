// components/dealer/ImageCarousel.jsx
// Reusable swipeable image carousel — smooth drag-to-slide with snap.
// Uses Pointer Events so the same code handles touch AND mouse drag.
import { useState, useRef, useEffect } from "react";

export default function ImageCarousel({
  images,
  alt = "",
  height = "185px",
  dotColor = "#0ea5e9",
  arrows = false,
  counter = false,
  loop = false,
  rounded,
  onIndexChange,
}) {
  const wrapRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [slideW, setSlideW] = useState(0);
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const pointerIdRef = useRef(null);

  const imgs = images && images.length ? images : ["/Images/placeholder-car.png"];

  // Measure the container so we can slide by exact pixel widths —
  // this is what makes the motion feel 1:1 with the finger/cursor.
  useEffect(() => {
    function measure() {
      if (wrapRef.current) setSlideW(wrapRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Reset if the image list shrinks (e.g. after an edit) and current index is now out of range.
  useEffect(() => {
    if (index > imgs.length - 1) setIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs.length]);

  useEffect(() => {
    onIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goTo(i) {
    if (loop) {
      const n = imgs.length;
      setIndex(((i % n) + n) % n);
    } else {
      setIndex(Math.max(0, Math.min(imgs.length - 1, i)));
    }
  }

  function onPointerDown(e) {
    if (imgs.length <= 1) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    movedRef.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 4) movedRef.current = true;
    setDragX(delta);
  }
  function endDrag() {
    if (!dragging) return;
    const threshold = Math.max(slideW * 0.16, 36);
    if (dragX < -threshold) goTo(index + 1);
    else if (dragX > threshold) goTo(index - 1);
    setDragX(0);
    setDragging(false);
    pointerIdRef.current = null;
  }

  const translateX = -index * slideW + dragX;
  const atStart = index === 0;
  const atEnd = index === imgs.length - 1;

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        height,
        width: "100%",
        overflow: "hidden",
        touchAction: imgs.length > 1 ? "pan-y" : "auto",
        cursor: imgs.length > 1 ? (dragging ? "grabbing" : "grab") : "default",
        ...(rounded ? { borderRadius: rounded } : {}),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={dragging ? endDrag : undefined}
    >
      <div
        style={{
          display: "flex",
          height: "100%",
          width: slideW ? imgs.length * slideW : "100%",
          transform: `translate3d(${translateX}px,0,0)`,
          transition: dragging ? "none" : "transform 0.38s cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        {imgs.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={alt}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              width: slideW || "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              flexShrink: 0,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {imgs.length > 1 && arrows && (
        <>
          {(loop || !atStart) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index - 1);
              }}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(10,10,22,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(147,51,234,0.25)";
                e.currentTarget.style.borderColor = "#a855f7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(10,10,22,0.7)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {(loop || !atEnd) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index + 1);
              }}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(10,10,22,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
                transition: "background 0.2s ease, border-color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(147,51,234,0.25)";
                e.currentTarget.style.borderColor = "#a855f7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(10,10,22,0.7)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </>
      )}

      {imgs.length > 1 && counter && (
        <div
          style={{
            position: "absolute",
            bottom: arrows || counter ? "38px" : "10px",
            right: "16px",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "3px 9px",
            fontSize: "10px",
            fontWeight: "700",
            color: "rgba(255,255,255,0.7)",
            zIndex: 5,
          }}
        >
          {index + 1} / {imgs.length}
        </div>
      )}

      {imgs.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "5px",
            zIndex: 5,
          }}
        >
          {imgs.map((_, i) => (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i);
              }}
              style={{
                width: i === index ? "16px" : "5px",
                height: "5px",
                borderRadius: "3px",
                cursor: "pointer",
                background: i === index ? dotColor : "rgba(255,255,255,0.45)",
                transition: "width 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s ease",
                boxShadow: i === index ? `0 0 8px ${dotColor}80` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}