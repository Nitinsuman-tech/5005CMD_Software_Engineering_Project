import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  or,
} from "firebase/firestore";
import { createNotification, markMessageNotificationsRead } from "../utils/notifications";
import "./Messages.css";

export default function Messages() {
  const { user, userData, role, schoolId, orgId, classIds } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [selectedUserRole, setSelectedUserRole] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [showNewChat, setShowNewChat] = useState(false);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Cache of validated receiver schoolIds/orgIds for cross-org check
  const [contactSchoolMap, setContactSchoolMap] = useState({});
  const [contactOrgMap, setContactOrgMap] = useState({});

  const messagesEndRef = useRef(null);

  // Determine messaging context: school-based or community-based
  const isSchoolUser = role === "student" || role === "teacher" || role === "principal";
  const isCommunityUser = role === "chairman" || role === "member";

  
  const isBlocked = !user || role === "public";

  
  
  
  
  
  useEffect(() => {
    if (!user || isBlocked) return;

    const q = query(
      collection(db, "messages"),
      or(
        where("senderId", "==", user.uid),
        where("receiverId", "==", user.uid)
      )
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      
      const convMap = {};
      allMessages.forEach((msg) => {
        const otherId =
          msg.senderId === user.uid ? msg.receiverId : msg.senderId;
        const otherEmail =
          msg.senderId === user.uid ? msg.receiverEmail : msg.senderEmail;
        const otherRole =
          msg.senderId === user.uid ? msg.receiverRole : msg.senderRole;
        const ts = msg.timestamp?.seconds || 0;

        if (!convMap[otherId]) {
          convMap[otherId] = {
            userId: otherId,
            email: otherEmail || otherId,
            role: otherRole || "",
            lastMessage: msg.content || msg.text || "",
            lastTimestamp: msg.timestamp,
            unread: 0,
          };
        } else if (ts > (convMap[otherId].lastTimestamp?.seconds || 0)) {
          convMap[otherId].lastMessage = msg.content || msg.text || "";
          convMap[otherId].lastTimestamp = msg.timestamp;
        }

        if (msg.receiverId === user.uid && !msg.read) {
          convMap[otherId].unread += 1;
        }
      });

      const sorted = Object.values(convMap).sort((a, b) => {
        const ta = a.lastTimestamp?.seconds || 0;
        const tb = b.lastTimestamp?.seconds || 0;
        return tb - ta;
      });

      setConversations(sorted);
    });

    return () => unsub();
  }, [user, isBlocked]);

  // ────────────────────────────────────────────────────────────────
  // Listener 2: messages for the currently-selected conversation.
  // Uses two simple equality queries (sent + received) so no composite
  // index is needed. Results are merged and sorted client-side.
  // ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !selectedUserId || isBlocked) {
      setMessages([]);
      return;
    }

    // Clear stale messages immediately when switching conversation
    setMessages([]);

    // Mutable refs that onSnapshot closures can both write to
    let sentMsgs = [];
    let recvMsgs = [];

    const merge = () => {
      const combined = [...sentMsgs, ...recvMsgs];
      combined.sort((a, b) => {
        const ta = a.timestamp?.seconds ?? 0;
        const tb = b.timestamp?.seconds ?? 0;
        return ta - tb;
      });
      setMessages(combined);
    };

    const sentQ = query(
      collection(db, "messages"),
      where("senderId", "==", user.uid),
      where("receiverId", "==", selectedUserId)
    );

    const recvQ = query(
      collection(db, "messages"),
      where("senderId", "==", selectedUserId),
      where("receiverId", "==", user.uid)
    );

    const unsub1 = onSnapshot(sentQ, (snap) => {
      sentMsgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    });

    const unsub2 = onSnapshot(recvQ, (snap) => {
      recvMsgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
      
      if (recvMsgs.some((m) => !m.read)) {
        markMessageNotificationsRead(user.uid, selectedUserId);
      }
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user?.uid, selectedUserId, isBlocked]);

  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  
  
  const loadAvailableContacts = useCallback(async () => {
    setLoadingContacts(true);
    setAvailableContacts([]);
    setSendError("");

    // Community users need orgId; school users need schoolId
    if (isSchoolUser && !schoolId) {
      setLoadingContacts(false);
      return;
    }
    if (isCommunityUser && !orgId) {
      setLoadingContacts(false);
      return;
    }

    try {
      let contacts = [];
      const schoolMap = {};
      const orgMap = {};

      if (role === "student") {
        
        const teacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const teacherSnap = await getDocs(teacherQ);
        const teacherIds = new Set();
        teacherSnap.docs.forEach((d) => {
          if (d.id !== user.uid) {
            teacherIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "teacher", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });

        
        if (classIds && classIds.length > 0) {
          const addedStudents = new Set();
          for (const classId of classIds) {
            const memberQ = query(collection(db, "classMembers"), where("classId", "==", classId));
            const memberSnap = await getDocs(memberQ);
            for (const memberDoc of memberSnap.docs) {
              const sid = memberDoc.data().studentId;
              if (sid !== user.uid && !teacherIds.has(sid) && !addedStudents.has(sid)) {
                addedStudents.add(sid);
                const userDoc = await getDoc(doc(db, "users", sid));
                if (userDoc.exists()) {
                  const ud = userDoc.data();
                  if (ud.schoolId === schoolId) {
                    contacts.push({ id: sid, email: ud.displayName || ud.email, role: "student", schoolId: ud.schoolId });
                    schoolMap[sid] = ud.schoolId;
                  }
                }
              }
            }
          }
        }
      } else if (role === "teacher") {
        const addedIds = new Set();

        
        if (classIds && classIds.length > 0) {
          for (const classId of classIds) {
            const memberQ = query(collection(db, "classMembers"), where("classId", "==", classId));
            const memberSnap = await getDocs(memberQ);
            for (const memberDoc of memberSnap.docs) {
              const sid = memberDoc.data().studentId;
              if (sid !== user.uid && !addedIds.has(sid)) {
                addedIds.add(sid);
                const userDoc = await getDoc(doc(db, "users", sid));
                if (userDoc.exists()) {
                  const ud = userDoc.data();
                  if (ud.schoolId === schoolId) {
                    contacts.push({ id: sid, email: ud.displayName || ud.email, role: "student", schoolId: ud.schoolId });
                    schoolMap[sid] = ud.schoolId;
                  }
                }
              }
            }
          }
        }

        
        const principalQ = query(
          collection(db, "users"),
          where("role", "==", "principal"),
          where("schoolId", "==", schoolId)
        );
        const principalSnap = await getDocs(principalQ);
        principalSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "principal", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });

        
        const otherTeacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const otherTeacherSnap = await getDocs(otherTeacherQ);
        otherTeacherSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "teacher", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });
      } else if (role === "principal") {
        
        const teacherQ = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
          where("schoolId", "==", schoolId)
        );
        const snap = await getDocs(teacherQ);
        snap.docs.forEach((d) => {
          if (d.id !== user.uid) {
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "teacher", schoolId: data.schoolId });
            schoolMap[d.id] = data.schoolId;
          }
        });
      } else if (role === "chairman") {
        
        const memberQ = query(
          collection(db, "users"),
          where("role", "==", "member"),
          where("orgId", "==", orgId)
        );
        const memberSnap = await getDocs(memberQ);
        memberSnap.docs.forEach((d) => {
          if (d.id !== user.uid) {
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "member", orgId: data.orgId });
            orgMap[d.id] = data.orgId;
          }
        });
      } else if (role === "member") {
        
        const addedIds = new Set();

        
        const chairQ = query(
          collection(db, "users"),
          where("role", "==", "chairman"),
          where("orgId", "==", orgId)
        );
        const chairSnap = await getDocs(chairQ);
        chairSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "chairman", orgId: data.orgId });
            orgMap[d.id] = data.orgId;
          }
        });

        
        const otherMemberQ = query(
          collection(db, "users"),
          where("role", "==", "member"),
          where("orgId", "==", orgId)
        );
        const otherMemberSnap = await getDocs(otherMemberQ);
        otherMemberSnap.docs.forEach((d) => {
          if (d.id !== user.uid && !addedIds.has(d.id)) {
            addedIds.add(d.id);
            const data = d.data();
            contacts.push({ id: d.id, email: data.displayName || data.email, role: "member", orgId: data.orgId });
            orgMap[d.id] = data.orgId;
          }
        });
      }

      setContactSchoolMap(schoolMap);
      setContactOrgMap(orgMap);
      setAvailableContacts(contacts);
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setLoadingContacts(false);
    }
  }, [user, role, schoolId, orgId, classIds, isSchoolUser, isCommunityUser]);

  
  
  
  const selectConversation = (conv) => {
    setSelectedUserId(conv.userId);
    setSelectedUserEmail(conv.email);
    setSelectedUserRole(conv.role || "");
    setShowNewChat(false);
    setSendError("");
    // Mark message notifications from this sender as read (read-trigger)
    markMessageNotificationsRead(user.uid, conv.userId);
  };

  const handleToggleNewChat = () => {
    const next = !showNewChat;
    setShowNewChat(next);
    if (next) loadAvailableContacts();
  };

  const startConversation = (contact) => {
    setSelectedUserId(contact.id);
    setSelectedUserEmail(contact.email);
    setSelectedUserRole(contact.role || "");
    setShowNewChat(false);
    setAvailableContacts([]);
    setSendError("");
    // Mark message notifications from this sender as read (read-trigger)
    markMessageNotificationsRead(user.uid, contact.id);
  };

  // ────────────────────────────────────────────────────────────────
  // RBAC validation before send
  // ────────────────────────────────────────────────────────────────
  const validateSend = async (receiverId) => {
    if (!user || role === "public") {
      return "You do not have permission to send messages.";
    }
    if (receiverId === user.uid) return "You cannot send a message to yourself.";

    try {
      const receiverDoc = await getDoc(doc(db, "users", receiverId));
      if (!receiverDoc.exists()) return "Recipient not found.";
      const receiverData = receiverDoc.data();

      
      if (isSchoolUser) {
        const receiverSchoolId = contactSchoolMap[receiverId] || receiverData.schoolId;
        if (schoolId && receiverSchoolId && schoolId !== receiverSchoolId) {
          return "You cannot send messages to users outside your school.";
        }
        
        if (receiverData.orgId && !receiverData.schoolId) {
          return "You cannot send messages to community members from a school account.";
        }
      }

      
      if (isCommunityUser) {
        const receiverOrgId = contactOrgMap[receiverId] || receiverData.orgId;
        if (orgId && receiverOrgId && orgId !== receiverOrgId) {
          return "You cannot send messages to users outside your organization.";
        }
        
        if (receiverData.schoolId && !receiverData.orgId) {
          return "You cannot send messages to school members from a community account.";
        }
      }
    } catch {
      return "Unable to verify recipient. Please try again.";
    }

    return null;
  };

  
  
  
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId) return;
    setSending(true);
    setSendError("");

    try {
      const validationError = await validateSend(selectedUserId);
      if (validationError) {
        setSendError(validationError);
        return;
      }

      await addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderEmail: userData?.displayName || user.email,
        senderRole: role,
        receiverId: selectedUserId,
        receiverEmail: selectedUserEmail,
        receiverRole: selectedUserRole,
        schoolId: schoolId || null,
        orgId: orgId || null,
        content: newMessage.trim(),
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false,
      });

      
      createNotification(
        selectedUserId,
        `New message from ${userData?.displayName || user.email}`,
        schoolId || orgId,
        { type: "message", senderId: user.uid }
      );
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setSendError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  
  
  
  const formatTime = (timestamp) => {
    if (!timestamp?.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeClass = (r) => {
    if (r === "teacher") return "role-badge-teacher";
    if (r === "principal") return "role-badge-principal";
    if (r === "student") return "role-badge-student";
    if (r === "chairman") return "role-badge-principal";
    if (r === "member") return "role-badge-student";
    return "role-badge-default";
  };

  const backPath =
    role === "teacher" ? "/teacher" :
    role === "principal" ? "/principal" :
    role === "chairman" ? "/community" :
    role === "member" ? "/member" :
    "/student";

  
  
  
  if (isBlocked) {
    return (
      <div className="messages-page">
        <div className="messages-blocked">
          <div className="blocked-icon">🔒</div>
          <h3>Access Denied</h3>
          <p>The messaging system is only available to registered school and community members.</p>
          <p className="blocked-note">Please log in to access messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <div className="messages-container">
        
        <div className="messages-sidebar">
          <div className="messages-sidebar-header">
            <button
              className="messages-back-btn"
              onClick={() => navigate(backPath)}
              title="Back to Dashboard"
            >
              Back
            </button>
            <h3>Messages</h3>
            <button
              className="new-chat-btn"
              onClick={handleToggleNewChat}
              title="Start a new conversation"
            >
              +
            </button>
          </div>

          <div className="messages-security-notice">
            <span className="security-icon">🔒</span>
            {role === "student" && <span>You can message teachers and classmates within your school.</span>}
            {role === "teacher" && <span>You can message your students and the school principal.</span>}
            {role === "principal" && <span>You can message teachers at your school.</span>}
            {role === "chairman" && <span>You can message members within your community organization.</span>}
            {role === "member" && <span>You can message your chairman and other members in your organization.</span>}
          </div>

          {showNewChat && (
            <div className="new-chat-section">
              <p className="new-chat-label">
                {role === "student" ? "Teachers & Classmates:" :
                 role === "teacher" ? "Students & Staff:" :
                 role === "principal" ? "School Teachers:" :
                 role === "chairman" ? "Community Members:" :
                 role === "member" ? "Chairman & Members:" :
                 "Contacts:"}
              </p>
              {loadingContacts ? (
                <p className="loading-text">Loading contacts...</p>
              ) : availableContacts.length === 0 ? (
                <p className="no-results-text">
                  {role === "student"
                    ? "No contacts found. Make sure you're enrolled in a class."
                    : "No contacts found at your school."}
                </p>
              ) : (
                availableContacts.map((r) => (
                  <button
                    key={r.id}
                    className="search-result-btn"
                    onClick={() => startConversation(r)}
                  >
                    <span>{r.email}</span>
                    <span className={`search-result-role ${getRoleBadgeClass(r.role)}`}>
                      {r.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="conversations-list">
            {conversations.length === 0 && (
              <p className="no-conversations">No conversations yet.</p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.userId}
                className={`conversation-item ${selectedUserId === conv.userId ? "conversation-active" : ""}`}
                onClick={() => selectConversation(conv)}
              >
                <div className="conversation-avatar">
                  {(conv.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="conversation-info">
                  <div className="conversation-email">{conv.email}</div>
                  <div className="conversation-preview">{conv.lastMessage}</div>
                </div>
                <div className="conversation-meta">
                  {conv.role && (
                    <span className={`conv-role-badge ${getRoleBadgeClass(conv.role)}`}>
                      {conv.role}
                    </span>
                  )}
                  {conv.unread > 0 && (
                    <span className="unread-badge">{conv.unread}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        
        <div className="messages-main">
          {!selectedUserId ? (
            <div className="no-chat-selected">
              <div className="no-chat-icon">✉️</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the left panel or start a new one.</p>
              <div className="rbac-info-box">
                <h4>Messaging Rules:</h4>
                <ul>
                  <li>Messages are restricted to your school only</li>
                  <li>Students can message their teachers and classmates</li>
                  <li>Teachers can message their students and the principal</li>
                  <li>Cross-school messaging is not permitted</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-header-avatar">
                  {selectedUserEmail.charAt(0).toUpperCase()}
                </div>
                <div className="chat-header-info">
                  <span className="chat-header-email">{selectedUserEmail}</span>
                  {selectedUserRole && (
                    <span className={`chat-header-role ${getRoleBadgeClass(selectedUserRole)}`}>
                      {selectedUserRole}
                    </span>
                  )}
                </div>
              </div>

              <div className="chat-messages">
                {messages.length === 0 && (
                  <p className="no-messages">No messages yet. Say hello!</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble ${msg.senderId === user.uid ? "chat-bubble-sent" : "chat-bubble-received"}`}
                  >
                    <div className="bubble-text">{msg.content || msg.text}</div>
                    <div className="bubble-time">{formatTime(msg.timestamp)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {sendError && (
                <div className="send-error-bar">
                  <span className="send-error-icon">⚠️</span>
                  <span>{sendError}</span>
                </div>
              )}

              <div className="chat-input-area">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); setSendError(""); }}
                  onKeyDown={handleKeyDown}
                  className="chat-input"
                />
                <button
                  className="chat-send-btn"
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
