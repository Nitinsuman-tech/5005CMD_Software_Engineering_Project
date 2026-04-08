import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

export async function createNotification(
  recipientId,
  message,
  schoolId = null,
  {
    type = "system",
    senderId = null,
    orgId = null,
  } = {}
) {
  if (!recipientId) return;

  
  
  try {
    await addDoc(collection(db, "notifications"), {
      recipientId,
      message,
      type,
      senderId,
      isRead: false,
      
      read: false,
      createdAt: serverTimestamp(),
      ...(schoolId ? { schoolId } : {}),
      ...(orgId ? { orgId } : {}),
    });
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return 0;
  try {
    
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", userId),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    
    const batches = [];
    let batch = writeBatch(db);
    let opCount = 0;

    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
      opCount++;
      if (opCount === 499) {
        batches.push(batch);
        batch = writeBatch(db);
        opCount = 0;
      }
    });
    batches.push(batch);

    await Promise.all(batches.map((b) => b.commit()));

    
    try {
      const msgQ = query(
        collection(db, "messages"),
        where("receiverId", "==", userId),
        where("read", "==", false)
      );
      const msgSnap = await getDocs(msgQ);
      if (!msgSnap.empty) {
        const msgBatches = [];
        let msgBatch = writeBatch(db);
        let msgOpCount = 0;
        msgSnap.docs.forEach((d) => {
          msgBatch.update(doc(db, "messages", d.id), { read: true });
          msgOpCount++;
          if (msgOpCount === 499) {
            msgBatches.push(msgBatch);
            msgBatch = writeBatch(db);
            msgOpCount = 0;
          }
        });
        msgBatches.push(msgBatch);
        await Promise.all(msgBatches.map((b) => b.commit()));
      }
    } catch (err) {
      console.error("Error marking all real messages as read:", err);
    }

    return snap.size;
  } catch (err) {
    console.error("Error marking all notifications read:", err);
    return 0;
  }
}

export async function markMessageNotificationsRead(recipientId, senderId) {
  if (!recipientId || !senderId) return;
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", recipientId),
      where("senderId", "==", senderId),
      where("type", "==", "message"),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
    });
    await batch.commit();

    
    try {
      const msgQ = query(
        collection(db, "messages"),
        where("receiverId", "==", recipientId),
        where("senderId", "==", senderId),
        where("read", "==", false)
      );
      const msgSnap = await getDocs(msgQ);
      if (!msgSnap.empty) {
        const msgBatch = writeBatch(db);
        msgSnap.docs.forEach((d) => {
          msgBatch.update(doc(db, "messages", d.id), { read: true });
        });
        await msgBatch.commit();
      }
    } catch (err) {
      console.error("Error marking real messages as read:", err);
    }
  } catch (err) {
    console.error("Error marking message notifications read:", err);
  }
}

export async function markFeedbackNotificationRead(recipientId, contributionId) {
  if (!recipientId || !contributionId) return;
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", recipientId),
      where("contributionId", "==", contributionId),
      where("type", "==", "feedback"),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { isRead: true, read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error marking feedback notification read:", err);
  }
}
