import { useEffect, useState } from "react";
import "../styles/scroll.css";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setVisible(scrollTop > 300);
    };

    // listen on both window and document
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      className="back_to_top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
        document.body.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <svg viewBox="0 0 24 24">
        <path d="M12 4l-8 8h5v8h6v-8h5z" />
      </svg>
      <div className="text_container">
        <div className="word_wrapper">
          <span className="text">Back</span>
          <span className="clone">Back</span>
        </div>
        <div className="word_wrapper">
          <span className="text">to</span>
          <span className="clone">to</span>
        </div>
        <div className="word_wrapper">
          <span className="text">Top</span>
          <span className="clone">Top</span>
        </div>
      </div>
    </button>
  );
}

export default BackToTop;