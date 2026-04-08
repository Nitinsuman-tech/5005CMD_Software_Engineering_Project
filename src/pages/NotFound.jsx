import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./NotFound.css";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Page Not Found - Komodo Hub";
  }, []);

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-icon">404</div>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <button
          className="not-found-btn"
          onClick={() => navigate("/")}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
