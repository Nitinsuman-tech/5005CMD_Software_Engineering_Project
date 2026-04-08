import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import "./MyCanvas.css";

export default function MyCanvas() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    if (!user) return;

    
    const q = query(
      collection(db, "contributions"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setContributions(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching canvas data:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending":
        return "Pending Review";
      case "reviewed":
        return "Reviewed";
      case "published":
        return "Published";
      default:
        return status || "Pending";
    }
  };

  const getStatusClass = (status) => {
    if (status === "reviewed") return "status-reviewed";
    if (status === "published") return "status-published";
    return "status-pending";
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  
  const renderTimeline = () => {
    if (contributions.length === 0) return null;

    return (
      <div className="canvas-timeline">
        {contributions.map((c) => {
          let actionText = `${c.type || "Sighting Report"} Submitted`;
          if (c.status === "reviewed") actionText = `${c.type || "Sighting Report"} Reviewed`;
          if (c.isVisibleInSchool || c.isVisibleInCommunity || c.isVisibleInPublic) {
            actionText = `${c.type || "Sighting Report"} Published!`;
          }

          return (
            <div key={`timeline-${c.id}`} className="timeline-node">
              <div className="timeline-date">{formatDate(c.createdAt)}</div>
              <div className="timeline-action">{actionText}</div>
              <div className={`timeline-status ${getStatusClass(c.status)}`}>
                {getStatusLabel(c.status)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const rolePrefix = userData?.role === "member" ? "/member" : "/student";
  const displayName = userData?.displayName || user?.email?.split("@")[0] || "Student";

  return (
    <div className="my-canvas-page">
      <div className="canvas-header">
        <div className="canvas-header-info">
          <h2>🎨 {displayName}'s Canvas</h2>
          <p className="canvas-subtitle">Your unified conservation portfolio and timeline.</p>
        </div>
        <button
          className="canvas-new-btn"
          onClick={() => navigate(`${rolePrefix}/sightings`)}
          style={{
            background: "#2E7D32",
            color: "white",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          + Submit Work
        </button>
      </div>

      <div className="canvas-stats-bar">
        <div className="canvas-stat">
          <span className="canvas-stat-num">{contributions.length}</span>
          <span className="canvas-stat-label">Total Contributions</span>
        </div>
        <div className="canvas-stat">
          <span className="canvas-stat-num">
            {contributions.filter((c) => c.status === "pending").length}
          </span>
          <span className="canvas-stat-label">Pending Review</span>
        </div>
        <div className="canvas-stat">
          <span className="canvas-stat-num">
            {contributions.filter((c) => c.isVisibleInSchool || c.isVisibleInCommunity || c.isVisibleInPublic).length}
          </span>
          <span className="canvas-stat-label">Published Works</span>
        </div>
      </div>

      <div className="canvas-layout">
        <div className="canvas-main-col">
          <h3 className="canvas-section-title">📂 My Contributions</h3>

          {loading ? (
            <div>
              <div className="skeleton-loader"></div>
              <div className="skeleton-loader"></div>
              <div className="skeleton-loader"></div>
            </div>
          ) : contributions.length === 0 ? (
            <div className="canvas-empty">
              <h3>Your canvas is empty!</h3>
              <p>Start your conservation journey by submitting a sighting report.</p>
            </div>
          ) : (
            <div className="canvas-grid">
              {contributions.map((c) => (
                <div 
                  key={c.id} 
                  className="canvas-card" 
                  onClick={() => setSelectedSubmission(c)}
                  style={{ cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  }}
                >
                  <div className="canvas-card-top">
                    <div>
                      <div className="canvas-card-title">
                        {c.title || c.species || "Untitled"}
                      </div>
                      <span className="canvas-card-type">
                        {c.type || "Sighting Report"}
                      </span>
                    </div>
                    <span
                      className={`canvas-status-badge ${getStatusClass(c.status)}`}
                    >
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      📅 {formatDate(c.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="canvas-side-col">
          <h3 className="canvas-section-title">⏱️ My Progress</h3>
          {loading ? (
            <div>
              <div className="skeleton-loader" style={{ height: "40px" }}></div>
              <div className="skeleton-loader" style={{ height: "40px" }}></div>
            </div>
          ) : contributions.length === 0 ? (
            <p style={{ color: "#666", fontSize: "14px" }}>
              No timeline events yet.
            </p>
          ) : (
            renderTimeline()
          )}
        </div>
      </div>

      
      {selectedSubmission && (
        <div 
          className="canvas-modal-overlay"
          onClick={() => setSelectedSubmission(null)}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div 
            className="canvas-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative"
            }}
          >
            <button 
              onClick={() => setSelectedSubmission(null)}
              style={{
                position: "absolute", top: "20px", right: "20px",
                background: "none", border: "none", fontSize: "24px",
                cursor: "pointer", color: "#666"
              }}
            >
              &times;
            </button>
            
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
              <span className={`canvas-status-badge ${getStatusClass(selectedSubmission.status)}`}>
                {getStatusLabel(selectedSubmission.status)}
              </span>
              <span style={{ color: "#666", fontSize: "14px" }}>
                {formatDate(selectedSubmission.createdAt)}
              </span>
            </div>

            <h2 style={{ margin: "0 0 8px 0", color: "#222" }}>
              {selectedSubmission.title || selectedSubmission.species || "Untitled Submission"}
            </h2>
            <p style={{ color: "#2E7D32", fontWeight: 600, margin: "0 0 24px 0" }}>
              {selectedSubmission.type || "Sighting Report"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
              {selectedSubmission.species && (
                <div>
                  <strong style={{ color: "#444", fontSize: "14px", display: "block", marginBottom: "4px" }}>Species</strong>
                  <div>{selectedSubmission.species}</div>
                </div>
              )}
              {selectedSubmission.location && (
                <div>
                  <strong style={{ color: "#444", fontSize: "14px", display: "block", marginBottom: "4px" }}>Location</strong>
                  <div>{selectedSubmission.location}</div>
                </div>
              )}
              <div>
                <strong style={{ color: "#444", fontSize: "14px", display: "block", marginBottom: "4px" }}>Description</strong>
                <div style={{ color: "#333", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedSubmission.description}
                </div>
              </div>
              
              {selectedSubmission.photoURL && (
                <div style={{ marginTop: "16px" }}>
                  <strong style={{ color: "#444", fontSize: "14px", display: "block", marginBottom: "8px" }}>Attached Photo</strong>
                  <img 
                    src={selectedSubmission.photoURL} 
                    alt="Submission attachment" 
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", objectFit: "contain", backgroundColor: "#f5f5f5" }} 
                  />
                </div>
              )}
            </div>

            <div style={{ 
              background: selectedSubmission.status === "pending" ? "#F5F5F5" : "#E8F5E9", 
              padding: "24px", 
              borderRadius: "12px",
              border: `1px solid ${selectedSubmission.status === "pending" ? "#E0E0E0" : "#C8E6C9"}`
            }}>
              <h3 style={{ margin: "0 0 12px 0", color: selectedSubmission.status === "pending" ? "#666" : "#2E7D32", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedSubmission.status === "pending" 
                  ? (userData?.role === "member" ? "⏳ Chairman Feedback" : "⏳ Teacher Feedback") 
                  : (userData?.role === "member" ? "✔️ Chairman Feedback" : "✔️ Teacher Feedback")}
              </h3>
              
              {selectedSubmission.status === "pending" ? (
                <p style={{ color: "#666", margin: 0, fontStyle: "italic" }}>
                  Your submission has been received and is currently awaiting review by a {userData?.role === "member" ? "chairman" : "teacher"}. Check back later for feedback!
                </p>
              ) : (
                <div style={{ color: "#1B5E20", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  {selectedSubmission.chairmanFeedback || selectedSubmission.teacherFeedback || selectedSubmission.feedback || "Good job! No specific feedback provided."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
