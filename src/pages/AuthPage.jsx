import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../utils/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import "./AuthPage.css";

export default function AuthPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgType, setOrgType] = useState("student");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [orgTypeError, setOrgTypeError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* ── Community Registration fields ── */
  const [communityOrgName, setCommunityOrgName] = useState("");

  /* ── Principal Registration fields ── */
  const [principalSchoolName, setPrincipalSchoolName] = useState("");
  const [principalSchoolDesc, setPrincipalSchoolDesc] = useState("");

  const rememberedEmailKey = "komodoHub.rememberedEmail";

    const needsSchoolAccessCode = orgType === "student" || orgType === "teacher";
  const needsCommunityInviteCode = orgType === "member";
  const needsAccessCode = needsSchoolAccessCode || needsCommunityInviteCode;

  const normalizeEmail = (emailValue) =>
    String(emailValue || "").trim().toLowerCase();

  useEffect(() => {
    document.title = "Login - Komodo Hub";
  }, []);

  useEffect(() => {
    const savedEmail = localStorage.getItem(rememberedEmailKey);

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");
    setAccessCodeError("");
  }, []);

  const routeByType = (type) => {
    const t = String(type || "").trim().toLowerCase();

    if (t === "student") { navigate("/student", { replace: true }); return true; }
    if (t === "public") { navigate("/library", { replace: true }); return true; }
    if (t === "teacher") { navigate("/teacher", { replace: true }); return true; }
    if (t === "principal") { navigate("/principal", { replace: true }); return true; }
    if (t === "admin") { navigate("/admin", { replace: true }); return true; }
    if (t === "chairman") { navigate("/community", { replace: true }); return true; }
    if (t === "member") { navigate("/member", { replace: true }); return true; }

    return false;
  };

  const clearFeedback = () => {
    setMessage("");
    setMessageType("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");
    setAccessCodeError("");
  };

  const resetSensitiveFields = () => {
    setPassword("");
    setConfirmPassword("");
    clearFeedback();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetSensitiveFields();

    if (!rememberMe) {
      setEmail("");
    }
  };

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const isValidEmailFormat = (value) => {
    const trimmed = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const validateForm = () => {
    let valid = true;
    const cleanEmail = normalizeEmail(email);

    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");
    setOrgTypeError("");
    setAccessCodeError("");

    if (!cleanEmail) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!isValidEmailFormat(cleanEmail)) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError("Password is required.");
      valid = false;
    } else if (mode === "register" && password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    }

    if (mode === "register") {
      if (!confirmPassword.trim()) {
        setConfirmPasswordError("Please confirm your password.");
        valid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match.");
        valid = false;
      }
    }

    if (!orgType.trim()) {
      setOrgTypeError("Please select an account type.");
      valid = false;
    }

    if (needsAccessCode && !accessCode.trim()) {
      setAccessCodeError(
        needsSchoolAccessCode
          ? "School Access Code is required for students and teachers."
          : "Community Invite Code is required to join as a member."
      );
      valid = false;
    }

    if (mode === "register" && orgType === "chairman" && !communityOrgName.trim()) {
      showMessage("Organization name is required for chairman registration.", "error");
      valid = false;
    }

    if (mode === "register" && orgType === "principal" && !principalSchoolName.trim()) {
      showMessage("School name is required for principal registration.", "error");
      valid = false;
    }

    if (!valid) {
      showMessage("Please fix the highlighted fields.", "error");
    }

    return valid;
  };

  const persistRememberedEmail = (emailValue) => {
    if (rememberMe) {
      localStorage.setItem(rememberedEmailKey, normalizeEmail(emailValue));
    } else {
      localStorage.removeItem(rememberedEmailKey);
    }
  };

  const mapFirebaseError = (err, currentMode) => {
    const code = err?.code || "";

    switch (code) {
      case "auth/invalid-email":
        setEmailError("Please enter a valid email address.");
        return "The email address format is invalid.";

      case "auth/user-not-found":
        setEmailError("This email is not registered.");
        return "No account was found for this email.";

      case "auth/wrong-password":
        setPasswordError("Incorrect password.");
        return "Incorrect password.";

      case "auth/invalid-credential":
        setEmailError("Email or password is incorrect.");
        setPasswordError("Email or password is incorrect.");
        return "Email or password is incorrect.";

      case "auth/email-already-in-use":
        setEmailError("This email is already registered.");
        return "This email is already registered.";

      case "auth/weak-password":
        setPasswordError("Password should be at least 6 characters.");
        return "Password should be at least 6 characters.";

      case "auth/missing-password":
        setPasswordError("Password is required.");
        return "Password is required.";

      default:
        return currentMode === "register"
          ? "Registration failed. Please try again."
          : "Login failed. Please try again.";
    }
  };

    const validateSchoolAccessCode = async () => {
    const codeQ = query(
      collection(db, "accessCodes"),
      where("code", "==", accessCode.trim().toUpperCase())
    );
    const codeSnap = await getDocs(codeQ);
    const activeDoc = codeSnap.docs.find((d) => d.data().active === true);

    if (!activeDoc) {
      setAccessCodeError("Invalid or expired access code. Please check with your school.");
      showMessage("Invalid access code. Please check with your school.", "error");
      return { valid: false, schoolId: null };
    }

    const schoolId = activeDoc.data().schoolId || null;
    return { valid: true, schoolId };
  };

    const validateCommunityInviteCode = async () => {
    const codeQ = query(
      collection(db, "communityInviteCodes"),
      where("code", "==", accessCode.trim().toUpperCase())
    );
    const codeSnap = await getDocs(codeQ);
    const activeDoc = codeSnap.docs.find((d) => d.data().active === true);

    if (!activeDoc) {
      setAccessCodeError("Invalid or expired invite code. Please check with your community chairman.");
      showMessage("Invalid invite code.", "error");
      return { valid: false, orgId: null };
    }

    const orgId = activeDoc.data().orgId || null;
    return { valid: true, orgId };
  };

    const register = async () => {
    clearFeedback();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const cleanEmail = normalizeEmail(email);
      const cleanRole = String(orgType).trim().toLowerCase();

      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      const defaultDisplayName = cleanEmail.split("@")[0];
      
      
      await updateProfile(credential.user, { 
        displayName: defaultDisplayName,
      });

      const userData = {
        email: cleanEmail,
        role: cleanRole,
        displayName: defaultDisplayName,
        bio: "",
        avatar: "🦎",
        accentColor: "#2E7D32",
        createdAt: serverTimestamp(),
      };

            if (needsSchoolAccessCode) {
        const { valid, schoolId } = await validateSchoolAccessCode();
        if (!valid) {
          try { await deleteUser(credential.user); } catch (e) { console.error(e); }
          setLoading(false);
          return;
        }
        if (schoolId) userData.schoolId = schoolId;
      }

            if (needsCommunityInviteCode) {
        const { valid, orgId } = await validateCommunityInviteCode();
        if (!valid) {
          try { await deleteUser(credential.user); } catch (e) { console.error(e); }
          setLoading(false);
          return;
        }
        if (orgId) userData.orgId = orgId;
      }

            if (cleanRole === "chairman") {
        
        await setDoc(doc(db, "users", credential.user.uid), userData);

        
        const orgRef = await addDoc(collection(db, "organizations"), {
          orgName: communityOrgName.trim(),
          orgType: "community",
          chairmanId: credential.user.uid,
          createdAt: serverTimestamp(),
        });

        
        await updateDoc(doc(db, "users", credential.user.uid), {
          orgId: orgRef.id,
        });

        persistRememberedEmail(cleanEmail);
        setPassword("");
        setConfirmPassword("");
        if (routeByType(cleanRole)) return;
        showMessage("Registered as Chairman successfully!", "success");
        setLoading(false);
        return;
      }

            if (cleanRole === "principal") {
        
        const schoolRef = await addDoc(collection(db, "schools"), {
          schoolName: principalSchoolName.trim(),
          description: principalSchoolDesc.trim(),
          principalId: credential.user.uid,
          createdAt: serverTimestamp(),
        });

        
        userData.schoolId = schoolRef.id;
        await setDoc(doc(db, "users", credential.user.uid), userData);

        persistRememberedEmail(cleanEmail);
        setPassword("");
        setConfirmPassword("");
        if (routeByType(cleanRole)) return;
        showMessage("Registered as Principal successfully! Your school is ready.", "success");
        setLoading(false);
        return;
      }

      await setDoc(doc(db, "users", credential.user.uid), userData);

      persistRememberedEmail(cleanEmail);
      setPassword("");
      setConfirmPassword("");

      if (routeByType(cleanRole)) return;
      showMessage(`Successfully registered as ${cleanRole}.`, "success");
    } catch (err) {
      const friendlyMessage = mapFirebaseError(err, "register");
      showMessage(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

    const login = async () => {
    clearFeedback();
    if (!validateForm()) return;
    setLoading(true);

    let credential = null;

    try {
      const cleanEmail = normalizeEmail(email);
      const selectedRole = String(orgType).trim().toLowerCase();

      
      credential = await signInWithEmailAndPassword(auth, cleanEmail, password);

      persistRememberedEmail(cleanEmail);

      
      const userRef = doc(db, "users", credential.user.uid);
      const userSnap = await getDoc(userRef);

      
      
      if (userSnap.exists()) {
        const dbRole = (userSnap.data().role || "").trim().toLowerCase();
        if (dbRole && dbRole !== selectedRole) {
          // Sign out immediately to prevent partial-auth state
          await signOut(auth);
          showMessage(
            `Unauthorized: Your account does not have ${selectedRole} privileges. You are registered as a ${dbRole}.`,
            "error"
          );
          setLoading(false);
          return;
        }
      }

      
      let role = selectedRole;
      let userSchoolId = null;

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        role = userData.role || role;
        userSchoolId = userData.schoolId || null;
      }

      
      if (needsSchoolAccessCode) {
        const { valid, schoolId } = await validateSchoolAccessCode();
        if (!valid) { setLoading(false); return; }

        
        if (userSchoolId && schoolId && userSchoolId !== schoolId) {
          setAccessCodeError("This access code does not match your registered school.");
          showMessage("Access code does not match your school.", "error");
          setLoading(false);
          return;
        }

        
        if (!userSchoolId && schoolId && userSnap.exists()) {
          await updateDoc(userRef, { schoolId });
        }
      }

      
      if (needsCommunityInviteCode) {
        const { valid, orgId } = await validateCommunityInviteCode();
        if (!valid) { setLoading(false); return; }

        const existingOrgId = userSnap.exists() ? userSnap.data().orgId : null;
        if (!existingOrgId && orgId) {
          await updateDoc(userRef, { orgId });
        }
      }

      
      setPassword("");
      setConfirmPassword("");

      if (routeByType(role)) return;
      showMessage("Logged in successfully.", "success");
    } catch (err) {
      
      
      if (credential?.user) {
        try { await signOut(auth); } catch (_) {  }
      }
      const friendlyMessage = mapFirebaseError(err, "login");
      showMessage(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

    const isSchoolRole = orgType === "student" || orgType === "teacher" || orgType === "principal";
  const isCommunityRole = orgType === "chairman" || orgType === "member";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }} title="Back to home">K</div>
          <h2 className="auth-title">Komodo Hub</h2>
          <p className="auth-subtitle">
            Learn, connect, and protect endangered wildlife
          </p>
        </div>

        {message && (
          <div
            className={`auth-message ${messageType === "success" ? "auth-message-success" : "auth-message-error"}`}
          >
            {message}
          </div>
        )}

        <div className="auth-toggle-container">
          <button
            type="button"
            onClick={() => switchMode("login")}
            disabled={mode === "login" || loading}
            className={`auth-toggle-btn ${mode === "login" ? "auth-toggle-btn-active" : ""}`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            disabled={mode === "register" || loading}
            className={`auth-toggle-btn ${mode === "register" ? "auth-toggle-btn-active" : ""}`}
          >
            Register
          </button>
        </div>

        <input
          className={`auth-input ${emailError ? "auth-input-error" : ""}`}
          type="email"
          autoComplete="off"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMessage("");
            setMessageType("");
            setEmailError("");
          }}
        />
        {emailError && <div className="auth-error-text">{emailError}</div>}

        <div className="auth-password-wrapper">
          <input
            className={`auth-input auth-input-pw ${passwordError ? "auth-input-error" : ""}`}
            type={showPassword ? "text" : "password"}
            autoComplete="off"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMessage("");
              setMessageType("");
              setPasswordError("");
            }}
          />
          <button
            type="button"
            className="auth-pw-toggle"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
        {passwordError && <div className="auth-error-text">{passwordError}</div>}

        {mode === "register" && (
          <>
            <div className="auth-password-wrapper">
              <input
                className={`auth-input auth-input-pw ${confirmPasswordError ? "auth-input-error" : ""}`}
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="off"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setMessage("");
                  setMessageType("");
                  setConfirmPasswordError("");
                }}
              />
              <button
                type="button"
                className="auth-pw-toggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {confirmPasswordError && (
              <div className="auth-error-text">{confirmPasswordError}</div>
            )}
          </>
        )}

        
        <div className="auth-select-group">
          <label className="auth-select-label">Account type</label>

          {mode === "register" && (
            <div className="auth-path-selector">
              <button
                type="button"
                className={`auth-path-btn ${isSchoolRole ? "auth-path-btn-active" : ""}`}
                onClick={() => { setOrgType("student"); setAccessCode(""); setAccessCodeError(""); }}
                disabled={loading}
              >
                🏫 Register as School
              </button>
              <button
                type="button"
                className={`auth-path-btn auth-path-btn-community ${isCommunityRole ? "auth-path-btn-active" : ""}`}
                onClick={() => { setOrgType("chairman"); setAccessCode(""); setAccessCodeError(""); }}
                disabled={loading}
              >
                🌍 Register as Community
              </button>
            </div>
          )}

          <select
            value={orgType}
            onChange={(e) => {
              setOrgType(e.target.value);
              setMessage("");
              setMessageType("");
              setOrgTypeError("");
              setAccessCodeError("");
            }}
            disabled={loading}
            className={`auth-select ${orgTypeError ? "auth-select-error" : ""}`}
          >
            <optgroup label="🏫 School">
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="principal">Principal</option>
            </optgroup>
            <optgroup label="🌍 Community">
              <option value="chairman">Chairman (Create Organization)</option>
              <option value="member">Member (Join Organization)</option>
            </optgroup>
            <optgroup label="Other">
              <option value="admin">Admin</option>
              <option value="public">Public Visitor</option>
            </optgroup>
          </select>
          {orgTypeError && <div className="auth-error-text">{orgTypeError}</div>}
        </div>

        
        {mode === "register" && orgType === "chairman" && (
          <div className="auth-org-name-group">
            <label className="auth-select-label">Organization Name *</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Enter your community organization name"
              value={communityOrgName}
              onChange={(e) => setCommunityOrgName(e.target.value)}
            />
            <p className="auth-org-name-hint">
              This will be the public name of your community organization.
            </p>
          </div>
        )}

        
        {mode === "register" && orgType === "principal" && (
          <div className="auth-org-name-group">
            <label className="auth-select-label">School Name *</label>
            <input
              className="auth-input"
              type="text"
              placeholder="Enter your school name"
              value={principalSchoolName}
              onChange={(e) => setPrincipalSchoolName(e.target.value)}
            />
            <p className="auth-org-name-hint">
              This will be the official name of your school on the platform.
            </p>
            <label className="auth-select-label" style={{ marginTop: "10px" }}>School Description (optional)</label>
            <textarea
              className="auth-input"
              placeholder="Briefly describe your school and conservation programs"
              value={principalSchoolDesc}
              onChange={(e) => setPrincipalSchoolDesc(e.target.value)}
              rows={3}
              style={{ resize: "vertical", minHeight: "60px" }}
            />
          </div>
        )}

        
        {needsSchoolAccessCode && (
          <div className="auth-access-code-group">
            <label className="auth-select-label">School Access Code *</label>
            <input
              className={`auth-input ${accessCodeError ? "auth-input-error" : ""}`}
              type="text"
              autoComplete="off"
              placeholder="Enter 6-character school code"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value.toUpperCase());
                setAccessCodeError("");
                setMessage("");
                setMessageType("");
              }}
              maxLength={6}
            />
            {accessCodeError && <div className="auth-error-text">{accessCodeError}</div>}
            <p className="auth-access-code-hint">
              Get this code from your school principal. Required for students and teachers.
            </p>
          </div>
        )}

        {needsCommunityInviteCode && (
          <div className="auth-access-code-group">
            <label className="auth-select-label">Community Invite Code *</label>
            <input
              className={`auth-input ${accessCodeError ? "auth-input-error" : ""}`}
              type="text"
              autoComplete="off"
              placeholder="Enter 6-character invite code"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value.toUpperCase());
                setAccessCodeError("");
                setMessage("");
                setMessageType("");
              }}
              maxLength={6}
            />
            {accessCodeError && <div className="auth-error-text">{accessCodeError}</div>}
            <p className="auth-access-code-hint">
              Get this code from your community chairman. Required for members.
            </p>
          </div>
        )}

        <label className="auth-remember-label">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => {
              const checked = e.target.checked;
              setRememberMe(checked);

              if (!checked) {
                localStorage.removeItem(rememberedEmailKey);
              }
            }}
          />
          Remember email
        </label>

        {mode === "register" ? (
          <button
            type="button"
            onClick={register}
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        ) : (
          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        )}

        <button
          type="button"
          className="auth-public-link"
          onClick={() => navigate("/library")}
        >
          Browse Public Library (no account needed)
        </button>
      </div>
    </div>
  );
}
