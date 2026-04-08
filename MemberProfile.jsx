import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import "./MemberProfile.css";

export default function MemberProfile() {
  const { id: paramId } = useParams();
  const authCtx = useAuth() || {};
  const { user } = authCtx;

  const isSelf = !paramId || (user && paramId === user.uid);
  const targetId = paramId || user?.uid;

  const [profile, setProfile] = useState(null);
  const [orgName, setOrgName] = useState("");
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    if (!targetId) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", targetId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          setDisplayName(data.displayName || data.email?.split("@")[0] || "");
          setBio(data.bio || "");

          // Fetch org name
          if (data.orgId) {
            const orgDoc = await getDoc(doc(db, "organizations", data.orgId));
            if (orgDoc.exists()) {
              setOrgName(orgDoc.data().orgName || "");
            }
          }
        }

        // Fetch contributions
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", targetId)
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
        console.error("Error loading member profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetId]);



  if (loading) {
    return (
      <div className="mp-page">
        <div className="mp-loading">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mp-page">
        <div className="mp-not-found">
          <h2>Profile Not Found</h2>
          <p>This member profile could not be found.</p>
        </div>
      </div>
    );
  }

  const profileName = profile.displayName || profile.email?.split("@")[0] || "Community Member";

  return (
    <div className="mp-page">
      <div className="mp-container">
        
        <div className="mp-header">
          <div className="mp-avatar">
            {profileName.charAt(0).toUpperCase()}
          </div>
          <div className="mp-header-info">
            <h2 className="mp-name">{profileName}</h2>
            {profile.bio && <p className="mp-bio">{profile.bio}</p>}
            <div className="mp-meta">
              {orgName && <span className="mp-org-badge">🏢 {orgName}</span>}
              <span className="mp-role-badge">Community Member</span>
            </div>
          </div>
        </div>

        
        <div className="mp-stats">
          <div className="mp-stat">
            <span className="mp-stat-number">{contributions.length}</span>
            <span className="mp-stat-label">Contributions</span>
          </div>
          <div className="mp-stat">
            <span className="mp-stat-number">
              {contributions.filter((c) => c.type === "Article" || c.type === "Essay" || c.type === "Column").length}
            </span>
            <span className="mp-stat-label">Articles</span>
          </div>
          <div className="mp-stat">
            <span className="mp-stat-number">
              {contributions.filter((c) => c.type === "Sighting Report").length}
            </span>
            <span className="mp-stat-label">Sightings</span>
          </div>
        </div>

        
        <div className="mp-contributions">
          <h3>📚 Contributions</h3>

          {contributions.length === 0 ? (
            <div className="mp-empty">
              <p>No contributions yet.</p>
            </div>
          ) : (
            <div className="mp-contrib-list">
              {contributions.map((c) => (
                <div key={c.id} className="mp-contrib-card">
                  <div className="mp-contrib-header">
                    <span className="mp-contrib-type">{c.type}</span>
                    {c.date && <span className="mp-contrib-date">{c.date}</span>}
                  </div>
                  <h4 className="mp-contrib-title">{c.title}</h4>
                  <p className="mp-contrib-desc">{c.description}</p>
                  {c.species && <p className="mp-contrib-species">🦎 {c.species}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
