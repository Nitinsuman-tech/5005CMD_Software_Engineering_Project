import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import "./Sidebar.css";


const roleDashboardPath = {
  student: "/student",
  teacher: "/teacher",
  principal: "/principal",
  chairman: "/community",
  member: "/member",
  admin: "/admin",
};

const navLinks = {
  student: [
    { label: "Dashboard", path: "/student", icon: "\u{1F3E0}", tooltip: "View your student dashboard" },
    { label: "My Programs", path: "/student/enrol", icon: "\u{1F4DA}", tooltip: "Browse and enrol in conservation programs" },
    { label: "My Work", path: "/student/sightings", icon: "\u{1F4DD}", tooltip: "Submit new conservation work" },
    { label: "School Library", path: "/student/library", icon: "\u{1F4D6}", tooltip: "Browse your school's contribution library" },
    { label: "Messages", path: "/student/messages", icon: "\u{2709}\uFE0F", tooltip: "Message your school teachers and classmates" },
    { label: "Species Quiz", path: "/student/quiz", icon: "🎮", tooltip: "Test your species knowledge" },
    { label: "My Canvas", path: "/student/profile", icon: "\u{1F3A8}", tooltip: "View your work canvas and portfolio" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  teacher: [
    { label: "Dashboard", path: "/teacher", icon: "\u{1F3E0}", tooltip: "View your teacher dashboard" },
    { label: "Review Dashboard", path: "/teacher/library", icon: "\u{1F50D}", tooltip: "Review and manage student submissions" },
    { label: "School Library", path: "/teacher/school-library", icon: "\u{1F4D6}", tooltip: "Browse your school's contribution library" },
    { label: "Messages", path: "/teacher/messages", icon: "\u{2709}\uFE0F", tooltip: "Message students and principal at your school" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  principal: [
    { label: "Dashboard", path: "/principal", icon: "\u{1F3E0}", tooltip: "Manage your school overview" },
    { label: "School Library", path: "/principal/library", icon: "\u{1F4D6}", tooltip: "View all student contributions at your school" },
    { label: "Messages", path: "/principal/messages", icon: "\u{2709}\uFE0F", tooltip: "Message teachers at your school" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  chairman: [
    { label: "Dashboard", path: "/community", icon: "\u{1F3E0}", tooltip: "Manage your community organization" },
    { label: "Review Dashboard", path: "/community/review", icon: "\u{1F50D}", tooltip: "Review member contributions" },
    { label: "Community Library", path: "/community/library", icon: "\u{1F4D6}", tooltip: "View all member contributions" },
    { label: "Messages", path: "/community/messages", icon: "\u{2709}\uFE0F", tooltip: "Message community members" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  member: [
    { label: "Dashboard", path: "/member", icon: "\u{1F3E0}", tooltip: "View your member dashboard" },
    { label: "My Contributions", path: "/member/sightings", icon: "\u{1F4DD}", tooltip: "Submit articles and sighting reports" },
    { label: "Community Library", path: "/member/library", icon: "\u{1F4D6}", tooltip: "Browse your community's contribution library" },
    { label: "My Canvas", path: "/member/profile", icon: "\u{1F3A8}", tooltip: "View your public canvas" },
    { label: "Messages", path: "/member/messages", icon: "\u{2709}\uFE0F", tooltip: "Message community members" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
  ],
  admin: [
    { label: "Dashboard", path: "/admin", icon: "\u{1F3E0}", tooltip: "Platform-wide admin dashboard" },
    { label: "Schools", path: "/admin/schools", icon: "\u{1F3EB}", tooltip: "View and manage all schools" },
    { label: "Communities", path: "/admin/communities", icon: "\u{1F30D}", tooltip: "View and manage all communities" },
    { label: "Users", path: "/admin/users", icon: "\u{1F465}", tooltip: "View all registered users" },
    { label: "Manage Library", path: "/admin/manage-library", icon: "\u{1F4DA}", tooltip: "Manage public library showcase" },
    { label: "Analytics", path: "/admin/analytics", icon: "\u{1F4C8}", tooltip: "Platform-wide analytics" },
    { label: "Public Library", path: "/public-library", icon: "\u{1F30D}", tooltip: "Browse the public species library and showcase" },
    { label: "Settings", path: "/settings", icon: "\u{2699}\uFE0F", tooltip: "Profile settings" },
  ],
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, displayName, role, logout } = useAuth();

  const [totalContributions, setTotalContributions] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  const links = navLinks[role] || [];
  const homePath = roleDashboardPath[role] || "/";

  const showCanvasStats = role === "student" || role === "member";

  useEffect(() => {
    if (!user || !showCanvasStats) return;

    const fetchStats = async () => {
      try {
        const q = query(
          collection(db, "contributions"),
          where("studentId", "==", user.uid)
        );
        const snap = await getDocs(q);
        setTotalContributions(snap.size);
        const reviewed = snap.docs.filter(
          (d) => d.data().status !== "pending"
        ).length;
        setReviewedCount(reviewed);
      } catch (err) {
        console.error("Error fetching canvas stats:", err);
      }
    };

    fetchStats();
  }, [user, showCanvasStats]);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
      try {
        await signOut(auth);
        window.location.replace("/");
      } catch (err) {
        console.error("Logout failed:", err);
      }
    }
  };

  return (
    <div className="sidebar">
      <div
        className="sidebar-header"
        onClick={() => navigate(homePath)}
        style={{ cursor: "pointer" }}
        title="Go to Dashboard"
      >
        <div className="sidebar-logo">K</div>
        <span className="sidebar-title">Komodo Hub</span>
      </div>

      
      {showCanvasStats && (
        <div className="sidebar-canvas-stats">
          <div className="sidebar-canvas-title">My Canvas</div>
          <div className="sidebar-canvas-row">
            <span className="sidebar-canvas-label">Total Contributions</span>
            <span className="sidebar-canvas-value">{totalContributions}</span>
          </div>
          <div className="sidebar-canvas-row">
            <span className="sidebar-canvas-label">Learning Progress</span>
            <span className="sidebar-canvas-value">{reviewedCount}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {links.map((link) => (
          <button
            key={link.path}
            className={`sidebar-link ${location.pathname === link.path ? "sidebar-link-active" : ""}`}
            onClick={() => navigate(link.path)}
            title={link.tooltip}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <span className="sidebar-role-badge">{role}</span>
          <div className="sidebar-user-email">{displayName || user?.email}</div>
        </div>
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}
