import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { createNotification } from "../utils/notifications";
import "./SchoolLibrary.css";

export default function TeacherLibrary() {
  const { user, userData, schoolId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user || !schoolId) return;
    fetchItems();
  }, [user, schoolId]);

  const fetchItems = async () => {
    try {
      const contribQ = query(
        collection(db, "contributions"),
        where("schoolId", "==", schoolId)
      );
      const contribSnap = await getDocs(contribQ);
      const contribItems = contribSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || `${data.species || "Unknown"} Sighting - ${data.location || ""}`,
          type: data.type || "Sighting Report",
          description: data.description || "",
          date: data.date || "",
          location: data.location || "",
          species: data.species || "",
          studentId: data.studentId,
          studentEmail: data.studentEmail || "Anonymous",
          photoURL: data.photoURL || "",
          status: data.status || "pending",
          feedback: data.feedback || [],
          teacherFeedback: data.teacherFeedback || "",
          feedbackDate: data.feedbackDate || null,
          teacherNote: data.teacherNote || "",
          createdAt: data.createdAt,
          isVisibleInSchool: data.isVisibleInSchool || false,
          isVisibleInPublic: data.isVisibleInPublic || false,
          isPublic: data.isPublic || false,
        };
      });

      contribItems.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });

      setItems(contribItems);
      if (contribItems.length > 0) {
        setSelectedItem(contribItems[0]);
      }
    } catch (err) {
      console.error("Error fetching teacher library:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save Feedback — sets status to "reviewed" and appends feedback entry.
   */
  const handleSaveFeedback = async () => {
    if (!selectedItem || !feedbackText.trim()) return;
    setSavingFeedback(true);

    try {
      const teacherName = userData?.displayName || user.email;
      const newFeedback = {
        teacherId: user.uid,
        teacherEmail: teacherName,
        text: feedbackText.trim(),
        timestamp: Timestamp.now(),
      };

      await updateDoc(doc(db, "contributions", selectedItem.id), {
        feedback: arrayUnion(newFeedback),
        teacherFeedback: feedbackText.trim(),
        feedbackDate: serverTimestamp(),
        status: "reviewed",
      });

      
      if (selectedItem.studentId) {
        createNotification(
          selectedItem.studentId,
          `Teacher ${teacherName} has reviewed your submission: "${selectedItem.title}"`,
          schoolId,
          { type: "feedback", senderId: user.uid, contributionId: selectedItem.id }
        );
      }

      
      const updatedFeedback = [...(selectedItem.feedback || []), newFeedback];
      const updateObj = { status: "reviewed", feedback: updatedFeedback, teacherFeedback: feedbackText.trim() };
      setItems((prev) =>
        prev.map((i) => i.id === selectedItem.id ? { ...i, ...updateObj } : i)
      );
      setSelectedItem((prev) => ({ ...prev, ...updateObj }));
      setFeedbackText("");
    } catch (err) {
      console.error("Error saving feedback:", err);
    } finally {
      setSavingFeedback(false);
    }
  };

  /**
   * Publish to School Library — sets isVisibleInSchool: true.
   */
  const handlePublishToSchool = async () => {
    if (!selectedItem) return;
    setPublishing(true);

    try {
      const teacherName = userData?.displayName || user.email;
      await updateDoc(doc(db, "contributions", selectedItem.id), {
        isVisibleInSchool: true,
        status: selectedItem.status === "pending" ? "reviewed" : selectedItem.status,
      });

      if (selectedItem.studentId) {
        createNotification(
          selectedItem.studentId,
          `Your submission "${selectedItem.title}" has been published to the School Library by ${teacherName}!`,
          schoolId,
          { type: "published", senderId: user.uid, contributionId: selectedItem.id }
        );
      }

      const newStatus = selectedItem.status === "pending" ? "reviewed" : selectedItem.status;
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id ? { ...i, isVisibleInSchool: true, status: newStatus } : i
        )
      );
      setSelectedItem((prev) => ({ ...prev, isVisibleInSchool: true, status: newStatus }));
    } catch (err) {
      console.error("Error publishing to school library:", err);
    } finally {
      setPublishing(false);
    }
  };

    const handlePublishToPublic = async () => {
    if (!selectedItem) return;
    setPublishing(true);

    try {
      const teacherName = userData?.displayName || user.email;
      await updateDoc(doc(db, "contributions", selectedItem.id), {
        isVisibleInPublic: true,
        isPublic: true,
        isPublished: true,
        publishedAt: serverTimestamp(),
        publishedBy: user.uid,
        publishedByEmail: teacherName,
        status: selectedItem.status === "pending" ? "reviewed" : selectedItem.status,
      });

      if (selectedItem.studentId) {
        createNotification(
          selectedItem.studentId,
          `Your submission "${selectedItem.title}" has been published to the Public Showcase by ${teacherName}!`,
          schoolId,
          { type: "published", senderId: user.uid, contributionId: selectedItem.id }
        );
      }

      const newStatus = selectedItem.status === "pending" ? "reviewed" : selectedItem.status;
      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, isVisibleInPublic: true, isPublic: true, isPublished: true, status: newStatus }
            : i
        )
      );
      setSelectedItem((prev) => ({
        ...prev,
        isVisibleInPublic: true,
        isPublic: true,
        isPublished: true,
        status: newStatus,
      }));
    } catch (err) {
      console.error("Error publishing to public showcase:", err);
    } finally {
      setPublishing(false);
    }
  };

    const handleArchive = async () => {
    if (!selectedItem) return;
    setPublishing(true);

    try {
      await updateDoc(doc(db, "contributions", selectedItem.id), {
        isVisibleInSchool: false,
        isVisibleInPublic: false,
        isPublished: false,
        isPublic: false,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? { ...i, isVisibleInSchool: false, isVisibleInPublic: false, isPublished: false, isPublic: false }
            : i
        )
      );
      setSelectedItem((prev) => ({
        ...prev,
        isVisibleInSchool: false,
        isVisibleInPublic: false,
        isPublished: false,
        isPublic: false,
      }));
    } catch (err) {
      console.error("Error archiving submission:", err);
    } finally {
      setPublishing(false);
    }
  };

  const typeOptions = useMemo(() => {
    return [...new Set(items.map((i) => i.type))];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterType !== "all") {
      result = result.filter((i) => i.type === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }
    return result;
  }, [items, filterType, filterStatus]);

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

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const reviewedCount = items.filter((i) => i.status === "reviewed").length;
  const publishedSchoolCount = items.filter((i) => i.isVisibleInSchool).length;
  const publishedPublicCount = items.filter((i) => i.isVisibleInPublic).length;

  return (
    <div className="school-library-page">
      <div className="school-library-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="sl-back-btn"
            onClick={() => navigate("/teacher")}
            title="Back to Dashboard"
          >
            Back
          </button>
          <div>
            <h3>Review Dashboard</h3>
            <p className="school-library-desc">
              Review student submissions. Provide feedback and control what appears in School Library and Public Showcase.
            </p>
          </div>
        </div>
      </div>

      <div className="review-stats-bar">
        <span className="review-stat review-stat-pending">⏳ Pending: {pendingCount}</span>
        <span className="review-stat review-stat-done">✅ Reviewed: {reviewedCount}</span>
        <span className="review-stat">🏫 School Library: {publishedSchoolCount}</span>
        <span className="review-stat">🌍 Public: {publishedPublicCount}</span>
        <span className="review-stat">📋 Total: {items.length}</span>
      </div>

      <div className="school-library-filters">
        <button
          className={`sl-filter-btn ${filterType === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          All Types
        </button>
        {typeOptions.map((t) => (
          <button
            key={t}
            className={`sl-filter-btn ${filterType === t ? "sl-filter-active" : ""}`}
            onClick={() => setFilterType(t)}
          >
            {t}
          </button>
        ))}
        <span className="filter-divider">|</span>
        <button
          className={`sl-filter-btn ${filterStatus === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("all")}
        >
          All Status
        </button>
        <button
          className={`sl-filter-btn ${filterStatus === "pending" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("pending")}
        >
          Pending
        </button>
        <button
          className={`sl-filter-btn ${filterStatus === "reviewed" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterStatus("reviewed")}
        >
          Reviewed
        </button>
      </div>

      {loading ? (
        <p className="sl-loading">Loading submissions...</p>
      ) : (
        <div className="school-library-grid">
          <div className="sl-list-panel">
            <div className="sl-list-header">
              Submissions ({filtered.length})
            </div>
            <div className="sl-list-scroll">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  className={`sl-list-item ${selectedItem?.id === item.id ? "sl-list-item-active" : ""}`}
                  onClick={() => { setSelectedItem(item); setFeedbackText(""); }}
                >
                  <div className="sl-list-item-title">{item.title}</div>
                  <div className="sl-list-item-meta">
                    <span className="sl-list-type">{item.type}</span>
                    <span className={`sl-list-status ${item.status}`}>{item.status}</span>
                  </div>
                  <div className="sl-list-item-author">By: {item.studentEmail}</div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                    {item.isVisibleInSchool && (
                      <span style={{ fontSize: "10px", background: "#e8f5e9", color: "#2E7D32", padding: "2px 6px", borderRadius: "6px", fontWeight: 600 }}>
                        School
                      </span>
                    )}
                    {item.isVisibleInPublic && (
                      <span style={{ fontSize: "10px", background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "6px", fontWeight: 600 }}>
                        Public
                      </span>
                    )}
                    {item.feedback && item.feedback.length > 0 && (
                      <span className="sl-feedback-count">
                        💬 {item.feedback.length}
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="sl-no-items">No submissions found.</div>
              )}
            </div>
          </div>

          <div className="sl-reader-panel">
            {!selectedItem ? (
              <div className="sl-empty-reader">Select a submission to review.</div>
            ) : (
              <>
                <h2>{selectedItem.title}</h2>
                <div className="sl-reader-meta">
                  <span className="sl-reader-type">{selectedItem.type}</span>
                  <span className="sl-reader-author">By: {selectedItem.studentEmail}</span>
                  {selectedItem.date && <span className="sl-reader-date">{selectedItem.date}</span>}
                  <span className={`sl-reader-status ${selectedItem.status}`}>
                    {selectedItem.status}
                  </span>
                </div>

                {selectedItem.photoURL && (
                  <img
                    src={selectedItem.photoURL}
                    alt="Submission"
                    className="sl-reader-photo"
                  />
                )}

                <div className="sl-reader-body">{selectedItem.description}</div>

                {selectedItem.location && (
                  <div style={{ fontSize: "13px", color: "#666", marginTop: "8px" }}>
                    📍 Location: {selectedItem.location}
                  </div>
                )}

                
                <div className="sl-publish-section" style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px", padding: "16px", background: "#f8faf8", borderRadius: "10px", border: "1px solid #e0e0e0" }}>
                  
                  {selectedItem.isVisibleInSchool ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#2E7D32", fontWeight: 600 }}>✅ In School Library</span>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishToSchool}
                      disabled={publishing}
                      title="Make visible in School Library for students and principal"
                      style={{
                        padding: "8px 16px",
                        background: "#e8f5e9",
                        color: "#2E7D32",
                        border: "1px solid #a5d6a7",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {publishing ? "Publishing..." : "🏫 Publish to School Library"}
                    </button>
                  )}

                  
                  {selectedItem.isVisibleInPublic ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "13px", color: "#1565c0", fontWeight: 600 }}>✅ In Public Showcase</span>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublishToPublic}
                      disabled={publishing}
                      title="Make visible on the Public Library for everyone"
                      style={{
                        padding: "8px 16px",
                        background: "#e3f2fd",
                        color: "#1565c0",
                        border: "1px solid #90caf9",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {publishing ? "Publishing..." : "🌍 Publish to Public Showcase"}
                    </button>
                  )}

                  
                  {(selectedItem.isVisibleInSchool || selectedItem.isVisibleInPublic) && (
                    <button
                      onClick={handleArchive}
                      disabled={publishing}
                      title="Remove from all libraries (keep as internal only)"
                      style={{
                        padding: "8px 14px",
                        background: "#fff3e0",
                        color: "#e65100",
                        border: "1px solid #ffcc80",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {publishing ? "Archiving..." : "🔒 Archive (Remove from Libraries)"}
                    </button>
                  )}
                </div>

                
                <div className="sl-feedback-section">
                  <h4 className="sl-feedback-title">
                    💬 Feedback & Notes ({selectedItem.feedback?.length || 0})
                  </h4>

                  {selectedItem.feedback && selectedItem.feedback.length > 0 ? (
                    <div className="sl-feedback-thread">
                      {selectedItem.feedback.map((fb, idx) => (
                        <div key={idx} className={`sl-feedback-entry ${fb.teacherId === user.uid ? "sl-feedback-mine" : ""}`}>
                          <div className="sl-feedback-meta">
                            <span className="sl-feedback-author">
                              {fb.teacherId === user.uid ? "You" : fb.teacherEmail}
                            </span>
                            <span className="sl-feedback-time">
                              {formatFeedbackTime(fb.timestamp)}
                            </span>
                          </div>
                          <p className="sl-feedback-text">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="sl-no-feedback">No feedback yet. Be the first to leave a note.</p>
                  )}

                  
                  <div className="sl-feedback-form">
                    <textarea
                      className="sl-feedback-textarea"
                      placeholder="Write feedback for this submission..."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    <button
                      className="sl-feedback-submit-btn"
                      onClick={handleSaveFeedback}
                      disabled={savingFeedback || !feedbackText.trim()}
                      title="Save feedback and mark as reviewed"
                    >
                      {savingFeedback ? "Saving..." : "💾 Save Feedback"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
