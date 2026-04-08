import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createNotification } from "../utils/notifications";
import "./SchoolLibrary.css";

export default function CommunityLibrary() {
  const { user, userData, role, orgId } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!user || !orgId) return;
    fetchItems();
  }, [user, orgId]);

  const fetchItems = async () => {
    try {
      // Fetch org name
      try {
        const orgDoc = await getDoc(doc(db, "organizations", orgId));
        if (orgDoc.exists()) {
          setOrgName(orgDoc.data().orgName || "");
        }
      } catch {
        // ignore
      }

      // Fetch all published contributions for this community org
      const orgQ = query(
        collection(db, "contributions"),
        where("orgId", "==", orgId),
        where("isVisibleInCommunity", "==", true)
      );
      const orgSnap = await getDocs(orgQ);

      const contribItems = orgSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || `${data.species || "Unknown"} Sighting`,
          type: data.type || "Sighting Report",
          description: data.description || "",
          date: data.date || "",
          contributorName: data.contributorName || data.studentEmail || "Community Member",
          contributorId: data.studentId,
          photoURL: data.photoURL || "",
          status: data.status || "pending",
          isPublished: data.isPublished || false,
          isPublic: data.isPublic || false,
          feedback: data.feedback || [],
          createdAt: data.createdAt,
        };
      });

      setItems(contribItems);
      if (contribItems.length > 0) {
        setSelectedItem(contribItems[0]);
      }
    } catch (err) {
      console.error("Error fetching community library:", err);
    } finally {
      setLoading(false);
    }
  };



  const typeOptions = useMemo(() => {
    return [...new Set(items.map((i) => i.type))];
  }, [items]);

  const filtered = useMemo(() => {
    if (filterType === "all") return items;
    return items.filter((i) => i.type === filterType);
  }, [items, filterType]);

  const backPath = role === "chairman" ? "/community" : "/member";

  return (
    <div className="school-library-page">
      <div className="school-library-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="sl-back-btn"
            onClick={() => navigate(backPath)}
            title="Back to Dashboard"
          >
            Back
          </button>
          <div>
            <h3>Community Library {orgName && `— ${orgName}`}</h3>
            <p className="school-library-desc">
              Browse and manage contributions from your community organization.
            </p>
          </div>
        </div>
      </div>

      <div className="school-library-filters">
        <button
          className={`sl-filter-btn ${filterType === "all" ? "sl-filter-active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          All ({items.length})
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
      </div>

      {loading ? (
        <p className="sl-loading">Loading contributions...</p>
      ) : (
        <div className="school-library-grid">
          <div className="sl-list-panel">
            <div className="sl-list-header">
              Contributions ({filtered.length})
            </div>
            <div className="sl-list-scroll">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  className={`sl-list-item ${selectedItem?.id === item.id ? "sl-list-item-active" : ""}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="sl-list-item-title">{item.title}</div>
                  <div className="sl-list-item-meta">
                    <span className="sl-list-type">{item.type}</span>
                    <span className="sl-list-author">{item.contributorName}</span>
                    {item.isPublished && (
                      <span style={{ fontSize: "10px", background: "#e3f2fd", color: "#1565c0", padding: "2px 6px", borderRadius: "6px", fontWeight: 600 }}>
                        Published
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="sl-no-items">No contributions found.</div>
              )}
            </div>
          </div>

          <div className="sl-reader-panel">
            {!selectedItem ? (
              <div className="sl-empty-reader">Select a contribution to read.</div>
            ) : (
              <>
                <h2>{selectedItem.title}</h2>
                <div className="sl-reader-meta">
                  <span className="sl-reader-type">{selectedItem.type}</span>
                  <span className="sl-reader-author">By: {selectedItem.contributorName}</span>
                  {selectedItem.date && <span className="sl-reader-date">{selectedItem.date}</span>}
                  <span className={`sl-reader-status ${selectedItem.status}`}>
                    {selectedItem.status}
                  </span>
                </div>

                {selectedItem.photoURL && (
                  <img
                    src={selectedItem.photoURL}
                    alt="Contribution"
                    className="sl-reader-photo"
                  />
                )}

                <div className="sl-reader-body">{selectedItem.description}</div>



                
                {selectedItem.feedback && selectedItem.feedback.length > 0 && (
                  <div className="sl-feedback-section">
                    <h4 className="sl-feedback-title">
                      💬 Feedback ({selectedItem.feedback.length})
                    </h4>
                    <div className="sl-feedback-thread">
                      {selectedItem.feedback.map((fb, idx) => (
                        <div key={idx} className="sl-feedback-entry">
                          <div className="sl-feedback-meta">
                            <span className="sl-feedback-author">{fb.teacherEmail || "Reviewer"}</span>
                            {fb.timestamp?.seconds && (
                              <span className="sl-feedback-time">
                                {new Date(fb.timestamp.seconds * 1000).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="sl-feedback-text">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
