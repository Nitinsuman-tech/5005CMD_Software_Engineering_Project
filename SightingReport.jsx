import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createNotification } from "../utils/notifications";
import "./SightingReport.css";

const speciesOptions = [
  "Komodo Dragon",
  "Sumatran Tiger",
  "Javan Rhino",
  "Other",
];

const getContributionTypes = (role) => {
  const base = [
    { value: "Sighting Report", label: "🔍 Sighting Report" },
    { value: "Conservation Effort", label: "🌱 Conservation Effort" },
    { value: "Field Notes", label: "📋 Field Notes" },
  ];
  if (role === "member" || role === "chairman") {
    return [
      { value: "Article", label: "📝 Article" },
      { value: "Essay", label: "📄 Essay" },
      { value: "Column", label: "📰 Column" },
      ...base
    ];
  }
  return base;
};

export default function SightingReport() {
  const { user, userData, schoolId } = useAuth();
  const navigate = useNavigate();
  const [contributionType, setContributionType] = useState("Sighting Report");
  const [species, setSpecies] = useState("Komodo Dragon");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    try {
      const q = query(
        collection(db, "contributions"),
        where("studentId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReports(data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  const handleSubmit = async () => {
    if (contributionType === "Sighting Report") {
      if (!species || !location.trim() || !date || !description.trim()) {
        setMessage("Please fill in all required fields (Species, Location, Date, Description).");
        setMessageType("error");
        return;
      }
    } else {
      if (!title.trim() || !description.trim()) {
        setMessage("Please fill in Title and Description.");
        setMessageType("error");
        return;
      }
    }

    setSubmitting(true);
    setMessage("");

    try {
      let photoURL = imageUrl.trim() || "";

      if (photo) {
        const fileRef = ref(storage, `sightings/${user.uid}/${Date.now()}_${photo.name}`);
        await uploadBytes(fileRef, photo);
        photoURL = await getDownloadURL(fileRef);
      }

      const reportTitle = title.trim() || 
        (contributionType === "Sighting Report" 
          ? `${species} Sighting - ${location.trim()}`
          : `${contributionType} - ${new Date().toLocaleDateString()}`);

      const contributionData = {
        studentId: user.uid,
        studentEmail: user.email,
        studentName: userData?.displayName || user.email,
        contributorName: userData?.displayName || user.email,
        schoolId: schoolId || null,
        orgId: userData?.orgId || null,
        organizationType: userData?.orgId ? "community" : (schoolId ? "school" : "none"),
        isVisibleInCommunity: false,
        title: reportTitle,
        type: contributionType,
        species: contributionType === "Sighting Report" ? species : "",
        location: location.trim(),
        date,
        time,
        description: description.trim(),
        photoURL,
        status: "pending",
        feedback: "",
        teacherFeedback: "",
        feedbackDate: null,
        isVisibleInSchool: false,
        isVisibleInPublic: false,
        isPublic: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "contributions"), contributionData);

      

      
      if (schoolId) {
        const teacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const teacherSnap = await getDocs(teacherQ);
        teacherSnap.docs.forEach((t) => {
          createNotification(
            t.id, 
            `New ${contributionType}: ${reportTitle}`,
            schoolId
          );
        });
      } else if (userData?.orgId) {
        const chairmanQ = query(
          collection(db, "users"),
          where("role", "==", "chairman"),
          where("orgId", "==", userData.orgId)
        );
        const chairmanSnap = await getDocs(chairmanQ);
        chairmanSnap.docs.forEach((c) => {
          createNotification(
            c.id, 
            `New ${contributionType} by ${userData?.displayName || user.email}: ${reportTitle}`,
            null,
            { orgId: userData.orgId, type: "system" }
          );
        });
      }

      
      const rolePrefix = userData?.role === "member" ? "/member" : "/student";
      navigate(`${rolePrefix}/profile`, {
        state: { successMessage: `${contributionType} submitted successfully! Your teacher will review it.` }
      });
    } catch (err) {
      console.error("Error submitting report:", err);
      setMessage("Failed to submit. Please try again.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sighting-page">
      <div className="sighting-form-card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button
            className="sighting-back-btn"
            onClick={() => navigate("/student")}
            title="Back to Dashboard"
          >
            Back
          </button>
          <h3 style={{ margin: 0 }}>Upload Conservation Work</h3>
        </div>
        <p className="sighting-form-note">
          Share your conservation efforts, wildlife sightings, and field observations. 
          Please do NOT share exact GPS coordinates or specific locations publicly.
        </p>

        {message && (
          <div className={`sighting-message ${messageType === "success" ? "sighting-message-success" : "sighting-message-error"}`}>
            {message}
          </div>
        )}

        
        <div className="contribution-type-selector">
          {getContributionTypes(userData?.role).map((ct) => (
            <button
              key={ct.value}
              className={`contribution-type-btn ${contributionType === ct.value ? "contribution-type-active" : ""}`}
              onClick={() => setContributionType(ct.value)}
            >
              {ct.label}
            </button>
          ))}
        </div>

        <div className="form-group full-width">
          <label>Title {contributionType !== "Sighting Report" ? "*" : "(optional)"}</label>
          <input
            type="text"
            placeholder={
              contributionType === "Sighting Report"
                ? "e.g. Komodo Dragon spotted near river"
                : contributionType === "Conservation Effort"
                ? "e.g. Beach cleanup at Komodo Island"
                : "e.g. Observations from field trip"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {contributionType === "Sighting Report" && (
          <div className="sighting-form-grid">
            <div className="form-group">
              <label>Species *</label>
              <select value={species} onChange={(e) => setSpecies(e.target.value)}>
                {speciesOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>General Location *</label>
              <input
                type="text"
                placeholder="e.g. Near Rinca Island coast"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              {!location.trim() && <span className="field-hint">Required</span>}
            </div>

            <div className="form-group">
              <label>Date of Sighting *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {!date && <span className="field-hint">Required</span>}
            </div>

            <div className="form-group">
              <label>Time of Sighting</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {contributionType !== "Sighting Report" && (
          <div className="sighting-form-grid">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                placeholder="e.g. Komodo National Park"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="form-group full-width">
          <label>Description *</label>
          <textarea
            placeholder={
              contributionType === "Sighting Report"
                ? "Describe what you observed: animal behavior, habitat conditions, number of animals seen..."
                : contributionType === "Conservation Effort"
                ? "Describe your conservation activity: what you did, who participated, outcomes..."
                : "Write your field notes and observations..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {!description.trim() && <span className="field-hint">Required</span>}
        </div>

        <div className="form-group full-width">
          <label>Image URL (optional)</label>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="form-group full-width">
          <label>Or upload a photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files[0] || null)}
            className="file-input"
          />
          {photo && <span className="file-name">{photo.name}</span>}
        </div>

        <button
          className="sighting-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
          title="Submit your work for teacher review"
        >
          {submitting ? "Submitting..." : "Upload Work"}
        </button>
      </div>
    </div>
  );
}
