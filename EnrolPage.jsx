import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./EnrolPage.css";

const programs = [
  {
    id: "komodo_dragon",
    name: "Komodo Dragon Conservation",
    description: "Learn about and help protect Komodo Dragons in their natural habitat across Indonesian islands.",
    color: "#2E7D32",
  },
  {
    id: "sumatran_tiger",
    name: "Sumatran Tiger Watch",
    description: "Monitor and report Sumatran Tiger sightings to support population tracking and anti-poaching efforts.",
    color: "#1B5E20",
  },
  {
    id: "javan_rhino",
    name: "Javan Rhino Protection",
    description: "Contribute to Javan Rhinoceros conservation through habitat monitoring and community awareness.",
    color: "#388E3C",
  },
];

export default function EnrolPage() {
  const { user, schoolId, orgId } = useAuth();
  const [enrolledIds, setEnrolledIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;

    const fetchEnrollments = async () => {
      try {
        const q = query(
          collection(db, "enrollments"),
          where("userId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const ids = snapshot.docs.map((doc) => doc.data().programId);
        setEnrolledIds(ids);
      } catch (err) {
        console.error("Error fetching enrollments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrollments();
  }, [user]);

  const handleEnrol = async (programId) => {
    if (!user) return;
    setEnrollingId(programId);
    setMessage("");

    try {
      await addDoc(collection(db, "enrollments"), {
        userId: user.uid,
        programId: programId,
        schoolId: schoolId || null,
        orgId: orgId || null,
        enrolledAt: serverTimestamp(),
      });

      setEnrolledIds((prev) => [...prev, programId]);
      const programName = programs.find((p) => p.id === programId)?.name;
      setMessage(`Successfully enrolled in ${programName}!`);
    } catch (err) {
      console.error("Enrolment failed:", err);
      setMessage("Failed to enrol. Please try again.");
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="enrol-page">
      <div className="enrol-header">
        <h2>Conservation Programs</h2>
        <p>Choose a program to begin your conservation journey.</p>
      </div>

      {message && <div className="enrol-message">{message}</div>}

      {loading ? (
        <p className="loading-text">Loading programs...</p>
      ) : (
        <div className="enrol-grid">
          {programs.map((program) => {
            const isEnrolled = enrolledIds.includes(program.id);
            const isEnrolling = enrollingId === program.id;

            return (
              <div key={program.id} className="enrol-card">
                <div
                  className="enrol-card-image"
                  style={{ background: program.color }}
                >
                  <span className="enrol-card-letter">
                    {program.name.charAt(0)}
                  </span>
                </div>
                <div className="enrol-card-body">
                  <h3>{program.name}</h3>
                  <p>{program.description}</p>

                  {isEnrolled ? (
                    <div className="enrol-badge">✓ Enrolled</div>
                  ) : (
                    <button
                      className="enrol-btn"
                      onClick={() => handleEnrol(program.id)}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? "Enrolling..." : "Enrol Now"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
