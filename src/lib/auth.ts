// Auth utility functions
export interface User {
  username: string;
  password: string;
}

const CURRENT_USER_KEY = "operator_id";

// Fixed users - tidak bisa ditambah atau diubah
const FIXED_USERS: User[] = [
  { username: "AA1212", password: "1212" },
  { username: "BB2121", password: "2121" },
  { username: "AB1122", password: "1122" }
];

/**
 * Get all registered users (fixed users only)
 */
export function getUsers(): User[] {
  return FIXED_USERS;
}

/**
 * Login with username and password
 * Returns true if credentials are valid, false otherwise
 */
export function login(username: string, password: string): { success: boolean; message: string } {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/d7de010a-ed7c-4a1b-a47c-6f7bb4b59610',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:27',message:'login called',data:{username,hasPassword:!!password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (!username || !password) {
    return { success: false, message: "Username dan password harus diisi" };
  }

  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/d7de010a-ed7c-4a1b-a47c-6f7bb4b59610',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:34',message:'Searching user',data:{userCount:FIXED_USERS.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Check if user exists and password matches
  const user = FIXED_USERS.find(u => u.username === username);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/d7de010a-ed7c-4a1b-a47c-6f7bb4b59610',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:39',message:'User found',data:{userFound:!!user,passwordMatch:user?.password===password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (!user) {
    return { success: false, message: "Username tidak ditemukan" };
  }

  if (user.password !== password) {
    return { success: false, message: "Password salah" };
  }

  // Save current user
  localStorage.setItem(CURRENT_USER_KEY, username);
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/d7de010a-ed7c-4a1b-a47c-6f7bb4b59610',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.ts:52',message:'WELCOME ',data:{username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  return { success: true, message: "WELCOME" };
}

/**
 * Check if any users have been registered
 * Always returns true since we have fixed users
 */
export function hasRegisteredUsers(): boolean {
  return true;
}

/**
 * Get current logged in user
 */
export function getCurrentUser(): string | null {
  // Pastikan hanya dijalankan di browser
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return null;
  }
  
  try {
    return localStorage.getItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Logout current user
 */
export function logout(): void {
  // Pastikan hanya dijalankan di browser
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error during logout:', error);
  }
}