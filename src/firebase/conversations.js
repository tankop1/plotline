import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Save AI conversation for a project
export const saveConversation = async (projectId, messages) => {
  try {
    const conversationRef = doc(db, "conversations", projectId);
    await updateDoc(conversationRef, {
      messages: messages,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // If document doesn't exist, create it
    if (error.code === "not-found") {
      try {
        const conversationRef = doc(db, "conversations", projectId);
        await setDoc(conversationRef, {
          projectId: projectId,
          messages: messages,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (createError) {
        console.error("Error creating conversation:", createError);
        throw createError;
      }
    } else {
      console.error("Error saving conversation:", error);
      throw error;
    }
  }
};

// Load AI conversation for a project
export const loadConversation = async (projectId) => {
  try {
    const conversationRef = doc(db, "conversations", projectId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      const data = conversationSnap.data();
      // Convert Firestore timestamps back to Date objects
      const messages =
        data.messages?.map((message) => ({
          ...message,
          timestamp: message.timestamp?.toDate() || new Date(),
        })) || [];
      return messages;
    } else {
      return []; // Return empty array if no conversation exists
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
    return []; // Return empty array on error
  }
};
