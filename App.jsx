import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./AuthPage";
import EnrolPage from "./EnrolPage";
import PublicLibrary from "./PublicLibrary";

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 20% 20%, #d7ffe1 0%, #f4f6f8 45%, #e8f5e9 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(46,125,50,0.25), rgba(46,125,50,0))",
            top: -150,
            left: -150,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, rgba(46,125,50,0.18), rgba(46,125,50,0))",
            bottom: -180,
            right: -160,
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route path="/enrol" element={<EnrolPage />} />
            <Route path="/library" element={<PublicLibrary />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}