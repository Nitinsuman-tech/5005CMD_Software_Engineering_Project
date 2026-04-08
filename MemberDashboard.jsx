import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./MemberDashboard.css";

export default function MemberDashboard() {
  const { user, userData, orgId } = useAuth();
  const navigate = useNavigate();

  const [orgName, setOrgName] = useState("");
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);



  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        
        if (orgId) {
          const orgDoc = await getDoc(doc(db, "organizations", orgId));
          if (orgDoc.exists()) setOrgName(orgDoc.data().orgName || "");
        }

        // Fetch member contributions
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const contribSnap = await getDocs(contribQ);
        const items = contribSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        items.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setContributions(items);
      } catch (err) {
        console.error("Error loading member data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, orgId]);


  const articleCount = contributions.filter(
    (c) => c.type === "Article" || c.type === "Essay" || c.type === "Column"
  ).length;
  const sightingCount = contributions.filter((c) => c.type === "Sighting Report").length;

  return (
    <div className="member-dashboard">
      <div className="member-welcome">
        <h2>Welcome, {userData?.displayName || user?.email}</h2>
        <p className="member-date">{today}</p>
        {orgName && <p className="member-org">🏢 {orgName}</p>}
      </div>

      
      <div className="member-stats">
        <div className="member-stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-number">{articleCount}</div>
          <div className="stat-label">Articles / Essays</div>
        </div>
        <div className="member-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">Sighting Reports</div>
        </div>
        <div className="member-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">{contributions.length}</div>
          <div className="stat-label">Total Contributions</div>
        </div>
      </div>

      
      <div className="member-section">
        <div className="section-header-row">
          <h3>📝 Submit Contribution</h3>
          <button
            className="section-action-btn"
            onClick={() => navigate("/member/sightings")}
          >
            + New Contribution
          </button>
        </div>
      </div>

      
      <div className="member-section">
        <h3>📚 My Contributions</h3>

        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : contributions.length === 0 ? (
          <div className="empty-state">
            <p>You haven't submitted any contributions yet.</p>
            <button className="empty-state-btn" onClick={() => navigate("/member/sightings")}>
              Submit Your First Contribution
            </button>
          </div>
        ) : (
          <div className="contributions-list">
            {contributions.map((c) => (
              <div key={c.id} className="contribution-card">
                <div className="contrib-card-header">
                  <span className="contrib-type-badge">{c.type}</span>
                  <span className="contrib-status">{c.status}</span>
                </div>
                <h4 className="contrib-title">{c.title}</h4>
                <p className="contrib-desc">{c.description}</p>
                {c.species && <p className="contrib-species">🦎 {c.species}</p>}
                {c.date && <span className="contrib-date">📅 {c.date}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="member-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => navigate("/member/sightings")}>
            📝 New Contribution
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/member/profile")}>
            👤 My Profile
          </button>
          <button className="quick-action-btn" onClick={() => navigate("/member/messages")}>
            ✉️ Messages
          </button>
        </div>
      </div>
    </div>
  );
}
