import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { markAllNotificationsRead } from "../utils/notifications";
import "./Notifications.css";

export default function Notifications() {
  const { user, schoolId, orgId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  
  const [optimisticAllRead, setOptimisticAllRead] = useState(false);
  const ref = useRef(null);

  
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotifications(data);
      
      setOptimisticAllRead(false);
    });

    return () => unsub();
  }, [user]);

  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

    const isUnread = (n) => {
    
    if (n.isRead === true || n.read === true) return false;
    
    if (schoolId && n.schoolId && n.schoolId !== schoolId) return false;
    if (orgId && n.orgId && n.orgId !== orgId) return false;
    return true;
  };

  const unreadCount = optimisticAllRead
    ? 0
    : notifications.filter(isUnread).length;

  
  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), {
        isRead: true,
        read: true,
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  
  const handleMarkAllRead = async () => {
    
    setOptimisticAllRead(true);
    
    await markAllNotificationsRead(user.uid);
  };

  const formatTime = (ts) => {
    if (!ts?.seconds) return "";
    const d = new Date(ts.seconds * 1000);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "message":   return "✉️";
      case "feedback":  return "💬";
      case "published": return "📢";
      default:          return "🔔";
    }
  };

  return (
    <div className="notifications-wrapper" ref={ref}>
      
      <button
        className="notifications-bell"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <span className="bell-icon">&#128276;</span>
        {unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      
      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <span className="notifications-title">
              Notifications
              {unreadCount > 0 && (
                <span className="notif-header-count"> ({unreadCount} new)</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                ✓ Mark all read
              </button>
            )}
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">No notifications yet.</div>
            ) : (
              notifications.slice(0, 30).map((n) => {
                const unread = isUnread(n);
                return (
                  <button
                    key={n.id}
                    className={`notification-item ${unread ? "notification-unread" : ""}`}
                    onClick={() => {
                      if (unread) markAsRead(n.id);
                    }}
                  >
                    <span className="notif-type-icon">{getTypeIcon(n.type)}</span>
                    <div className="notif-content">
                      <div className="notification-message">{n.message}</div>
                      <div className="notification-time">{formatTime(n.createdAt)}</div>
                    </div>
                    {unread && <span className="notif-dot" aria-label="unread" />}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 30 && (
            <div className="notifications-footer">
              Showing latest 30 notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
