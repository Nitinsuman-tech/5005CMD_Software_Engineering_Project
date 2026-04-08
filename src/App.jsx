import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import PublicLibrary from "./pages/PublicLibrary";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherLibrary from "./pages/TeacherLibrary";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EnrolPage from "./pages/EnrolPage";
import SightingReport from "./pages/SightingReport";
import SightingsList from "./pages/SightingsList";
import Messages from "./pages/Messages";
import SchoolLibrary from "./pages/SchoolLibrary";
import StudentProfile from "./pages/StudentProfile";
import SpeciesQuiz from "./pages/SpeciesQuiz";
import CommunityDashboard from "./pages/CommunityDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import MemberProfile from "./pages/MemberProfile";
import ProfileSettings from "./pages/ProfileSettings";
import CommunityLibrary from "./pages/CommunityLibrary";
import ChairmanLibrary from "./pages/ChairmanLibrary";
import StudentDetail from "./pages/StudentDetail";
import MyCanvas from "./pages/MyCanvas";
import LandingPage from "./pages/LandingPage";
import NotFound from "./pages/NotFound";
import ContributionDetailView from "./pages/ContributionDetailView";
import "./styles/App.css";

function DashboardLayout({ title, children }) {
  useEffect(() => {
    document.title = `${title} - Komodo Hub`;
  }, [title]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Navbar title={title} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/library" element={<PublicLibrary />} />
        <Route path="/public-library" element={<PublicLibrary />} />
        <Route path="/sighting/:id" element={<ContributionDetailView />} />

        
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout title="Profile Settings">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Student Dashboard">
                <StudentDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/enrol"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Enrol in Programs">
                <EnrolPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/sightings"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Sighting Reports">
                <SightingReport />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/messages"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="My Canvas">
                <MyCanvas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/library"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="School Library">
                <SchoolLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        

        <Route
          path="/student/quiz"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Species ID Quiz">
                <SpeciesQuiz />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Teacher Dashboard">
                <TeacherDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/sightings"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Sighting Reports">
                <SightingsList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/student/:id"
          element={
            <ProtectedRoute allowedRoles={["teacher", "principal", "chairman"]}>
              <DashboardLayout title="Student Canvas">
                <StudentDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/library"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="School Library">
                <TeacherLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/messages"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/school-library"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="School Library">
                <SchoolLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/principal"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="Principal Dashboard">
                <PrincipalDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/library"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="School Library">
                <SchoolLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/messages"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/profile"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        

        
        <Route
          path="/community"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Community Dashboard">
                <CommunityDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/review"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Review Dashboard">
                <ChairmanLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/library"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Community Library">
                <CommunityLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/messages"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/profile"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="My Profile">
                <MemberProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Member Dashboard">
                <MemberDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/sightings"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="My Contributions">
                <SightingReport />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />



        <Route
          path="/member/library"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Community Library">
                <CommunityLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/messages"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/profile"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="My Canvas">
                <MyCanvas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/member/profile/:id"
          element={<MemberProfile />}
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Admin Dashboard">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/schools"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Manage Schools">
                <AdminDashboard initialTab="schools" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/communities"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Manage Communities">
                <AdminDashboard initialTab="communities" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Manage Users">
                <AdminDashboard initialTab="users" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/manage-library"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Manage Public Library">
                <AdminDashboard initialTab="library" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Platform Analytics">
                <AdminDashboard initialTab="analytics" />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
