import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import "./StudentProfile.css";

const avatarOptions = [
  { emoji: "🦎", label: "Komodo" },
  { emoji: "🐅", label: "Tiger" },
  { emoji: "🦏", label: "Rhino" },
  { emoji: "🐘", label: "Elephant" },
  { emoji: "🦜", label: "Parrot" },
  { emoji: "🐢", label: "Turtle" },
  { emoji: "🦈", label: "Shark" },
  { emoji: "🐒", label: "Monkey" },
];

const colorOptions = [
  { name: "Forest Green", value: "#2E7D32" },
  { name: "Dark Teal", value: "#00695C" },
  { name: "Ocean Blue", value: "#1565C0" },
  { name: "Warm Amber", value: "#E65100" },
  { name: "Deep Purple", value: "#6A1B9A" },
];

const programNames = {
  komodo_dragon: "Komodo Dragon Conservation",
  sumatran_tiger: "Sumatran Tiger Watch",
  javan_rhino: "Javan Rhino Protection",
};

export default function StudentProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("🦎");
  const [accentColor, setAccentColor] = useState("#2E7D32");
  const [bio, setBio] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [sightings, setSightings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || "");
          setAvatar(data.avatar || "🦎");
          setAccentColor(data.accentColor || "#2E7D32");
          setBio(data.bio || "");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchContributions = async () => {
      try {
        const sightingsQ = query(
          collection(db, "sightings"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const sightingsSnap = await getDocs(sightingsQ);
        setSightings(
          sightingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );

        const enrollQ = query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid)
        );
        const enrollSnap = await getDocs(enrollQ);
        setEnrollments(
          enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );

        
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const contribSnap = await getDocs(contribQ);
        setContributions(
          contribSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      } catch (err) {
        console.error("Error loading contributions:", err);
      } finally {
        setLoadingContributions(false);
      }
    };

    fetchProfile();
    fetchContributions();
  }, [user]);



  const timelineItems = [
    ...sightings.map((s) => ({
      id: s.id,
      type: "sighting",
      title: `Sighting Report: ${s.species}`,
      description: s.description,
      date: s.date,
      status: s.status,
      teacherNote: s.teacherNote,
    })),
    ...enrollments.map((e) => ({
      id: e.id,
      type: "enrollment",
      title: `Enrolled in ${programNames[e.programId] || e.programId}`,
      description: "",
      date: e.enrolledAt?.toDate ? e.enrolledAt.toDate().toLocaleDateString() : "",
      status: "active",
      teacherNote: "",
    })),
  ].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <div className="profile-page">
      <div className="profile-card" style={{ padding: "30px" }}>
        {loadingProfile ? (
          <p className="loading-text">Loading profile...</p>
        ) : (
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#f0f4f1",
                border: `3px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
              }}
            >
              {avatar}
            </div>
            <div>
              <h2 style={{ margin: "0 0 8px 0", color: "#1a1d1a" }}>{displayName || user?.email}</h2>
              <p style={{ margin: 0, color: "#666", lineHeight: 1.5 }}>{bio || "No bio provided."}</p>
            </div>
          </div>
        )}
      </div>

      
      <div className="profile-card">
        <h3>My Canvas Summary</h3>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ background: "#f4f8f4", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "120px" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1b4332" }}>{contributions.length}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Total Contributions</div>
          </div>
          <div style={{ background: "#e3f2fd", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "120px" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#1565c0" }}>{contributions.filter((c) => c.status !== "pending").length}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Learning Progress (Reviewed)</div>
          </div>
          <div style={{ background: "#fff3e0", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "120px" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#e65100" }}>{contributions.filter((c) => c.status === "pending").length}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>Pending Review</div>
          </div>
          <div style={{ background: "#e8f5e9", borderRadius: "12px", padding: "16px 24px", textAlign: "center", minWidth: "120px" }}>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#2E7D32" }}>{contributions.filter((c) => c.feedback && c.feedback.length > 0).length}</div>
            <div style={{ fontSize: "12px", color: "#888" }}>With Feedback</div>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3>My Contributions</h3>

        {loadingContributions ? (
          <p className="loading-text">Loading...</p>
        ) : contributions.length === 0 ? (
          <p className="empty-text">No contributions yet. Start submitting your conservation work!</p>
        ) : (
          <div className="contributions-list">
            {contributions.map((c) => (
              <div key={c.id} className="contribution-item">
                <div className="contribution-header">
                  <span className="contribution-title">
                    {c.title || `${c.species || "Unknown"} Sighting`}
                  </span>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {c.feedback && c.feedback.length > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 600, background: "#f3e5f5", color: "#7b1fa2" }}>
                        💬 Feedback
                      </span>
                    )}
                    <span className={`contribution-status status-${c.status || "pending"}`}>
                      {c.status || "pending"}
                    </span>
                  </div>
                </div>
                <p className="contribution-desc">{c.description}</p>
                {c.date && <span className="contribution-date">{c.date}</span>}

                
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {c.isVisibleToSchool && (
                    <span style={{ fontSize: "11px", background: "#e8f5e9", color: "#2E7D32", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                      In School Library
                    </span>
                  )}
                  {(c.isVisibleToPublic || c.isPublic) && (
                    <span style={{ fontSize: "11px", background: "#e3f2fd", color: "#1565c0", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                      In Public Showcase
                    </span>
                  )}
                </div>

                
                {c.feedback && c.feedback.length > 0 && (
                  <div className="contribution-feedback-section">
                    <strong style={{ color: "#2E7D32", fontSize: "13px" }}>Teacher Feedback:</strong>
                    {c.feedback.map((fb, idx) => (
                      <div key={idx} style={{ background: "#f4f8f4", padding: "8px 12px", borderRadius: "8px", marginTop: "6px", borderLeft: "3px solid #2E7D32" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: "12px", color: "#2E7D32", fontWeight: 700 }}>{fb.teacherEmail || "Teacher"}</div>
                          {fb.timestamp?.seconds && (
                            <span style={{ fontSize: "11px", color: "#999" }}>
                              {new Date(fb.timestamp.seconds * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#333" }}>{fb.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                
                {!c.feedback?.length && c.teacherFeedback && (
                  <div className="contribution-feedback-section">
                    <strong style={{ color: "#2E7D32", fontSize: "13px" }}>Teacher Feedback:</strong>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#333" }}>{c.teacherFeedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>My Programs</h3>

        {loadingContributions ? (
          <p className="loading-text">Loading...</p>
        ) : enrollments.length === 0 ? (
          <p className="empty-text">Not enrolled in any programs.</p>
        ) : (
          <div className="enrolled-programs">
            {enrollments.map((e) => (
              <div key={e.id} className="enrolled-program-card" style={{ borderLeftColor: accentColor }}>
                <div className="enrolled-program-name">
                  {programNames[e.programId] || e.programId}
                </div>
                <div className="enrolled-program-status">Active</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="profile-card">
        <h3>Progress Canvas</h3>
        <p className="canvas-desc">
          Your conservation journey timeline — a compilation of all your sightings, feedback, and programs.
        </p>

        {timelineItems.length === 0 ? (
          <p className="empty-text">Start contributing to build your portfolio!</p>
        ) : (
          <div className="timeline">
            {timelineItems.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-dot" style={{ background: accentColor }}></div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-title">{item.title}</span>
                    {item.date && <span className="timeline-date">{item.date}</span>}
                  </div>
                  {item.description && (
                    <p className="timeline-desc">{item.description}</p>
                  )}
                  {item.teacherNote && (
                    <div className="timeline-teacher-note">
                      <strong>Teacher Feedback:</strong> {item.teacherNote}
                    </div>
                  )}
                  <span className={`timeline-status status-${item.status}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
