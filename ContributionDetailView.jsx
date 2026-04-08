import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import "./ContributionDetailView.css";

export default function ContributionDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contribution, setContribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    document.title = "Contribution Detail - Komodo Hub";
    fetchContribution();
    
  }, [id]);

  const fetchContribution = async () => {
    try {
      const docRef = doc(db, "contributions", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError("Contribution not found.");
        setLoading(false);
        return;
      }

      const data = docSnap.data();

      
      if (!data.isVisibleInPublic) {
        setError("This contribution is private or pending review.");
        setLoading(false);
        return;
      }

      setContribution(data);

      
      const orgType = data.organizationType || (data.schoolId ? "school" : data.orgId ? "community" : "school");
      
      if (orgType === "school" && data.schoolId) {
        try {
          const schoolDoc = await getDoc(doc(db, "schools", data.schoolId));
          if (schoolDoc.exists()) setOrgName(schoolDoc.data().schoolName);
        } catch {  }
      } else if (orgType === "community" && data.orgId) {
        try {
          const orgDoc = await getDoc(doc(db, "organizations", data.orgId));
          if (orgDoc.exists()) setOrgName(orgDoc.data().orgName);
        } catch {  }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching contribution:", err);
      setError("Failed to load contribution details.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cdv-page">
        <div className="cdv-loading">
          <div className="cdv-spinner"></div>
          <p>Loading details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cdv-page">
        <div className="cdv-error-card">
          <h2>Oops!</h2>
          <p>{error}</p>
          <button className="cdv-back-btn" onClick={() => navigate("/public-library")}>
            ← Back to Public Library
          </button>
        </div>
      </div>
    );
  }

  const isSchool = contribution.organizationType === "school" || (!contribution.organizationType && contribution.schoolId);
  const isCommunity = contribution.organizationType === "community" || (!contribution.organizationType && contribution.orgId);

  return (
    <div className="cdv-page">
      <div className="cdv-container">
        <button className="cdv-back-btn" onClick={() => navigate("/public-library")}>
          ← Back to Library
        </button>

        <div className="cdv-card">
          <div className="cdv-header">
            <span className={`cdv-badge ${isCommunity ? "cdv-badge-community" : "cdv-badge-school"}`}>
              {isCommunity ? "🌍 Community Contribution" : "🏫 School Contribution"}
            </span>
            <span className="cdv-type">{contribution.type || "Work"}</span>
            <h1 className="cdv-title">{contribution.title || "Untitled Contribution"}</h1>
          </div>

          <div className="cdv-meta-grid">
            <div className="cdv-meta-item">
              <span className="cdv-meta-label">Organization</span>
              <span className="cdv-meta-value">{orgName || "Unknown Organization"}</span>
            </div>
            
            
            {isCommunity && contribution.contributorName && (
              <div className="cdv-meta-item">
                <span className="cdv-meta-label">Contributor</span>
                <span className="cdv-meta-value">{contribution.contributorName}</span>
              </div>
            )}
            
            {contribution.date && (
              <div className="cdv-meta-item">
                <span className="cdv-meta-label">Date</span>
                <span className="cdv-meta-value">
                  {contribution.date} {contribution.time && `at ${contribution.time}`}
                </span>
              </div>
            )}

            {contribution.location && (
              <div className="cdv-meta-item">
                <span className="cdv-meta-label">Location</span>
                <span className="cdv-meta-value">{contribution.location}</span>
              </div>
            )}

            {contribution.species && (
              <div className="cdv-meta-item">
                <span className="cdv-meta-label">Species</span>
                <span className="cdv-meta-value">{contribution.species}</span>
              </div>
            )}
          </div>

          <div className="cdv-body">
            <h3>Description</h3>
            <p className="cdv-description">{contribution.description}</p>
          </div>

          {contribution.photoURL && (
            <div className="cdv-evidence-section">
              <h3>Evidence & Media</h3>
              <div className="cdv-evidence-actions">
                <a 
                  href={contribution.photoURL} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="cdv-evidence-btn"
                >
                  View Evidence ↗
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
