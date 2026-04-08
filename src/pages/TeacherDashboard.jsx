import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import "./TeacherDashboard.css";

const programOptions = [
  { id: "komodo_dragon", name: "Komodo Dragon Conservation" },
  { id: "sumatran_tiger", name: "Sumatran Tiger Watch" },
  { id: "javan_rhino", name: "Javan Rhino Protection" },
];

export default function TeacherDashboard() {
  const { user, userData, schoolId } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [showClassModal, setShowClassModal] = useState(false);
  const [className, setClassName] = useState("");
  const [classProgram, setClassProgram] = useState(programOptions[0].id);
  const [creatingClass, setCreatingClass] = useState(false);

  const [showStudentsFor, setShowStudentsFor] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [showAddStudentFor, setShowAddStudentFor] = useState(null);
  const [schoolStudents, setSchoolStudents] = useState([]);
  const [loadingSchoolStudents, setLoadingSchoolStudents] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  const [quizResults, setQuizResults] = useState([]);
  const [loadingQuizResults, setLoadingQuizResults] = useState(true);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        const q = query(
          collection(db, "classes"),
          where("teacherId", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setClasses(data);
      } catch (err) {
        console.error("Error fetching classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [user]);

  useEffect(() => {
    if (!user || !schoolId) return;

    const fetchSubmissions = async () => {
      try {
        const teacherClassesQ = query(
          collection(db, "classes"),
          where("teacherId", "==", user.uid)
        );
        const classSnap = await getDocs(teacherClassesQ);
        const classIds = classSnap.docs.map((d) => d.id);

        if (classIds.length === 0) {
          setSubmissions([]);
          setLoadingSubmissions(false);
          return;
        }

        const memberPromises = classIds.map((cid) =>
          getDocs(query(collection(db, "classMembers"), where("classId", "==", cid)))
        );
        const memberSnaps = await Promise.all(memberPromises);
        const studentIds = new Set();
        memberSnaps.forEach((snap) =>
          snap.docs.forEach((d) => studentIds.add(d.data().studentId))
        );

        if (studentIds.size === 0) {
          const schoolContribQ = query(
            collection(db, "contributions"),
            where("schoolId", "==", schoolId)
          );
          const contribSnap = await getDocs(schoolContribQ);
          setSubmissions(
            contribSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        } else {
          const schoolContribQ = query(
            collection(db, "contributions"),
            where("schoolId", "==", schoolId)
          );
          const contribSnap = await getDocs(schoolContribQ);
          setSubmissions(
            contribSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        }
      } catch (err) {
        console.error("Error fetching submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    };

    const fetchQuizResults = async () => {
      try {
        const q = query(
          collection(db, "quiz_results"),
          where("schoolId", "==", schoolId)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        
        results.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });
        setQuizResults(results);
      } catch (err) {
        console.error("Error fetching quiz results:", err);
      } finally {
        setLoadingQuizResults(false);
      }
    };

    fetchSubmissions();
    fetchQuizResults();
  }, [user, schoolId]);

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    setCreatingClass(true);

    try {
      const docRef = await addDoc(collection(db, "classes"), {
        className: className.trim(),
        teacherId: user.uid,
        schoolId: schoolId || null,
        programId: classProgram,
        studentIds: [],
        createdAt: serverTimestamp(),
      });

      setClasses((prev) => [
        ...prev,
        {
          id: docRef.id,
          className: className.trim(),
          teacherId: user.uid,
          schoolId: schoolId || null,
          programId: classProgram,
          studentIds: [],
        },
      ]);

      setClassName("");
      setClassProgram(programOptions[0].id);
      setShowClassModal(false);
    } catch (err) {
      console.error("Error creating class:", err);
    } finally {
      setCreatingClass(false);
    }
  };

  const handleViewStudents = async (classId) => {
    if (showStudentsFor === classId) {
      setShowStudentsFor(null);
      return;
    }

    setShowStudentsFor(classId);
    setShowAddStudentFor(null);
    setLoadingStudents(true);
    setClassStudents([]);

    try {
      const q = query(
        collection(db, "classMembers"),
        where("classId", "==", classId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClassStudents(data);
    } catch (err) {
      console.error("Error fetching students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleShowAddStudent = async (classId) => {
    if (showAddStudentFor === classId) {
      setShowAddStudentFor(null);
      return;
    }

    setShowAddStudentFor(classId);
    setLoadingSchoolStudents(true);

    try {
      if (!schoolId) {
        setSchoolStudents([]);
        setLoadingSchoolStudents(false);
        return;
      }

      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        where("schoolId", "==", schoolId)
      );
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const memberQ = query(
        collection(db, "classMembers"),
        where("classId", "==", classId)
      );
      const memberSnap = await getDocs(memberQ);
      const existingIds = new Set(memberSnap.docs.map((d) => d.data().studentId));

      const available = students.filter((s) => !existingIds.has(s.id));
      setSchoolStudents(available);
    } catch (err) {
      console.error("Error fetching school students:", err);
    } finally {
      setLoadingSchoolStudents(false);
    }
  };

  const handleAddStudentToClass = async (classId, student) => {
    try {
      await addDoc(collection(db, "classMembers"), {
        classId,
        studentId: student.id,
        studentEmail: student.email,
        addedAt: serverTimestamp(),
      });

      setSchoolStudents((prev) => prev.filter((s) => s.id !== student.id));
      setClassStudents((prev) => [
        ...prev,
        { studentId: student.id, studentEmail: student.email, classId },
      ]);
    } catch (err) {
      console.error("Error adding student:", err);
    }
  };

  const getProgramName = (id) => {
    const found = programOptions.find((p) => p.id === id);
    return found ? found.name : id;
  };

  const getStudentCount = (cls) => {
    if (cls.studentIds) return cls.studentIds.length;
    return 0;
  };

  return (
    <div className="teacher-dashboard">
      <div className="teacher-welcome">
        <h2>Welcome back, {userData?.displayName || user?.email}</h2>
        <p className="teacher-date">{today}</p>
      </div>

      <div className="teacher-stats">
        <div className="teacher-stat-card">
          <div className="stat-icon">🏫</div>
          <div className="stat-number">{classes.length}</div>
          <div className="stat-label">My Classes</div>
        </div>
        <div className="teacher-stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-number">{submissions.filter((s) => s.status === "pending").length}</div>
          <div className="stat-label">Pending Reviews</div>
        </div>
        <div className="teacher-stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-number">{submissions.length}</div>
          <div className="stat-label">Total Submissions</div>
        </div>
      </div>

      <div className="teacher-section">
        <div className="section-header">
          <h3>My Classes</h3>
          <button className="section-action-btn" onClick={() => setShowClassModal(true)}>
            + Create Class
          </button>
        </div>

        {loadingClasses ? (
          <p className="loading-text">Loading classes...</p>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <p>You haven't created any classes yet.</p>
            <button className="empty-state-btn" onClick={() => setShowClassModal(true)}>
              Create Your First Class
            </button>
          </div>
        ) : (
          <div className="class-cards">
            {classes.map((cls) => (
              <div key={cls.id} className="class-card">
                <div className="class-card-top">
                  <div className="class-icon">{cls.className.charAt(0)}</div>
                  <div>
                    <h4>{cls.className}</h4>
                    <span className="class-program">{getProgramName(cls.programId)}</span>
                  </div>
                </div>
                <div className="class-card-actions">
                  <button
                    className="class-view-btn"
                    onClick={() => handleViewStudents(cls.id)}
                  >
                    {showStudentsFor === cls.id ? "Hide Students" : "View Students"}
                  </button>
                  <button
                    className="class-add-btn"
                    onClick={() => handleShowAddStudent(cls.id)}
                  >
                    {showAddStudentFor === cls.id ? "Close" : "+ Add Student"}
                  </button>
                </div>

                {showStudentsFor === cls.id && (
                  <div className="class-students-list">
                    {loadingStudents ? (
                      <p className="loading-text">Loading...</p>
                    ) : classStudents.length === 0 ? (
                      <p className="no-students-text">No students in this class yet.</p>
                    ) : (
                      classStudents.map((s, idx) => (
                        <div key={s.id || idx} className="student-row">
                          <span
                            onClick={() => navigate(`/teacher/student/${s.studentId}`)}
                            style={{ color: "#2E7D32", cursor: "pointer", fontWeight: 500, textDecoration: "underline" }}
                          >
                            {s.studentName || s.studentEmail || s.studentId}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {showAddStudentFor === cls.id && (
                  <div className="add-student-panel">
                    <p className="add-student-title">Add students from your school:</p>
                    {loadingSchoolStudents ? (
                      <p className="loading-text">Loading school students...</p>
                    ) : schoolStudents.length === 0 ? (
                      <p className="no-students-text">No available students to add.</p>
                    ) : (
                      schoolStudents.map((s) => (
                        <div key={s.id} className="add-student-row">
                          <span>{s.email}</span>
                          <button
                            className="add-student-btn"
                            onClick={() => handleAddStudentToClass(cls.id, s)}
                          >
                            Add
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="teacher-section">
        <div className="section-header">
          <h3>Submissions Needing Review</h3>
          <button
            className="section-action-btn"
            onClick={() => navigate("/teacher/library")}
          >
            Open Review Dashboard
          </button>
        </div>

        {loadingSubmissions ? (
          <p className="loading-text">Loading submissions...</p>
        ) : submissions.filter((s) => s.status === "pending").length === 0 ? (
          <div className="empty-state">
            <p>No pending submissions. All caught up!</p>
          </div>
        ) : (
          <div className="submissions-table">
            <div className="submissions-header">
              <span>Student</span>
              <span>Type</span>
              <span>Title</span>
              <span>Status</span>
            </div>
            {submissions
              .filter((s) => s.status === "pending")
              .slice(0, 10)
              .map((sub) => (
              <div key={sub.id} className="submissions-row">
                <span
                  onClick={() => navigate(`/teacher/student/${sub.studentId || sub.userId}`)}
                  style={{ color: "#2E7D32", cursor: "pointer", fontWeight: 500, textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {sub.contributorName || sub.studentName || sub.studentEmail || "Unknown"}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sub.type || "Sighting Report"}
                </span>
                <span>{sub.title || `${sub.species} - ${sub.location}`}</span>
                <span className={`submission-status pending`}>
                  pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="teacher-section">
        <div className="section-header">
          <h3>Student Performance (Quiz)</h3>
        </div>

        {loadingQuizResults ? (
          <p className="loading-text">Loading quiz results...</p>
        ) : quizResults.length === 0 ? (
          <div className="empty-state">
            <p>No quiz results yet.</p>
          </div>
        ) : (
          <div className="submissions-table">
            <div className="submissions-header" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
              <span>Student</span>
              <span>Score</span>
              <span>Date</span>
            </div>
            {quizResults.map((result) => (
              <div key={result.id} className="submissions-row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                <span
                  onClick={() => navigate(`/teacher/student/${result.studentId}`)}
                  style={{ color: "#2E7D32", cursor: "pointer", fontWeight: 500, textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {result.studentName || result.studentEmail || "Unknown"}
                </span>
                <span style={{ fontWeight: "600", color: result.percentage >= 80 ? "#2E7D32" : result.percentage >= 60 ? "#e65100" : "#d32f2f" }}>
                  {result.score} / {result.totalQuestions} ({result.percentage}%)
                </span>
                <span>
                  {result.timestamp ? new Date(result.timestamp.toDate()).toLocaleDateString() : "N/A"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Class</h3>

            <label className="modal-label">Class Name *</label>
            <input
              className="modal-input"
              type="text"
              placeholder="e.g. Grade 10 Biology"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
            {!className.trim() && <span className="modal-validation-hint">Class name is required</span>}

            <label className="modal-label">Program</label>
            <select
              className="modal-select"
              value={classProgram}
              onChange={(e) => setClassProgram(e.target.value)}
            >
              {programOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowClassModal(false)}>
                Back
              </button>
              <button
                className="modal-submit-btn"
                onClick={handleCreateClass}
                disabled={creatingClass || !className.trim()}
              >
                {creatingClass ? "Creating..." : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
