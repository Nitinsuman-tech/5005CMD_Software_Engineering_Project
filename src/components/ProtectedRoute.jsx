import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


const ROLE_HOME = {
  student: "/student",
  teacher: "/teacher",
  principal: "/principal",
  admin: "/admin",
  chairman: "/community",
  member: "/member",
  public: "/library",
};

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        gap: "16px",
        background: "linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%)",
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: "5px solid #c8e6c9",
          borderTopColor: "#2E7D32",
          borderRadius: "50%",
          animation: "protectedRouteSpinner 0.9s linear infinite",
        }} />
        <p style={{
          color: "#4f6f52",
          fontWeight: 600,
          fontSize: "15px",
          margin: 0,
          letterSpacing: "0.01em",
        }}>
          Verifying your session…
        </p>
        <style>{`
          @keyframes protectedRouteSpinner {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    
    const redirect = role ? (ROLE_HOME[role] || "/") : "/";
    return <Navigate to={redirect} replace />;
  }

  return children;
}
