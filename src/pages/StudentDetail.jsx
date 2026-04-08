import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import { doc, getDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import "./StudentProfile.css"; 

export default function StudentDetail() {
  const { id } = useParams();
  const { user, schoolId, role } = useAuth();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [sightings, setSightings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loadingCanvas, setLoadingCanvas] = useState(true);

  useEffect(() => {
    if (!user || role !== "teacher" && role !== "principal" && role !== "chairman") {
      navigate("/");
      return;
    }

    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, "users", id));
        if (docSnap.exists()) {
          setStudentData(docSnap.data());
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchCanvas = async () => {
      try {
        
        const sightingsQ = query(
          collection(db, "sightings"),
          where("userId", "==", id),
          orderBy("createdAt", "desc")
        );
        const sightingsSnap = await getDocs(sightingsQ);
        setSightings(sightingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        
        const enrollQ = query(
          collection(db, "enrollments"),
          where("userId", "==", id)
        );
        const enrollSnap = await getDocs(enrollQ);
        setEnrollments(enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        
        const contribQ = query(
          collection(db, "contributions"),
          where("studentId", "==", id)
        );
        const contribSnap = await getDocs(contribQ);
        setContributions(contribSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Error loading canvas:", err);
      } finally {
        setLoadingCanvas(false);
      }
    };

    fetchProfile();
    fetchCanvas();
  }, [id, user, role, navigate]);

  const timelineItems = [
    ...sightings.map((s) => ({
      id: s.id,
      type: "sighting",
      title: `Sighting Report: ${s.species}`,
      description: s.description,
      date: s.date,
      status: s.status,
      feedback: s.feedback || (s.teacherNote ? [{ text: s.teacherNote }] : []),
      timestamp: s.createdAt?.seconds || 0,
    })),
    ...enrollments.map((e) => ({
      id: e.id,
      type: "enrollment",
      title: `Enrolled in ${e.programId}`,
      description: "Joined a conservation program.",
      date: e.date,
      status: "active",
      feedback: [],
      timestamp: e.enrolledAt?.seconds || 0,
    })),
    ...contributions.map((c) => ({
      id: c.id,
      type: "contribution",
      title: `${c.type}: ${c.title}`,
      description: c.description,
      date: c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : "",
      status: c.status,
      feedback: c.feedback || [],
      timestamp: c.createdAt?.seconds || 0,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  if (loadingProfile) {
    return <div style={{ padding: "24px" }}>Loading Student Profile...</div>;
  }

  if (!studentData) {
    return <div style={{ padding: "24px" }}>Student not found.</div>;
  }

  
  if (role !== "chairman" && studentData.schoolId !== schoolId) {
     return <div style={{ padding: "24px", color: "red" }}>Error: This student does not belong to your school.</div>;
  }

  const badgeColor = studentData.accentColor || "#2E7D32";

  return (
    <div className="student-profile-page">
       <button onClick={() => navigate(-1)} style={{ marginBottom: "16px", padding: "8px 16px", cursor: "pointer" }}>← Back to Dashboard</button>
      <div className="sp-header">
        <div className="sp-avatar" style={{ borderColor: badgeColor }}>
          {studentData.avatar || "🦎"}
        </div>
        <div className="sp-header-info">
          <h2>{studentData.displayName || studentData.email}</h2>
          <p className="sp-bio">{studentData.bio || "No bio provided."}</p>
        </div>
      </div>

      <div className="sp-content">
        {loadingCanvas ? (
          <p className="sp-loading-text">Loading Canvas...</p>
        ) : timelineItems.length === 0 ? (
          <div className="sp-empty-state">
            <p>This student hasn't submitted any work yet.</p>
          </div>
        ) : (
          <div className="sp-timeline">
            <h3>Work Canvas</h3>
            {timelineItems.map((item) => (
              <div key={`${item.type}-${item.id}`} className="sp-timeline-item">
                <div className="sp-timeline-marker" style={{ background: badgeColor }}></div>
                <div className="sp-timeline-content">
                  <div className="sp-timeline-top">
                    <h4>{item.title}</h4>
                    <span className="sp-timeline-date">{item.date}</span>
                  </div>
                  <p className="sp-timeline-desc">{item.description}</p>
                  
                  {item.status && (
                    <span className={`sp-status-badge sp-status-${item.status}`}>
                      {item.status}
                    </span>
                  )}

                  {item.feedback.length > 0 && (
                    <div className="sp-feedback-thread">
                      <h5>Teacher Feedback:</h5>
                      {item.feedback.map((fb, idx) => (
                        <p key={idx}><strong>{fb.teacherEmail || "Teacher"}:</strong> {fb.text}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
