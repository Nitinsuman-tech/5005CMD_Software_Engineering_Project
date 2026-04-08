import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./StudentDashboard.css";

const programNames = {
  komodo_dragon: "Komodo Dragon Conservation",
  sumatran_tiger: "Sumatran Tiger Watch",
  javan_rhino: "Javan Rhino Protection",
};


export default function StudentDashboard() {
  const { user, userData, schoolId } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [myClasses, setMyClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [sightingCount, setSightingCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!user) return;

    const fetchEnrollments = async () => {
      try {
        const q = query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEnrollments(data);
      } catch (err) {
        console.error("Error fetching enrollments:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchMyClasses = async () => {
      try {
        const memberQ = query(
          collection(db, "classMembers"),
          where("studentId", "==", user.uid)
        );
        const memberSnap = await getDocs(memberQ);
        const classIds = memberSnap.docs.map((d) => d.data().classId);

        if (classIds.length === 0) {
          setMyClasses([]);
          setLoadingClasses(false);
          return;
        }

        const classPromises = classIds.map(async (cid) => {
          const allClassesQ = query(collection(db, "classes"));
          const allClassesSnap = await getDocs(allClassesQ);
          const classDoc = allClassesSnap.docs.find((d) => d.id === cid);
          if (classDoc) {
            return { id: classDoc.id, ...classDoc.data() };
          }
          return null;
        });

        const classes = (await Promise.all(classPromises)).filter(Boolean);
        setMyClasses(classes);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchCounts = async () => {
      try {
        const sightingsQ = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const sSnap = await getDocs(sightingsQ);
        setSightingCount(sSnap.size);
      } catch (err) {
        console.error("Error fetching counts:", err);
      }
    };

    fetchEnrollments();
    fetchMyClasses();
    fetchCounts();
  }, [user]);

  return (
    <div className="student-dashboard">
      <div className="student-welcome">
        <h2>Welcome back, {userData?.displayName || user?.email}</h2>
        <p className="student-date">{today}</p>
      </div>

      <div className="student-stats">
        <div className="student-stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-number">{enrollments.length}</div>
          <div className="stat-label">Active Programs</div>
        </div>
        <div className="student-stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-number">{myClasses.length}</div>
          <div className="stat-label">My Classes</div>
        </div>
        <div className="student-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{sightingCount}</div>
          <div className="stat-label">My Submissions</div>
        </div>
        <div className="student-stat-card">
          <div className="stat-icon">✉️</div>
          <div className="stat-number">-</div>
          <div className="stat-label">Messages</div>
        </div>
      </div>

      <div className="student-section">
        <div className="section-header">
          <h3>My Classes</h3>
        </div>

        {loadingClasses ? (
          <p className="loading-text">Loading classes...</p>
        ) : myClasses.length === 0 ? (
          <div className="empty-state">
            <p>You are not enrolled in any classes yet. Your teacher will add you.</p>
          </div>
        ) : (
          <div className="program-cards">
            {myClasses.map((cls) => (
              <div key={cls.id} className="program-card">
                <div className="program-card-header">
                  <div className="program-icon">
                    {cls.className?.charAt(0) || "C"}
                  </div>
                  <div>
                    <h4>{cls.className}</h4>
                    <span className="program-status">
                      {programNames[cls.programId] || cls.programId || "General"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="student-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => navigate("/student/sightings")}
            title="Submit a new wildlife sighting report"
          >
            🔍 Report Sighting
          </button>
          <button
            className="quick-action-btn"
            onClick={() => navigate("/student/library")}
          >
            📖 Browse Library
          </button>
          <button
            className="quick-action-btn"
            onClick={() => navigate("/student/messages")}
          >
            ✉️ View Messages
          </button>
        </div>
      </div>
    </div>
  );
}
