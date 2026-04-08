import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../utils/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import "./ProfileSettings.css";

const avatarOptions = [
  { emoji: "🦎", label: "Komodo" },
  { emoji: "🐅", label: "Tiger" },
  { emoji: "🦏", label: "Rhino" },
  { emoji: "🐘", label: "Elephant" },
  { emoji: "🦜", label: "Parrot" },
  { emoji: "🐢", label: "Turtle" },
  { emoji: "🦈", label: "Shark" },
  { emoji: "🐒", label: "Monkey" },
  { emoji: "🌿", label: "Plant" },
  { emoji: "🌊", label: "Ocean" },
];

const colorOptions = [
  { name: "Forest Green", value: "#2E7D32" },
  { name: "Dark Teal", value: "#00695C" },
  { name: "Ocean Blue", value: "#1565C0" },
  { name: "Warm Amber", value: "#E65100" },
  { name: "Deep Purple", value: "#6A1B9A" },
];

export default function ProfileSettings() {
  const { user, role } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("🦎");
  const [accentColor, setAccentColor] = useState("#2E7D32");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || "");
          setBio(data.bio || "");
          setAvatar(data.avatar || "🦎");
          setAccentColor(data.accentColor || "#2E7D32");
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      // 1. Sync with Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        photoURL: avatar,
      });

      // 2. Sync with Firestore
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar,
        accentColor,
      });
      setSaveMessage("Profile saved successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setSaveMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const roleTitles = {
    student: "Student",
    teacher: "Teacher",
    principal: "Principal",
    admin: "Administrator",
    chairman: "Chairman",
    member: "Community Member",
  };

  return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-header">
          <div className="ps-avatar-display" style={{ borderColor: accentColor }}>
            {avatar}
          </div>
          <div>
            <h3 className="ps-title">My Profile</h3>
            <span className="ps-role-badge" style={{ background: accentColor }}>
              {roleTitles[role] || role}
            </span>
          </div>
        </div>

        {loading ? (
          <p className="ps-loading">Loading profile...</p>
        ) : (
          <div className="ps-form">
            
            <div className="ps-field">
              <label>Avatar</label>
              <div className="ps-avatar-options">
                {avatarOptions.map((opt) => (
                  <button
                    key={opt.emoji}
                    className={`ps-avatar-option ${avatar === opt.emoji ? "ps-avatar-active" : ""}`}
                    onClick={() => setAvatar(opt.emoji)}
                    title={opt.label}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>

            
            <div className="ps-field">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="ps-input"
              />
            </div>

            
            <div className="ps-field">
              <label>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a short bio about yourself..."
                className="ps-textarea"
                rows={4}
              />
            </div>

            
            <div className="ps-field">
              <label>Email</label>
              <input
                type="text"
                value={user?.email || ""}
                disabled
                className="ps-input ps-input-disabled"
              />
              <span className="ps-field-hint">Email cannot be changed.</span>
            </div>

            
            <div className="ps-field">
              <label>Accent Color</label>
              <div className="ps-color-options">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    className={`ps-color-option ${accentColor === c.value ? "ps-color-active" : ""}`}
                    style={{ background: c.value }}
                    onClick={() => setAccentColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {saveMessage && (
              <p className={`ps-save-message ${saveMessage.includes("success") ? "ps-msg-success" : "ps-msg-error"}`}>
                {saveMessage}
              </p>
            )}

            <button
              className="ps-save-btn"
              style={{ background: accentColor }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
