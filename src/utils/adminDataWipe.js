/**
 * Admin Data Wipe Utility
 * Purges all user-generated documents from Firestore while preserving:
 * - The primary admin user account
 * - Global reference/seed data (library, species_data, resources)
 * - Collection schemas and Firebase rules
 */
import { db } from "./firebase";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

// Collections containing user-generated data (will be purged)
const USER_DATA_COLLECTIONS = [
  "users",
  "schools",
  "organizations",
  "classes",
  "classMembers",
  "contributions",
  "enrollments",
  "sightings",
  "notifications",
  "messages",
  "accessCodes",
  "communityInviteCodes",
  "quiz_results",
];

// Collections containing seed/reference data (will NOT be purged)
// "library", "species_data", "resources"

/**
 * Purge all user-generated documents from Firestore.
 * @param {string} adminUserId - The UID of the admin user to preserve
 * @param {function} onProgress - Optional callback for progress updates (collectionName, deletedCount)
 * @returns {Promise<Object>} Summary of deleted counts per collection
 */
export async function purgeAllData(adminUserId, onProgress) {
  if (!adminUserId) {
    throw new Error("Admin user ID is required to prevent self-deletion.");
  }

  const summary = {};
  let totalDeleted = 0;

  for (const collName of USER_DATA_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, collName));
      let deletedInCollection = 0;

      // Filter out the admin user doc from the users collection
      const docsToDelete = snap.docs.filter((d) => {
        if (collName === "users" && d.id === adminUserId) {
          return false; // Preserve admin account
        }
        return true;
      });

      if (docsToDelete.length === 0) {
        summary[collName] = 0;
        if (onProgress) onProgress(collName, 0, totalDeleted);
        continue;
      }

      // Batch delete (max 499 operations per batch)
      const batches = [];
      let batch = writeBatch(db);
      let opCount = 0;

      for (const d of docsToDelete) {
        batch.delete(doc(db, collName, d.id));
        opCount++;
        if (opCount >= 499) {
          batches.push(batch);
          batch = writeBatch(db);
          opCount = 0;
        }
      }
      if (opCount > 0) batches.push(batch);

      for (const b of batches) {
        await b.commit();
      }

      deletedInCollection = docsToDelete.length;
      totalDeleted += deletedInCollection;
      summary[collName] = deletedInCollection;

      if (onProgress) onProgress(collName, deletedInCollection, totalDeleted);
    } catch (err) {
      console.error(`Error purging collection "${collName}":`, err);
      summary[collName] = `ERROR: ${err.message}`;
    }
  }

  summary._total = totalDeleted;
  return summary;
}
