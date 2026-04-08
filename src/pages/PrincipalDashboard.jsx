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
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import "./PrincipalDashboard.css";


const PROGRAMS = [
  { key: "komodo_dragon", label: "Komodo Dragon Conservation" },
  { key: "sumatran_tiger", label: "Sumatran Tiger Watch" },
  { key: "javan_rhino", label: "Javan Rhino Protection" },
];

export default function PrincipalDashboard() {
  const { user, userData, schoolId: authSchoolId } = useAuth();

  
  const [schoolId, setSchoolId] = useState(authSchoolId || null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolDesc, setSchoolDesc] = useState("");
  const [schoolLocation, setSchoolLocation] = useState("");
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState("");

  // ── Access codes ────────────────────────────────────────────────
  const [accessCode, setAccessCode] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [allCodes, setAllCodes] = useState([]);

  // ── Real-time analytics ─────────────────────────────────────────
  const [teachers, setTeachers] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [libraryItems, setLibraryItems] = useState([]);
  const [programStats, setProgramStats] = useState(
    PROGRAMS.map((p) => ({ ...p, students: [], count: 0 }))
  );
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Drill-down modal ────────────────────────────────────────────
  const [drillProgram, setDrillProgram] = useState(null); // null or program key
  const [drillStudents, setDrillStudents] = useState([]);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  
  
  
  
  useEffect(() => {
    if (!user) return;

    
    const fetchSchoolByPrincipal = async () => {
      try {
        const q = query(collection(db, "schools"), where("principalId", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          const data = d.data();
          setSchoolId(d.id);
          setSchoolName(data.schoolName || "");
          setSchoolDesc(data.description || "");
          setSchoolLocation(data.location || "");
        }
      } catch (err) {
        console.error("Error fetching school:", err);
      } finally {
        setLoadingSchool(false);
      }
    };

    fetchSchoolByPrincipal();
  }, [user]);

  // Keep schoolId in sync with authSchoolId if context resolves it first
  useEffect(() => {
    if (authSchoolId && !schoolId) setSchoolId(authSchoolId);
  }, [authSchoolId]);

  // ────────────────────────────────────────────────────────────────
  // Step 2: Real-time listeners (only fire once schoolId is known)
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;

    const unsubs = [];

    let currentStudentIds = [];

    // ── 2a. Users (teachers + students count) ───────────────────
    const usersQ = query(collection(db, "users"), where("schoolId", "==", schoolId));
    unsubs.push(
      onSnapshot(usersQ, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTeachers(all.filter((u) => u.role === "teacher"));
        const students = all.filter((u) => u.role === "student");
        setStudentCount(students.length);
        currentStudentIds = students.map((s) => s.id);
      }, (err) => console.error("Users snapshot error:", err))
    );

    
    const contribQ = query(collection(db, "contributions"), where("schoolId", "==", schoolId));
    unsubs.push(
      onSnapshot(contribQ, (snap) => {
        setSubmissionCount(snap.size);
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || `${data.species || "Unknown"} Sighting - ${data.location || ""}`,
            author: data.studentName || data.studentEmail || "Anonymous",
            type: data.type || "Sighting Report",
            status: data.status || "pending",
            isVisibleInPublic: data.isVisibleInPublic || false,
          };
        });
        setLibraryItems(items);
      }, (err) => console.error("Contributions snapshot error:", err))
    );

    
    
    
    const enrollQ = query(collection(db, "enrollments"));
    unsubs.push(
      onSnapshot(enrollQ, async (snap) => {
        const allEnrollments = snap.docs.map((d) => d.data());

        
        const schoolEnrollments = allEnrollments.filter((e) => {
          const uid = e.userId || e.studentId;
          return e.schoolId === schoolId || currentStudentIds.includes(uid);
        });

        
        const studentIds = [...new Set(schoolEnrollments.map((e) => e.userId || e.studentId).filter(Boolean))];

        
        const nameMap = {};
        if (studentIds.length > 0) {
          
          const chunks = [];
          for (let i = 0; i < studentIds.length; i += 30) chunks.push(studentIds.slice(i, i + 30));
          for (const chunk of chunks) {
            try {
              const usQ = query(collection(db, "users"), where("__name__", "in", chunk));
              const usSnap = await getDocs(usQ);
              usSnap.docs.forEach((d) => {
                const ud = d.data();
                nameMap[d.id] = ud.displayName || ud.email || d.id;
              });
            } catch {  }
          }
        }

        const updated = PROGRAMS.map((prog) => {
          const enrolled = schoolEnrollments.filter(
            (e) => e.programId === prog.key || e.program === prog.key
          );
          const students = enrolled.map((e) => {
            const uid = e.userId || e.studentId;
            return { uid, name: nameMap[uid] || uid || "Student" };
          });
          return { ...prog, students, count: students.length };
        });
        setProgramStats(updated);
        setLoadingStats(false);
      }, (err) => {
        console.error("Enrollments snapshot error:", err);
        setLoadingStats(false);
      })
    );

    
    const codesQ = query(collection(db, "accessCodes"), where("createdBy", "==", user.uid));
    unsubs.push(
      onSnapshot(codesQ, (snap) => {
        const codes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        codes.sort((a, b) => {
          const at = a.createdAt?.toDate?.() || new Date(0);
          const bt = b.createdAt?.toDate?.() || new Date(0);
          return bt - at;
        });
        setAllCodes(codes);
        const active = codes.find((c) => c.active);
        setAccessCode(active?.code || "");
      }, (err) => console.error("Access codes snapshot error:", err))
    );

    return () => unsubs.forEach((u) => u());
  }, [schoolId, user?.uid]);

  // ────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────
  const handleSaveSchool = async () => {
    if (!schoolName.trim()) return;
    setSavingSchool(true);
    setSchoolMessage("");
    try {
      if (schoolId) {
        await updateDoc(doc(db, "schools", schoolId), {
          schoolName: schoolName.trim(),
          description: schoolDesc.trim(),
          location: schoolLocation.trim(),
        });
        setSchoolMessage("School profile saved successfully!");
      } else {
        const existingQ = query(collection(db, "schools"), where("principalId", "==", user.uid));
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          const existingId = existingDoc.id;
          setSchoolId(existingId);
          await updateDoc(doc(db, "schools", existingId), {
            schoolName: schoolName.trim(), description: schoolDesc.trim(), location: schoolLocation.trim(),
          });
          await updateDoc(doc(db, "users", user.uid), { schoolId: existingId });
          setSchoolMessage("School profile saved successfully!");
          return;
        }
        const docRef = await addDoc(collection(db, "schools"), {
          schoolName: schoolName.trim(), description: schoolDesc.trim(),
          location: schoolLocation.trim(), principalId: user.uid, createdAt: serverTimestamp(),
        });
        setSchoolId(docRef.id);
        await updateDoc(doc(db, "users", user.uid), { schoolId: docRef.id });
        setSchoolMessage("School created and profile saved!");
      }
    } catch (err) {
      setSchoolMessage(`Failed to save: ${err.message}`);
    } finally {
      setSavingSchool(false);
    }
  };

  const generateAccessCode = async () => {
    if (!schoolId) { setSchoolMessage("Save a school profile first."); return; }
    setGeneratingCode(true);
    try {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      await addDoc(collection(db, "accessCodes"), {
        code, schoolId, createdBy: user.uid, createdAt: serverTimestamp(), active: true,
      });
    } catch (err) {
      console.error("Error generating code:", err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const deactivateCode = async (codeId) => {
    try {
      await updateDoc(doc(db, "accessCodes", codeId), { active: false });
    } catch (err) {
      console.error("Error deactivating code:", err);
    }
  };

  const toggleLibraryVisibility = async (id) => {
    const item = libraryItems.find((i) => i.id === id);
    if (!item) return;
    try {
      await updateDoc(doc(db, "contributions", id), { isVisibleInPublic: !item.isVisibleInPublic });
    } catch (err) {
      console.error("Error toggling visibility:", err);
    }
  };

  const openDrillDown = (programKey) => {
    const prog = programStats.find((p) => p.key === programKey);
    setDrillProgram(prog);
    setDrillStudents(prog?.students || []);
  };

  const maxEnrollment = Math.max(1, ...programStats.map((p) => p.count));

  
  
  
  return (
    <div className="principal-dashboard">
      
      <div className="principal-welcome">
        <h2>Welcome back, {userData?.displayName || user?.email}</h2>
        <p className="principal-date">{today}</p>
      </div>

      
      <div className="principal-stats">
        <div className="principal-stat-card">
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-number">{teachers.length}</div>
          <div className="stat-label">Teachers</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-number">{studentCount}</div>
          <div className="stat-label">Students</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-number">{PROGRAMS.length}</div>
          <div className="stat-label">Active Programs</div>
        </div>
        <div className="principal-stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-number">{submissionCount}</div>
          <div className="stat-label">Total Submissions</div>
        </div>
      </div>

      
      <div className="principal-section">
        <h3>School Profile</h3>
        {loadingSchool ? (
          <p className="loading-text">Loading school profile...</p>
        ) : (
          <div className="school-profile-form">
            <div className="form-row">
              <label className="form-label">School Name *</label>
              <input className="form-input" type="text" placeholder="Enter school name"
                value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              {!schoolName.trim() && <span className="form-validation-hint">School name is required</span>}
            </div>
            <div className="form-row">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Brief description of the school"
                value={schoolDesc} onChange={(e) => setSchoolDesc(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="form-label">Location</label>
              <input className="form-input" type="text" placeholder="e.g. Labuan Bajo, Flores"
                value={schoolLocation} onChange={(e) => setSchoolLocation(e.target.value)} />
            </div>
            {schoolMessage && <p className="school-save-message">{schoolMessage}</p>}
            <button className="save-school-btn" onClick={handleSaveSchool}
              disabled={savingSchool || !schoolName.trim()}>
              {savingSchool ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}

        
        <div className="access-code-section">
          <h4>Student & Teacher Access Code</h4>
          <p className="access-code-desc">Students and teachers use this code to join your school.</p>
          <div className="access-code-display">
            {accessCode
              ? <span className="access-code-value">{accessCode}</span>
              : <span className="access-code-empty">No code generated yet</span>}
            <button className="generate-code-btn" onClick={generateAccessCode}
              disabled={generatingCode || !schoolId}
              title="Generate a 6-character join code">
              {generatingCode ? "Generating..." : "Generate New Code"}
            </button>
          </div>
          {!schoolId && <p className="form-validation-hint">Save a school profile first to generate access codes.</p>}

          {allCodes.length > 0 && (
            <div className="codes-history">
              <h4>Code History</h4>
              <div className="codes-table">
                <div className="codes-table-header">
                  <span>Code</span><span>Created</span><span>Status</span><span>Action</span>
                </div>
                {allCodes.map((c) => (
                  <div key={c.id} className="codes-table-row">
                    <span className="code-value-small">{c.code}</span>
                    <span>{c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : "—"}</span>
                    <span><span className={`code-status ${c.active ? "code-active" : "code-inactive"}`}>{c.active ? "Active" : "Inactive"}</span></span>
                    <span>{c.active && <button className="deactivate-btn" onClick={() => deactivateCode(c.id)}>Deactivate</button>}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      
      <div className="principal-section">
        <h3>School Teachers</h3>
        {teachers.length === 0 ? (
          <div className="empty-state"><p>No teachers registered yet. Share the access code with your teachers.</p></div>
        ) : (
          <div className="teachers-table">
            <div className="teachers-header"><span>Name</span><span>Email</span><span>Joined</span></div>
            {teachers.map((teacher) => (
              <div key={teacher.id} className="teachers-row">
                <span>{teacher.displayName || "—"}</span>
                <span>{teacher.email}</span>
                <span>{teacher.createdAt?.toDate ? teacher.createdAt.toDate().toLocaleDateString() : "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="principal-section">
        <h3>📊 Program Enrollment Analytics</h3>
        <p className="section-desc">
          Live enrollment counts derived from your school's <code>enrollments</code> collection.
          Click a program row to see enrolled students.
        </p>

        {loadingStats ? (
          <p className="loading-text">Loading enrollment data...</p>
        ) : (
          <div className="bar-chart">
            {programStats.map((prog) => (
              <div key={prog.key} className="bar-row"
                onClick={() => openDrillDown(prog.key)}
                style={{ cursor: "pointer" }}
                title={`Click to see ${prog.count} enrolled student(s)`}
              >
                <span className="bar-label">{prog.label}</span>
                <div className="bar-track">
                  <div className="bar-fill"
                    style={{ width: prog.count === 0 ? "4px" : `${(prog.count / maxEnrollment) * 100}%` }} />
                </div>
                <span className="bar-value"
                  style={{ color: prog.count === 0 ? "#999" : "#2E7D32", fontWeight: prog.count > 0 ? 700 : 400 }}>
                  {prog.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="principal-section">
        <h3>School Library (Student Submissions)</h3>
        <p className="section-desc">Toggle visibility to control public access.</p>
        {libraryItems.length === 0 ? (
          <div className="empty-state"><p>No student submissions yet.</p></div>
        ) : (
          <div className="library-table">
            <div className="library-header">
              <span>Title</span><span>Author</span><span>Type</span><span>Status</span><span>Visibility</span>
            </div>
            {libraryItems.map((item) => (
              <div key={item.id} className="library-row">
                <span>{item.title}</span>
                <span>{item.author}</span>
                <span>{item.type}</span>
                <span className={`submission-status-badge ${item.status}`}>{item.status}</span>
                <span>
                  <button className={`visibility-toggle ${item.isVisibleInPublic ? "public" : "private"}`}
                    onClick={() => toggleLibraryVisibility(item.id)}>
                    {item.isVisibleInPublic ? "Public" : "Private"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      
      <div className="principal-section">
        <h3>Quick Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-number">{submissionCount}</span>
            <span className="summary-label">Total Submissions</span>
          </div>
          <div className="summary-item">
            <span className="summary-number">{studentCount}</span>
            <span className="summary-label">Registered Students</span>
          </div>
          <div className="summary-item">
            <span className="summary-number">{teachers.length}</span>
            <span className="summary-label">Active Teachers</span>
          </div>
          <div className="summary-item">
            <span className="summary-number">{programStats.reduce((s, p) => s + p.count, 0)}</span>
            <span className="summary-label">Total Enrollments</span>
          </div>
        </div>
      </div>

      
      {drillProgram && (
        <div className="ps-modal-overlay" onClick={() => setDrillProgram(null)}>
          <div className="ps-modal" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}>
            <div className="ps-modal-header">
              <h3>{drillProgram.label}</h3>
              <button className="ps-modal-close" onClick={() => setDrillProgram(null)}>&times;</button>
            </div>
            <p style={{ color: "#666", marginBottom: "16px", fontSize: "14px" }}>
              {drillStudents.length} student(s) enrolled in this program at your school.
            </p>
            {drillStudents.length === 0 ? (
              <p style={{ color: "#999" }}>No students enrolled yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {drillStudents.map((s, i) => (
                  <li key={s.uid || i} style={{
                    padding: "10px 12px", borderBottom: "1px solid #f0f0f0",
                    display: "flex", alignItems: "center", gap: "10px"
                  }}>
                    <span style={{ fontSize: "20px" }}>🎓</span>
                    <span style={{ fontWeight: 600, color: "#222" }}>{s.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
