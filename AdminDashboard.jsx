import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import "./AdminDashboard.css";

const PROGRAMS = {
  komodo_dragon: "Komodo Dragon Conservation",
  sumatran_tiger: "Sumatran Tiger Watch",
  javan_rhino: "Javan Rhino Protection",
};

export default function AdminDashboard({ initialTab }) {
  const { user, userData } = useAuth();

  
  const [schools, setSchools] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  
  const [activeTab, setActiveTab] = useState(initialTab || "overview");

  
  const [selectedSchool, setSelectedSchool] = useState(null);

  
  const [selectedOrg, setSelectedOrg] = useState(null);

  
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userOrgFilter, setUserOrgFilter] = useState("all");

  
  const [showcaseItems, setShowcaseItems] = useState([]);
  const [loadingShowcase, setLoadingShowcase] = useState(false);
  const [showcaseSearch, setShowcaseSearch] = useState("");

  // ── Confirm dialogs ──
  const [confirmAction, setConfirmAction] = useState(null);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        schoolsSnap,
        orgsSnap,
        usersSnap,
        contribSnap,
        classesSnap,
        enrollSnap,
      ] = await Promise.all([
        getDocs(collection(db, "schools")),
        getDocs(collection(db, "organizations")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "contributions")),
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "enrollments")),
      ]);

      setSchools(schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setOrganizations(orgsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setContributions(contribSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setEnrollments(enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Admin: error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  
  const fetchShowcase = useCallback(async () => {
    setLoadingShowcase(true);
    try {
      const q = query(
        collection(db, "contributions"),
        where("isVisibleInPublic", "==", true)
      );
      const snap = await getDocs(q);
      setShowcaseItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Error fetching showcase:", err);
    } finally {
      setLoadingShowcase(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "library") fetchShowcase();
  }, [activeTab, fetchShowcase]);

  
  const roleCounts = useMemo(() => {
    const counts = { student: 0, teacher: 0, principal: 0, chairman: 0, member: 0, admin: 0 };
    users.forEach((u) => { if (counts[u.role] !== undefined) counts[u.role]++; });
    return counts;
  }, [users]);

  const statusBreakdown = useMemo(() => {
    const s = { pending: 0, reviewed: 0 };
    contributions.forEach((c) => { s[c.status] = (s[c.status] || 0) + 1; });
    return s;
  }, [contributions]);

  const contributionsByType = useMemo(() => {
    const map = {};
    contributions.forEach((c) => {
      const t = c.type || "Sighting Report";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [contributions]);

  const programEnrollments = useMemo(() => {
    const map = {};
    enrollments.forEach((e) => {
      const pid = e.programId || "unknown";
      map[pid] = (map[pid] || 0) + 1;
    });
    return Object.entries(map).map(([id, count]) => ({
      name: PROGRAMS[id] || id,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [enrollments]);

  
  const getSchoolName = (schoolId) => schools.find((s) => s.id === schoolId)?.schoolName || "—";
  const getOrgName = (orgId) => organizations.find((o) => o.id === orgId)?.orgName || "—";
  const getUserName = (uid) => {
    const u = users.find((u) => u.id === uid);
    return u?.displayName || u?.email || uid?.substring(0, 8) || "—";
  };

  const schoolUsers = (schoolId) => users.filter((u) => u.schoolId === schoolId);
  const schoolContribs = (schoolId) => contributions.filter((c) => c.schoolId === schoolId);
  const schoolClasses = (schoolId) => classes.filter((c) => c.schoolId === schoolId);
  const schoolEnrollments = (schoolId) => enrollments.filter((e) => e.schoolId === schoolId);

  const orgUsers = (orgId) => users.filter((u) => u.orgId === orgId);
  const orgContribs = (orgId) => contributions.filter((c) => c.orgId === orgId);

  
  const handleDeleteSchool = async (school) => {
    setConfirmAction({
      title: "Delete School",
      message: `Are you sure you want to delete "${school.schoolName}"? This will remove the school record. Users linked to this school will lose their school association.`,
      onConfirm: async () => {
        try {
          
          await deleteDoc(doc(db, "schools", school.id));

          
          const batch = writeBatch(db);
          const affectedUsers = users.filter((u) => u.schoolId === school.id);
          affectedUsers.forEach((u) => {
            batch.update(doc(db, "users", u.id), { schoolId: null });
          });

          
          const codesSnap = await getDocs(
            query(collection(db, "accessCodes"), where("schoolId", "==", school.id))
          );
          codesSnap.docs.forEach((d) => {
            batch.update(doc(db, "accessCodes", d.id), { active: false });
          });

          await batch.commit();
          await fetchAllData();
          setSelectedSchool(null);
          setConfirmAction(null);
        } catch (err) {
          console.error("Error deleting school:", err);
          alert("Failed to delete school. Check console for details.");
          setConfirmAction(null);
        }
      },
    });
  };

  const handleDeleteOrg = async (org) => {
    setConfirmAction({
      title: "Delete Community",
      message: `Are you sure you want to delete "${org.orgName}"? This will remove the community record. Members linked to this community will lose their association.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "organizations", org.id));

          const batch = writeBatch(db);
          const affectedUsers = users.filter((u) => u.orgId === org.id);
          affectedUsers.forEach((u) => {
            batch.update(doc(db, "users", u.id), { orgId: null });
          });

          const codesSnap = await getDocs(
            query(collection(db, "communityInviteCodes"), where("orgId", "==", org.id))
          );
          codesSnap.docs.forEach((d) => {
            batch.update(doc(db, "communityInviteCodes", d.id), { active: false });
          });

          await batch.commit();
          await fetchAllData();
          setSelectedOrg(null);
          setConfirmAction(null);
        } catch (err) {
          console.error("Error deleting community:", err);
          alert("Failed to delete community. Check console for details.");
          setConfirmAction(null);
        }
      },
    });
  };

  const handleRemoveFromShowcase = async (item) => {
    setConfirmAction({
      title: "Remove from Public Showcase",
      message: `Remove "${item.title || "this contribution"}" from the public showcase? It will no longer be visible in the public library.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "contributions", item.id), {
            isVisibleInPublic: false,
            isPublic: false,
          });
          setShowcaseItems((prev) => prev.filter((i) => i.id !== item.id));
          setConfirmAction(null);
        } catch (err) {
          console.error("Error removing from showcase:", err);
          alert("Failed to remove item.");
          setConfirmAction(null);
        }
      },
    });
  };

  
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        (u.email?.toLowerCase() || "").includes(userSearch.toLowerCase()) ||
        (u.displayName?.toLowerCase() || "").includes(userSearch.toLowerCase());
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      let matchesOrg = true;
      if (userOrgFilter === "school") matchesOrg = !!u.schoolId;
      else if (userOrgFilter === "community") matchesOrg = !!u.orgId;
      else if (userOrgFilter === "unaffiliated") matchesOrg = !u.schoolId && !u.orgId;
      return matchesSearch && matchesRole && matchesOrg;
    });
  }, [users, userSearch, userRoleFilter, userOrgFilter]);

  const filteredShowcase = useMemo(() => {
    if (!showcaseSearch.trim()) return showcaseItems;
    const q = showcaseSearch.toLowerCase();
    return showcaseItems.filter(
      (i) =>
        (i.title?.toLowerCase() || "").includes(q) ||
        (i.type?.toLowerCase() || "").includes(q) ||
        (i.studentName?.toLowerCase() || "").includes(q)
    );
  }, [showcaseItems, showcaseSearch]);

  // ── Per-school/org contribution stats ──
  const schoolContribStats = useMemo(() => {
    return schools.map((s) => {
      const contribs = contributions.filter((c) => c.schoolId === s.id);
      const usrs = users.filter((u) => u.schoolId === s.id);
      return {
        ...s,
        contributionCount: contribs.length,
        userCount: usrs.length,
        studentCount: usrs.filter((u) => u.role === "student").length,
        teacherCount: usrs.filter((u) => u.role === "teacher").length,
      };
    });
  }, [schools, contributions, users]);

  const orgContribStats = useMemo(() => {
    return organizations.map((o) => {
      const contribs = contributions.filter((c) => c.orgId === o.id);
      const usrs = users.filter((u) => u.orgId === o.id);
      return {
        ...o,
        contributionCount: contribs.length,
        memberCount: usrs.filter((u) => u.role === "member").length,
      };
    });
  }, [organizations, contributions, users]);

  
  const maxProgram = Math.max(...(programEnrollments.length > 0 ? programEnrollments.map((p) => p.count) : [1]));
  const maxContribType = Math.max(...(contributionsByType.length > 0 ? contributionsByType.map((c) => c[1]) : [1]));

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      
      {confirmAction && (
        <div className="admin-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmAction.title}</h3>
            <p>{confirmAction.message}</p>
            <div className="admin-modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn-danger" onClick={confirmAction.onConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      
      <div className="admin-welcome">
        <div className="admin-welcome-text">
          <h2>Welcome back, {userData?.displayName || user?.email}</h2>
          <p className="admin-date">{today}</p>
        </div>
        <div className="admin-welcome-badge">
          <span className="admin-role-chip">Super Admin</span>
        </div>
      </div>

      
      <div className="admin-tabs">
        {[
          { key: "overview", label: "Overview", icon: "📊" },
          { key: "schools", label: "Schools", icon: "🏫" },
          { key: "communities", label: "Communities", icon: "🌍" },
          { key: "users", label: "Users", icon: "👥" },
          { key: "library", label: "Public Library", icon: "📚" },
          { key: "analytics", label: "Analytics", icon: "📈" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedSchool(null);
              setSelectedOrg(null);
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      
      {activeTab === "overview" && (
        <>
          <div className="admin-stats-grid">
            <div className="stat-card stat-primary" onClick={() => setActiveTab("schools")}>
              <div className="stat-icon-wrap">🏫</div>
              <div className="stat-info">
                <span className="stat-number">{schools.length}</span>
                <span className="stat-label">Schools</span>
              </div>
            </div>
            <div className="stat-card stat-green" onClick={() => setActiveTab("communities")}>
              <div className="stat-icon-wrap">🌍</div>
              <div className="stat-info">
                <span className="stat-number">{organizations.length}</span>
                <span className="stat-label">Communities</span>
              </div>
            </div>
            <div className="stat-card stat-blue" onClick={() => setActiveTab("users")}>
              <div className="stat-icon-wrap">👥</div>
              <div className="stat-info">
                <span className="stat-number">{users.length}</span>
                <span className="stat-label">Total Users</span>
              </div>
            </div>
            <div className="stat-card stat-orange">
              <div className="stat-icon-wrap">📝</div>
              <div className="stat-info">
                <span className="stat-number">{contributions.length}</span>
                <span className="stat-label">Contributions</span>
              </div>
            </div>
            <div className="stat-card stat-teal">
              <div className="stat-icon-wrap">📚</div>
              <div className="stat-info">
                <span className="stat-number">{classes.length}</span>
                <span className="stat-label">Classes</span>
              </div>
            </div>
            <div className="stat-card stat-purple">
              <div className="stat-icon-wrap">🎓</div>
              <div className="stat-info">
                <span className="stat-number">{enrollments.length}</span>
                <span className="stat-label">Enrollments</span>
              </div>
            </div>
          </div>

          
          <div className="admin-section">
            <h3>User Breakdown</h3>
            <div className="role-chips">
              {Object.entries(roleCounts).map(([role, count]) => (
                <div key={role} className={`role-chip role-chip-${role}`}>
                  <span className="role-chip-count">{count}</span>
                  <span className="role-chip-label">{role}s</span>
                </div>
              ))}
            </div>
          </div>

          
          <div className="admin-grid-2col">
            <div className="admin-section">
              <div className="section-header">
                <h3>Recent Schools</h3>
                <button className="btn-link" onClick={() => setActiveTab("schools")}>View All</button>
              </div>
              {schools.length === 0 ? (
                <p className="empty-text">No schools registered yet.</p>
              ) : (
                <div className="mini-list">
                  {schools.slice(0, 5).map((s) => (
                    <div key={s.id} className="mini-list-item" onClick={() => { setActiveTab("schools"); setSelectedSchool(s); }}>
                      <span className="mini-list-name">{s.schoolName}</span>
                      <span className="mini-list-meta">{schoolUsers(s.id).length} users</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="admin-section">
              <div className="section-header">
                <h3>Recent Communities</h3>
                <button className="btn-link" onClick={() => setActiveTab("communities")}>View All</button>
              </div>
              {organizations.length === 0 ? (
                <p className="empty-text">No communities registered yet.</p>
              ) : (
                <div className="mini-list">
                  {organizations.slice(0, 5).map((o) => (
                    <div key={o.id} className="mini-list-item" onClick={() => { setActiveTab("communities"); setSelectedOrg(o); }}>
                      <span className="mini-list-name">{o.orgName}</span>
                      <span className="mini-list-meta">{orgUsers(o.id).length} members</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          
          <div className="admin-section">
            <h3>Contribution Status</h3>
            <div className="status-bar-container">
              <div className="status-bar">
                {contributions.length > 0 ? (
                  <>
                    <div
                      className="status-bar-segment status-pending"
                      style={{ width: `${(statusBreakdown.pending / contributions.length) * 100}%` }}
                      title={`Pending: ${statusBreakdown.pending}`}
                    ></div>
                    <div
                      className="status-bar-segment status-reviewed"
                      style={{ width: `${(statusBreakdown.reviewed / contributions.length) * 100}%` }}
                      title={`Reviewed: ${statusBreakdown.reviewed}`}
                    ></div>
                  </>
                ) : (
                  <div className="status-bar-segment status-empty" style={{ width: "100%" }}></div>
                )}
              </div>
              <div className="status-legend">
                <span className="legend-item"><span className="legend-dot pending"></span> Pending ({statusBreakdown.pending || 0})</span>
                <span className="legend-item"><span className="legend-dot reviewed"></span> Reviewed ({statusBreakdown.reviewed || 0})</span>
              </div>
            </div>
          </div>
        </>
      )}

      
      {activeTab === "schools" && !selectedSchool && (
        <div className="admin-section">
          <div className="section-header">
            <h3>All Schools ({schools.length})</h3>
          </div>

          {schools.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏫</div>
              <p>No schools registered on the platform yet.</p>
            </div>
          ) : (
            <div className="card-grid">
              {schoolContribStats.map((school) => (
                <div key={school.id} className="entity-card">
                  <div className="entity-card-header">
                    <h4>{school.schoolName}</h4>
                    <span className="entity-badge active">Active</span>
                  </div>
                  <p className="entity-location">{school.location || "Location not set"}</p>
                  <div className="entity-stats-row">
                    <div className="entity-stat">
                      <span className="entity-stat-num">{school.studentCount}</span>
                      <span className="entity-stat-lbl">Students</span>
                    </div>
                    <div className="entity-stat">
                      <span className="entity-stat-num">{school.teacherCount}</span>
                      <span className="entity-stat-lbl">Teachers</span>
                    </div>
                    <div className="entity-stat">
                      <span className="entity-stat-num">{school.contributionCount}</span>
                      <span className="entity-stat-lbl">Contributions</span>
                    </div>
                  </div>
                  <div className="entity-card-actions">
                    <button className="btn-view" onClick={() => setSelectedSchool(school)}>View Details</button>
                    <button className="btn-delete" onClick={() => handleDeleteSchool(school)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "schools" && selectedSchool && (
        <div className="detail-view">
          <button className="btn-back" onClick={() => setSelectedSchool(null)}>
            ← Back to All Schools
          </button>

          <div className="detail-header">
            <div>
              <h2>{selectedSchool.schoolName}</h2>
              <p className="detail-subtitle">{selectedSchool.location || "Location not set"}</p>
              {selectedSchool.description && <p className="detail-desc">{selectedSchool.description}</p>}
            </div>
            <button className="btn-delete-lg" onClick={() => handleDeleteSchool(selectedSchool)}>Delete School</button>
          </div>

          
          <div className="detail-stats">
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolUsers(selectedSchool.id).filter((u) => u.role === "student").length}</span>
              <span className="detail-stat-lbl">Students</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolUsers(selectedSchool.id).filter((u) => u.role === "teacher").length}</span>
              <span className="detail-stat-lbl">Teachers</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolUsers(selectedSchool.id).filter((u) => u.role === "principal").length}</span>
              <span className="detail-stat-lbl">Principals</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolContribs(selectedSchool.id).length}</span>
              <span className="detail-stat-lbl">Contributions</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolClasses(selectedSchool.id).length}</span>
              <span className="detail-stat-lbl">Classes</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{schoolEnrollments(selectedSchool.id).length}</span>
              <span className="detail-stat-lbl">Enrollments</span>
            </div>
          </div>

          
          <div className="admin-section">
            <h3>Registered Users ({schoolUsers(selectedSchool.id).length})</h3>
            {schoolUsers(selectedSchool.id).length === 0 ? (
              <p className="empty-text">No users registered in this school.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header detail-users-grid">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Joined</span>
                </div>
                {schoolUsers(selectedSchool.id).map((u) => (
                  <div key={u.id} className="admin-table-row detail-users-grid">
                    <span className="table-primary">{u.displayName || "—"}</span>
                    <span>{u.email}</span>
                    <span><span className={`role-badge role-${u.role}`}>{u.role}</span></span>
                    <span>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Contributions ({schoolContribs(selectedSchool.id).length})</h3>
            {schoolContribs(selectedSchool.id).length === 0 ? (
              <p className="empty-text">No contributions from this school yet.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header detail-contribs-grid">
                  <span>Title</span>
                  <span>Type</span>
                  <span>By</span>
                  <span>Status</span>
                  <span>Public</span>
                </div>
                {schoolContribs(selectedSchool.id).map((c) => (
                  <div key={c.id} className="admin-table-row detail-contribs-grid">
                    <span className="table-primary">{c.title || `${c.species || "Untitled"}`}</span>
                    <span>{c.type || "Sighting Report"}</span>
                    <span>{c.studentName || c.studentEmail || "—"}</span>
                    <span><span className={`status-badge ${c.status}`}>{c.status}</span></span>
                    <span>{c.isVisibleInPublic ? "Yes" : "No"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Classes ({schoolClasses(selectedSchool.id).length})</h3>
            {schoolClasses(selectedSchool.id).length === 0 ? (
              <p className="empty-text">No classes in this school.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header detail-classes-grid">
                  <span>Class Name</span>
                  <span>Program</span>
                  <span>Teacher</span>
                </div>
                {schoolClasses(selectedSchool.id).map((cls) => (
                  <div key={cls.id} className="admin-table-row detail-classes-grid">
                    <span className="table-primary">{cls.className}</span>
                    <span>{PROGRAMS[cls.classProgram] || cls.classProgram || "—"}</span>
                    <span>{getUserName(cls.teacherId)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      
      {activeTab === "communities" && !selectedOrg && (
        <div className="admin-section">
          <div className="section-header">
            <h3>All Communities ({organizations.length})</h3>
          </div>

          {organizations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌍</div>
              <p>No communities registered on the platform yet.</p>
            </div>
          ) : (
            <div className="card-grid">
              {orgContribStats.map((org) => (
                <div key={org.id} className="entity-card entity-card-community">
                  <div className="entity-card-header">
                    <h4>{org.orgName}</h4>
                    <span className="entity-badge active">Active</span>
                  </div>
                  <p className="entity-location">{org.location || org.bio || "No description"}</p>
                  <div className="entity-stats-row">
                    <div className="entity-stat">
                      <span className="entity-stat-num">{org.memberCount}</span>
                      <span className="entity-stat-lbl">Members</span>
                    </div>
                    <div className="entity-stat">
                      <span className="entity-stat-num">{org.contributionCount}</span>
                      <span className="entity-stat-lbl">Contributions</span>
                    </div>
                  </div>
                  <div className="entity-card-actions">
                    <button className="btn-view" onClick={() => setSelectedOrg(org)}>View Details</button>
                    <button className="btn-delete" onClick={() => handleDeleteOrg(org)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "communities" && selectedOrg && (
        <div className="detail-view">
          <button className="btn-back" onClick={() => setSelectedOrg(null)}>
            ← Back to All Communities
          </button>

          <div className="detail-header">
            <div>
              <h2>{selectedOrg.orgName}</h2>
              <p className="detail-subtitle">{selectedOrg.location || "Location not set"}</p>
              {selectedOrg.bio && <p className="detail-desc">{selectedOrg.bio}</p>}
            </div>
            <button className="btn-delete-lg" onClick={() => handleDeleteOrg(selectedOrg)}>Delete Community</button>
          </div>

          <div className="detail-stats">
            <div className="detail-stat-card">
              <span className="detail-stat-num">{orgUsers(selectedOrg.id).filter((u) => u.role === "chairman").length}</span>
              <span className="detail-stat-lbl">Chairman</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{orgUsers(selectedOrg.id).filter((u) => u.role === "member").length}</span>
              <span className="detail-stat-lbl">Members</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{orgContribs(selectedOrg.id).length}</span>
              <span className="detail-stat-lbl">Contributions</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-num">{orgContribs(selectedOrg.id).filter((c) => c.status === "reviewed").length}</span>
              <span className="detail-stat-lbl">Reviewed</span>
            </div>
          </div>

          
          <div className="admin-section">
            <h3>Members ({orgUsers(selectedOrg.id).length})</h3>
            {orgUsers(selectedOrg.id).length === 0 ? (
              <p className="empty-text">No members in this community.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header detail-users-grid">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Joined</span>
                </div>
                {orgUsers(selectedOrg.id).map((u) => (
                  <div key={u.id} className="admin-table-row detail-users-grid">
                    <span className="table-primary">{u.displayName || "—"}</span>
                    <span>{u.email}</span>
                    <span><span className={`role-badge role-${u.role}`}>{u.role}</span></span>
                    <span>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Contributions ({orgContribs(selectedOrg.id).length})</h3>
            {orgContribs(selectedOrg.id).length === 0 ? (
              <p className="empty-text">No contributions from this community yet.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header detail-contribs-grid">
                  <span>Title</span>
                  <span>Type</span>
                  <span>By</span>
                  <span>Status</span>
                  <span>Public</span>
                </div>
                {orgContribs(selectedOrg.id).map((c) => (
                  <div key={c.id} className="admin-table-row detail-contribs-grid">
                    <span className="table-primary">{c.title || `${c.species || "Untitled"}`}</span>
                    <span>{c.type || "Sighting Report"}</span>
                    <span>{c.studentName || c.studentEmail || "—"}</span>
                    <span><span className={`status-badge ${c.status}`}>{c.status}</span></span>
                    <span>{c.isVisibleInPublic ? "Yes" : "No"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      
      {activeTab === "users" && (
        <div className="admin-section">
          <div className="section-header">
            <h3>All Users ({users.length})</h3>
          </div>

          <div className="user-filters">
            <input
              className="filter-input"
              type="text"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="student">Students ({roleCounts.student})</option>
              <option value="teacher">Teachers ({roleCounts.teacher})</option>
              <option value="principal">Principals ({roleCounts.principal})</option>
              <option value="chairman">Chairmen ({roleCounts.chairman})</option>
              <option value="member">Members ({roleCounts.member})</option>
              <option value="admin">Admins ({roleCounts.admin})</option>
            </select>
            <select
              className="filter-select"
              value={userOrgFilter}
              onChange={(e) => setUserOrgFilter(e.target.value)}
            >
              <option value="all">All Affiliations</option>
              <option value="school">School Users</option>
              <option value="community">Community Users</option>
              <option value="unaffiliated">Unaffiliated</option>
            </select>
          </div>

          <p className="filter-count">Showing {filteredUsers.length} of {users.length} users</p>

          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <p>No users match your filters.</p>
            </div>
          ) : (
            <div className="admin-table">
              <div className="admin-table-header users-grid">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Affiliation</span>
                <span>Joined</span>
              </div>
              {filteredUsers.map((u) => (
                <div key={u.id} className="admin-table-row users-grid">
                  <span className="table-primary">{u.displayName || "—"}</span>
                  <span className="table-email">{u.email}</span>
                  <span><span className={`role-badge role-${u.role}`}>{u.role}</span></span>
                  <span>
                    {u.schoolId ? getSchoolName(u.schoolId) :
                     u.orgId ? getOrgName(u.orgId) : "—"}
                  </span>
                  <span>{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "library" && (
        <div className="admin-section">
          <div className="section-header">
            <h3>Public Library Showcase ({showcaseItems.length} items)</h3>
          </div>
          <p className="section-desc">
            These contributions are visible in the public library showcase. You can remove any item from public visibility.
          </p>

          <div className="user-filters">
            <input
              className="filter-input"
              type="text"
              placeholder="Search by title, type, or contributor..."
              value={showcaseSearch}
              onChange={(e) => setShowcaseSearch(e.target.value)}
            />
          </div>

          {loadingShowcase ? (
            <p className="empty-text">Loading showcase items...</p>
          ) : filteredShowcase.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>{showcaseItems.length === 0 ? "No items published to the public showcase yet." : "No items match your search."}</p>
            </div>
          ) : (
            <div className="showcase-grid">
              {filteredShowcase.map((item) => (
                <div key={item.id} className="showcase-card">
                  <div className="showcase-card-top">
                    <span className="showcase-type">{item.type || "Sighting Report"}</span>
                    <span className={`status-badge ${item.status}`}>{item.status}</span>
                  </div>
                  <h4 className="showcase-title">{item.title || `${item.species || "Untitled"}`}</h4>
                  <p className="showcase-meta">
                    By: {item.studentName || item.studentEmail || "Anonymous"}<br />
                    {item.schoolId ? `School: ${getSchoolName(item.schoolId)}` :
                     item.orgId ? `Community: ${getOrgName(item.orgId)}` : ""}
                  </p>
                  {item.description && (
                    <p className="showcase-desc">{item.description.substring(0, 120)}{item.description.length > 120 ? "..." : ""}</p>
                  )}
                  <button className="btn-remove-showcase" onClick={() => handleRemoveFromShowcase(item)}>
                    Remove from Showcase
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "analytics" && (
        <>
          
          <div className="admin-section">
            <h3>Platform Overview</h3>
            <div className="analytics-metrics">
              <div className="analytics-metric">
                <span className="metric-value">{schools.length}</span>
                <span className="metric-label">Schools</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{organizations.length}</span>
                <span className="metric-label">Communities</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{users.length}</span>
                <span className="metric-label">Total Users</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{contributions.length}</span>
                <span className="metric-label">Contributions</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{statusBreakdown.pending || 0}</span>
                <span className="metric-label">Pending Reviews</span>
              </div>
              <div className="analytics-metric">
                <span className="metric-value">{statusBreakdown.reviewed || 0}</span>
                <span className="metric-label">Reviewed</span>
              </div>
            </div>
          </div>

          
          <div className="admin-section">
            <h3>User Role Distribution</h3>
            <div className="role-distribution">
              {Object.entries(roleCounts).map(([roleName, count]) => (
                <div key={roleName} className="role-dist-row">
                  <span className="role-dist-label">{roleName}</span>
                  <div className="role-dist-bar-bg">
                    <div
                      className={`role-dist-bar role-dist-${roleName}`}
                      style={{ width: `${users.length > 0 ? (count / users.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="role-dist-count">{count} ({users.length > 0 ? Math.round((count / users.length) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>

          
          <div className="admin-section">
            <h3>Contributions by Type</h3>
            {contributionsByType.length === 0 ? (
              <p className="empty-text">No contribution data yet.</p>
            ) : (
              <div className="bar-chart">
                {contributionsByType.map(([type, count]) => (
                  <div key={type} className="bar-row">
                    <span className="bar-label">{type}</span>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill-blue" style={{ width: `${(count / maxContribType) * 100}%` }}></div>
                    </div>
                    <span className="bar-value">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Program Enrollments</h3>
            {programEnrollments.length === 0 ? (
              <p className="empty-text">No enrollment data yet.</p>
            ) : (
              <div className="bar-chart">
                {programEnrollments.map((p) => (
                  <div key={p.name} className="bar-row">
                    <span className="bar-label">{p.name}</span>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill-green" style={{ width: `${(p.count / maxProgram) * 100}%` }}></div>
                    </div>
                    <span className="bar-value">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Contributions by School</h3>
            {schoolContribStats.length === 0 ? (
              <p className="empty-text">No school data yet.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header analytics-school-grid">
                  <span>School</span>
                  <span>Users</span>
                  <span>Students</span>
                  <span>Teachers</span>
                  <span>Contributions</span>
                  <span>Share</span>
                </div>
                {schoolContribStats.map((s) => (
                  <div key={s.id} className="admin-table-row analytics-school-grid">
                    <span className="table-primary">{s.schoolName}</span>
                    <span>{s.userCount}</span>
                    <span>{s.studentCount}</span>
                    <span>{s.teacherCount}</span>
                    <span>{s.contributionCount}</span>
                    <span>{contributions.length > 0 ? Math.round((s.contributionCount / contributions.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          
          <div className="admin-section">
            <h3>Contributions by Community</h3>
            {orgContribStats.length === 0 ? (
              <p className="empty-text">No community data yet.</p>
            ) : (
              <div className="admin-table">
                <div className="admin-table-header analytics-org-grid">
                  <span>Community</span>
                  <span>Members</span>
                  <span>Contributions</span>
                  <span>Share</span>
                </div>
                {orgContribStats.map((o) => (
                  <div key={o.id} className="admin-table-row analytics-org-grid">
                    <span className="table-primary">{o.orgName}</span>
                    <span>{o.memberCount}</span>
                    <span>{o.contributionCount}</span>
                    <span>{contributions.length > 0 ? Math.round((o.contributionCount / contributions.length) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
