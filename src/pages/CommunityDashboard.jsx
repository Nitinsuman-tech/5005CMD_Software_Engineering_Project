import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./CommunityDashboard.css";

export default function CommunityDashboard() {
  const { user, userData, orgId: authOrgId } = useAuth();

    const [orgName, setOrgName] = useState("");
  const [orgBio, setOrgBio] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [orgLogo, setOrgLogo] = useState("");
  const [orgId, setOrgId] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState("");

  /* ── Invite Code State ── */
  const [inviteCode, setInviteCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [allCodes, setAllCodes] = useState([]);

  /* ── Members State ── */
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  /* ── Analytics State ── */
  const [articleCount, setArticleCount] = useState(0);
  const [sightingCount, setSightingCount] = useState(0);
  const [totalContributions, setTotalContributions] = useState(0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

    useEffect(() => {
    if (!user) return;

    const fetchOrg = async () => {
      try {
        const q = query(
          collection(db, "organizations"),
          where("chairmanId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
          const orgDoc = snapshot.docs[0];
          const data = orgDoc.data();
          setOrgId(orgDoc.id);
          setOrgName(data.orgName || "");
          setOrgBio(data.bio || "");
          setOrgLocation(data.location || "");
          setOrgLogo(data.logoURL || "");
        }
      } catch (err) {
        console.error("Error fetching org:", err);
      } finally {
        setLoadingOrg(false);
      }
    };

    fetchOrg();
  }, [user]);

  /* ── Load Members, Codes, Analytics ── */
  useEffect(() => {
    if (!user || !orgId) return;

    const fetchMembers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("orgId", "==", orgId)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.role === "member");
        setMembers(data);
      } catch (err) {
        console.error("Error fetching members:", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    const fetchCodes = async () => {
      try {
        const q = query(
          collection(db, "communityInviteCodes"),
          where("createdBy", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const codes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        codes.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return bTime - aTime;
        });
        setAllCodes(codes);
        const active = codes.find((c) => c.active);
        if (active) setInviteCode(active.code || "");
      } catch (err) {
        console.error("Error fetching invite codes:", err);
      }
    };

    const fetchAnalytics = async () => {
      try {
        const contribSnap = await getDocs(
          query(collection(db, "contributions"), where("orgId", "==", orgId))
        );
        const items = contribSnap.docs.map((d) => d.data());
        setTotalContributions(items.length);
        setArticleCount(items.filter((i) => i.type === "Article" || i.type === "Essay" || i.type === "Column").length);
        setSightingCount(items.filter((i) => i.type === "Sighting Report").length);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };

    fetchMembers();
    fetchCodes();
    fetchAnalytics();
  }, [user, orgId]);

    const handleSaveOrg = async () => {
    if (!orgName.trim()) return;
    setSavingOrg(true);
    setOrgMessage("");

    try {
      if (orgId) {
        await updateDoc(doc(db, "organizations", orgId), {
          orgName: orgName.trim(),
          bio: orgBio.trim(),
          location: orgLocation.trim(),
          logoURL: orgLogo.trim(),
        });
        setOrgMessage("Organization profile saved successfully!");
      } else {
        const docRef = await addDoc(collection(db, "organizations"), {
          orgName: orgName.trim(),
          bio: orgBio.trim(),
          location: orgLocation.trim(),
          logoURL: orgLogo.trim(),
          orgType: "community",
          chairmanId: user.uid,
          createdAt: serverTimestamp(),
        });
        const newOrgId = docRef.id;
        setOrgId(newOrgId);

        await updateDoc(doc(db, "users", user.uid), { orgId: newOrgId });
        setOrgMessage("Organization profile created successfully!");
      }
    } catch (err) {
      console.error("Error saving org:", err);
      setOrgMessage(`Failed to save: ${err.message}`);
    } finally {
      setSavingOrg(false);
    }
  };

    const generateInviteCode = async () => {
    if (!orgId) {
      setOrgMessage("Please save an organization profile first.");
      return;
    }
    setGeneratingCode(true);
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const docRef = await addDoc(collection(db, "communityInviteCodes"), {
        code,
        orgId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        active: true,
      });

      setInviteCode(code);
      setAllCodes((prev) => [
        { id: docRef.id, code, orgId, createdBy: user.uid, active: true, createdAt: { toDate: () => new Date() } },
        ...prev,
      ]);
    } catch (err) {
      console.error("Error generating invite code:", err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const deactivateCode = async (codeId) => {
    try {
      await updateDoc(doc(db, "communityInviteCodes", codeId), { active: false });
      setAllCodes((prev) => prev.map((c) => (c.id === codeId ? { ...c, active: false } : c)));
      const stillActive = allCodes.find((c) => c.id !== codeId && c.active);
      setInviteCode(stillActive ? stillActive.code : "");
    } catch (err) {
      console.error("Error deactivating code:", err);
    }
  };

  return (
    <div className="comm-dashboard">
      <div className="comm-welcome">
        <h2>Welcome, Chairman</h2>
        <p className="comm-date">{today}</p>
        <p className="comm-email">{userData?.displayName || user?.email}</p>
      </div>

      
      <div className="comm-stats">
        <div className="comm-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-number">{members.length}</div>
          <div className="stat-label">Members</div>
        </div>
        <div className="comm-stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-number">{articleCount}</div>
          <div className="stat-label">Articles / Essays</div>
        </div>
        <div className="comm-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">Sighting Reports</div>
        </div>
        <div className="comm-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-number">{totalContributions}</div>
          <div className="stat-label">Total Contributions</div>
        </div>
      </div>

      
      <div className="comm-section">
        <h3>🏢 Organization Profile</h3>

        {loadingOrg ? (
          <p className="loading-text">Loading profile...</p>
        ) : (
          <div className="comm-profile-form">
            <div className="form-row">
              <label className="form-label">Organization Name *</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter organization name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Bio / Description</label>
              <textarea
                className="form-textarea"
                placeholder="Describe your organization's mission..."
                value={orgBio}
                onChange={(e) => setOrgBio(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g., Jakarta, Indonesia"
                value={orgLocation}
                onChange={(e) => setOrgLocation(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Logo URL</label>
              <input
                className="form-input"
                type="text"
                placeholder="https://example.com/logo.png"
                value={orgLogo}
                onChange={(e) => setOrgLogo(e.target.value)}
              />
            </div>

            {orgMessage && <p className="comm-save-message">{orgMessage}</p>}

            <button
              className="save-btn"
              onClick={handleSaveOrg}
              disabled={savingOrg || !orgName.trim()}
            >
              {savingOrg ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}

        
        <div className="invite-code-section">
          <h4>🔑 Member Invite Code</h4>
          <p className="invite-code-desc">
            Share this code with people who want to join your community as members.
          </p>
          <div className="invite-code-display">
            {inviteCode ? (
              <span className="invite-code-value">{inviteCode}</span>
            ) : (
              <span className="invite-code-empty">No code generated yet</span>
            )}
            <button
              className="generate-code-btn"
              onClick={generateInviteCode}
              disabled={generatingCode || !orgId}
            >
              {generatingCode ? "Generating..." : "Generate New Code"}
            </button>
          </div>
          {!orgId && (
            <p className="form-validation-hint">Save an org profile first to generate invite codes.</p>
          )}

          {allCodes.length > 0 && (
            <div className="codes-history">
              <h4>Code History</h4>
              <div className="codes-table">
                <div className="codes-table-header">
                  <span>Code</span>
                  <span>Created</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {allCodes.map((c) => (
                  <div key={c.id} className="codes-table-row">
                    <span className="code-value-small">{c.code}</span>
                    <span>{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : "—"}</span>
                    <span>
                      <span className={`code-status ${c.active ? "code-active" : "code-inactive"}`}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </span>
                    <span>
                      {c.active && (
                        <button className="deactivate-btn" onClick={() => deactivateCode(c.id)}>
                          Deactivate
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      
      <div className="comm-section">
        <h3>👥 Community Members</h3>

        {loadingMembers ? (
          <p className="loading-text">Loading members...</p>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <p>No members have joined yet. Share your invite code to grow your community!</p>
          </div>
        ) : (
          <div className="members-table">
            <div className="members-header">
              <span>Email</span>
              <span>Joined</span>
            </div>
            {members.map((member) => (
              <div key={member.id} className="members-row">
                <span>{member.email}</span>
                <span>{member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString() : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="comm-section">
        <h3>📊 Community Analytics</h3>
        <div className="comm-analytics-grid">
          <div className="analytics-item">
            <span className="analytics-number">{totalContributions}</span>
            <span className="analytics-label">Total Contributions</span>
          </div>
          <div className="analytics-item">
            <span className="analytics-number">{articleCount}</span>
            <span className="analytics-label">Articles & Essays</span>
          </div>
          <div className="analytics-item">
            <span className="analytics-number">{sightingCount}</span>
            <span className="analytics-label">Sighting Reports</span>
          </div>
          <div className="analytics-item">
            <span className="analytics-number">{members.length}</span>
            <span className="analytics-label">Active Members</span>
          </div>
        </div>
      </div>
    </div>
  );
}
