import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { createNotification } from "../utils/notifications";
import "./SightingsList.css";

export default function SightingsList() {
  const { user, userData } = useAuth();
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  useEffect(() => {
    fetchSightings();
  }, []);

  const fetchSightings = async () => {
    try {
      const q = query(
        collection(db, "sightings"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setSightings(data);
    } catch (err) {
      console.error("Error fetching sightings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (sightingId) => {
    if (!reviewNote.trim()) return;
    setSavingReview(true);

    try {
      const newFeedback = {
        teacherId: user.uid,
        teacherEmail: userData?.displayName || user.email,
        text: reviewNote.trim(),
        timestamp: Timestamp.now(),
      };

      
      const sightingRef = doc(db, "sightings", sightingId);
      await updateDoc(sightingRef, {
        status: "reviewed",
        teacherNote: reviewNote.trim(),
        reviewedBy: user.uid,
        feedback: arrayUnion(newFeedback),
      });

      const reviewed = sightings.find((s) => s.id === sightingId);
      if (reviewed?.userId) {
        createNotification(
          reviewed.userId,
          `Your ${reviewed.species} sighting report has been reviewed by a teacher.`
        );
      }

      setSightings((prev) =>
        prev.map((s) =>
          s.id === sightingId
            ? { 
                ...s, 
                status: "reviewed", 
                teacherNote: reviewNote.trim(),
                feedback: [...(s.feedback || []), newFeedback],
              }
            : s
        )
      );

      setReviewingId(null);
      setReviewNote("");
    } catch (err) {
      console.error("Error reviewing sighting:", err);
    } finally {
      setSavingReview(false);
    }
  };

  const filtered = sightings.filter((s) => {
    const matchSpecies = filterSpecies === "all" || s.species === filterSpecies;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSpecies && matchStatus;
  });

  const speciesList = [...new Set(sightings.map((s) => s.species))];

  const getStatusClass = (status) => {
    if (status === "approved") return "sl-status-approved";
    if (status === "reviewed") return "sl-status-reviewed";
    return "sl-status-pending";
  };

  const formatFeedbackTime = (timestamp) => {
    if (!timestamp?.seconds) return "";
    return new Date(timestamp.seconds * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="sightings-list-page">
      <div className="sl-header-card">
        <h3>Student Sighting Reports</h3>
        <div className="sl-filters">
          <select
            value={filterSpecies}
            onChange={(e) => setFilterSpecies(e.target.value)}
          >
            <option value="all">All Species</option>
            {speciesList.map((sp) => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>

          <span className="sl-count">{filtered.length} reports</span>
        </div>
      </div>

      {loading ? (
        <p className="sl-loading">Loading sighting reports...</p>
      ) : filtered.length === 0 ? (
        <div className="sl-empty-card">
          <p>No sighting reports found.</p>
        </div>
      ) : (
        <div className="sl-reports">
          {filtered.map((s) => (
            <div key={s.id} className="sl-report-card">
              <div className="sl-report-top">
                <div>
                  <div className="sl-report-species">{s.species}</div>
                  <div className="sl-report-student">Reported by: {s.userEmail || "Unknown"}</div>
                </div>
                <span className={`sl-report-status ${getStatusClass(s.status)}`}>
                  {s.status}
                </span>
              </div>

              <div className="sl-report-meta">
                <span>📍 {s.location}</span>
                <span>📅 {s.date}</span>
                {s.time && <span>🕐 {s.time}</span>}
              </div>

              <p className="sl-report-desc">{s.description}</p>

              {s.photoURL && (
                <img src={s.photoURL} alt="Sighting" className="sl-report-photo" />
              )}

              
              {s.teacherNote && (
                <div className="sl-teacher-note">
                  <strong>Your Review:</strong> {s.teacherNote}
                </div>
              )}

              
              {s.feedback && s.feedback.length > 0 && (
                <div className="sl-sighting-feedback-section">
                  <button
                    className="sl-feedback-toggle"
                    onClick={() => setExpandedFeedback(expandedFeedback === s.id ? null : s.id)}
                  >
                    💬 Feedback ({s.feedback.length})
                    <span>{expandedFeedback === s.id ? "▲" : "▼"}</span>
                  </button>
                  {expandedFeedback === s.id && (
                    <div className="sl-sighting-feedback-list">
                      {s.feedback.map((fb, idx) => (
                        <div key={idx} className="sl-sighting-feedback-entry">
                          <div className="sl-sighting-fb-meta">
                            <span className="sl-sighting-fb-author">
                              {fb.teacherId === user.uid ? "You" : fb.teacherEmail}
                            </span>
                            <span className="sl-sighting-fb-time">{formatFeedbackTime(fb.timestamp)}</span>
                          </div>
                          <p className="sl-sighting-fb-text">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              
              {s.status === "pending" && (
                <>
                  {reviewingId === s.id ? (
                    <div className="sl-review-form">
                      <textarea
                        placeholder="Write your feedback..."
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                      />
                      <div className="sl-review-actions">
                        <button
                          className="sl-cancel-btn"
                          onClick={() => { setReviewingId(null); setReviewNote(""); }}
                        >
                          Cancel
                        </button>
                        <button
                          className="sl-save-btn"
                          onClick={() => handleReview(s.id)}
                          disabled={savingReview || !reviewNote.trim()}
                        >
                          {savingReview ? "Saving..." : "Submit Feedback"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="sl-review-btn"
                      onClick={() => setReviewingId(s.id)}
                    >
                      Review
                    </button>
                  )}
                </>
              )}

              
              {s.status === "reviewed" && reviewingId !== s.id && (
                <button
                  className="sl-add-feedback-btn"
                  onClick={() => setReviewingId(s.id)}
                >
                  + Add More Feedback
                </button>
              )}
              {s.status === "reviewed" && reviewingId === s.id && (
                <div className="sl-review-form">
                  <textarea
                    placeholder="Add additional feedback..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <div className="sl-review-actions">
                    <button
                      className="sl-cancel-btn"
                      onClick={() => { setReviewingId(null); setReviewNote(""); }}
                    >
                      Cancel
                    </button>
                    <button
                      className="sl-save-btn"
                      onClick={() => handleReview(s.id)}
                      disabled={savingReview || !reviewNote.trim()}
                    >
                      {savingReview ? "Saving..." : "Add Feedback"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
