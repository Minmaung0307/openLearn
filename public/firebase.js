export const firebaseConfig={}; export const LIVE=!!firebaseConfig.apiKey;
export let auth={}; export let onAuthStateChanged=(a,cb)=>cb(null); export let signOut=async()=>{};