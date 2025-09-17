// functions/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getDatabase } = require("firebase-admin/database");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const ref = db.doc(`users/${user.uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: (user.email || "").toLowerCase(),
      displayName: user.displayName || "",
      role: "student",
      ts: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
});

const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;

exports.purgeOldChats = onSchedule("every 24 hours", async () => {
  const db = getDatabase();
  const cutoff = Date.now() - TEN_DAYS;

  // helper: delete under a room path where ts < cutoff
  async function purgeRoom(path){
    const snap = await db.ref(path).orderByChild("ts").endAt(cutoff).get();
    if (!snap.exists()) return;
    const updates = {};
    snap.forEach(child => { updates[child.key] = null; });
    await db.ref(path).update(updates);
  }

  // 1) global
  await purgeRoom("chats/global");

  // 2) per-course: list rooms under /chats, skip "global"
  const rooms = await db.ref("chats").get();
  if (rooms.exists()){
    const promises = [];
    rooms.forEach(r=>{
      if (r.key === "global") return;
      promises.push(purgeRoom(`chats/${r.key}`));
    });
    await Promise.all(promises);
  }

  console.log("Purged old chats up to", new Date(cutoff).toISOString());
});