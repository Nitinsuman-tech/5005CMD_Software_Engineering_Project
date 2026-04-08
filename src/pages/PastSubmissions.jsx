import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { markFeedbackNotificationRead } from "../utils/notifications";
import "./PastSubmissions.css";

export default function PastSubmissions() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.successMessage || ""
  );

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contributions"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching past submissions:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Pending Review";
      case "reviewed": return "Reviewed";
      case "published": return "Published";
      default: return status || "Pending";
    }
  };

  const getStatusClass = (status) => {
    if (status === "reviewed") return "ps-status-reviewed";
    if (status === "published") return "ps-status-published";
    return "ps-status-pending";
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatFeedbackTime = (timestamp) => {
    if (!timestamp?.seconds) return "";
    return new Date(timestamp.seconds * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasFeedback = (report) => {
    return (
      (report.feedback && report.feedback.length > 0) ||
      (report.teacherFeedback && report.teacherFeedback.trim() !== "") ||
      (report.teacherNote && report.teacherNote.trim() !== "")
    );
  };

  const rolePrefix = userData?.role === "member" ? "/member" : "/student";

  return (
    <div className="past-submissions-page">
      <div className="ps-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="ps-back-btn"
            onClick={() => navigate(rolePrefix)}
            title="Back to Dashboard"
          >
            Back
          </button>
          <div>
            <h3>Past Submissions</h3>
            <p className="ps-subtitle">
              View all your submitted work and teacher feedback.
            </p>
          </div>
        </div>
        <button
          className="ps-new-btn"
          onClick={() => navigate(`${rolePrefix}/sightings`)}
        >
          + New Submission
        </button>
      </div>

      {successMessage && (
        <div className="ps-success-message">{successMessage}</div>
      )}

      <div className="ps-stats-bar">
        <div className="ps-stat">
          <span className="ps-stat-num">{reports.length}</span>
          <span className="ps-stat-label">Total Submissions</span>
        </div>
        <div className="ps-stat">
          <span className="ps-stat-num">{reports.filter((r) => r.status === "pending").length}</span>
          <span className="ps-stat-label">Pending Review</span>
        </div>
        <div className="ps-stat">
          <span className="ps-stat-num">{reports.filter((r) => r.status !== "pending").length}</span>
          <span className="ps-stat-label">Reviewed</span>
        </div>
        <div className="ps-stat">
          <span className="ps-stat-num">{reports.filter((r) => hasFeedback(r)).length}</span>
          <span className="ps-stat-label">With Feedback</span>
        </div>
      </div>

      {loading ? (
        <p className="ps-loading">Loading your submissions...</p>
      ) : reports.length === 0 ? (
        <div className="ps-empty">
          <p>You haven't submitted any work yet.</p>
          <button
            className="ps-new-btn"
            onClick={() => navigate(`${rolePrefix}/sightings`)}
          >
            Submit Your First Work
          </button>
        </div>
      ) : (
        <div className="ps-list">
          {reports.map((r) => (
            <div
              key={r.id}
              className="ps-item"
              onClick={() => {
                setSelectedReport(r);
                
                markFeedbackNotificationRead(user?.uid, r.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="ps-item-top">
                <div>
                  <div className="ps-item-title">{r.title || r.species || "Untitled"}</div>
                  <span className="ps-item-type">{r.type || "Sighting Report"}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {hasFeedback(r) && (
                    <span className="ps-feedback-badge">💬 Feedback</span>
                  )}
                  <span className={`ps-item-status ${getStatusClass(r.status)}`}>
                    {getStatusLabel(r.status)}
                  </span>
                </div>
              </div>
              <div className="ps-item-details">
                {r.location && <span>📍 {r.location}</span>}
                {r.date && <span>📅 {r.date}</span>}
                {r.createdAt && <span>🕐 Submitted: {formatDate(r.createdAt)}</span>}
              </div>
              <p className="ps-item-desc">
                {r.description?.length > 150
                  ? r.description.slice(0, 150) + "..."
                  : r.description}
              </p>
              {r.photoURL && (
                <img src={r.photoURL} alt="Submission" className="ps-item-thumb" />
              )}

              
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                {r.isVisibleInSchool && (
                  <span style={{ fontSize: "11px", background: "#e8f5e9", color: "#2E7D32", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                    In School Library
                  </span>
                )}
                {(r.isVisibleInPublic || r.isPublic) && (
                  <span style={{ fontSize: "11px", background: "#e3f2fd", color: "#1565c0", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                    In Public Showcase
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      
      {selectedReport && (
        <div className="ps-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ps-modal-header">
              <h3>{selectedReport.title || selectedReport.species || "Submission"}</h3>
              <button
                className="ps-modal-close"
                onClick={() => setSelectedReport(null)}
              >
                &times;
              </button>
            </div>

            <div className="ps-modal-meta">
              <span className="ps-item-type">{selectedReport.type || "Sighting Report"}</span>
              <span className={`ps-item-status ${getStatusClass(selectedReport.status)}`}>
                {getStatusLabel(selectedReport.status)}
              </span>
              {selectedReport.date && <span>📅 {selectedReport.date}</span>}
              {selectedReport.location && <span>📍 {selectedReport.location}</span>}
            </div>

            {selectedReport.photoURL && (
              <img
                src={selectedReport.photoURL}
                alt="Submission"
                className="ps-modal-photo"
              />
            )}

            <div className="ps-modal-body">
              <h4>Your Work</h4>
              <p>{selectedReport.description}</p>
            </div>

            
            <div className="ps-modal-feedback">
              <h4>💬 Teacher Feedback</h4>

              
              {selectedReport.feedback && selectedReport.feedback.length > 0 ? (
                <div className="ps-feedback-list">
                  {selectedReport.feedback.map((fb, idx) => (
                    <div key={idx} className="ps-feedback-entry">
                      <div className="ps-feedback-meta">
                        <span className="ps-feedback-author">
                          {fb.teacherEmail || "Teacher"}
                        </span>
                        <span className="ps-feedback-time">
                          {formatFeedbackTime(fb.timestamp)}
                        </span>
                      </div>
                      <p className="ps-feedback-text">{fb.text}</p>
                    </div>
                  ))}
                </div>
              ) : selectedReport.teacherFeedback ? (
                <div className="ps-feedback-entry">
                  <p className="ps-feedback-text">{selectedReport.teacherFeedback}</p>
                </div>
              ) : selectedReport.teacherNote ? (
                <div className="ps-feedback-entry">
                  <p className="ps-feedback-text">{selectedReport.teacherNote}</p>
                </div>
              ) : (
                <p className="ps-no-feedback">
                  No feedback yet. Your teacher will review your work soon.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
