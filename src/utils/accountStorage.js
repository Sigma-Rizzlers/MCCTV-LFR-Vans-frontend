const accountsKey = "mcctv:accounts";
const VALID_ROLES = ["user", "admin", "superadmin"];

function toText(value) {
  return String(value ?? "").trim();
}

function createAccountId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `ACC-${y}${m}${d}-${h}${min}${s}${rand}`;
}

function sanitizeAccount(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = toText(raw.id);
  const username = toText(raw.username);
  const role = VALID_ROLES.includes(raw.role) ? raw.role : null;
  if (!id || !username || !role) return null;
  return {
    id,
    unitName: toText(raw.unitName),
    username,
    password: toText(raw.password),
    role,
    createdAt: toText(raw.createdAt)
  };
}

export function loadAccounts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(accountsKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeAccount).filter(Boolean);
  } catch {
    return [];
  }
}

function saveAllAccounts(accounts) {
  window.localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

export function createAccount({ unitName, username, password, role }) {
  const accounts = loadAccounts();
  const trimmedUsername = toText(username);
  if (!trimmedUsername) return { error: "Username is required." };
  if (!toText(password)) return { error: "Password is required." };
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role." };
  if (accounts.some((a) => a.username === trimmedUsername)) {
    return { error: "Username already exists." };
  }
  const account = sanitizeAccount({
    id: createAccountId(),
    unitName: toText(unitName),
    username: trimmedUsername,
    password: toText(password),
    role,
    createdAt: new Date().toISOString()
  });
  if (!account) return { error: "Invalid account data." };
  saveAllAccounts([...accounts, account]);
  return { account };
}

export function updateAccount(id, changes) {
  const accounts = loadAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return { error: "Account not found." };
  const trimmedUsername = toText(changes.username ?? accounts[index].username);
  if (!trimmedUsername) return { error: "Username is required." };
  if (accounts.some((a, i) => a.username === trimmedUsername && i !== index)) {
    return { error: "Username already taken." };
  }
  const updated = sanitizeAccount({ ...accounts[index], ...changes, username: trimmedUsername });
  if (!updated) return { error: "Invalid account data." };
  const next = [...accounts];
  next[index] = updated;
  saveAllAccounts(next);
  return { account: updated };
}

export function deleteAccount(id) {
  saveAllAccounts(loadAccounts().filter((a) => a.id !== id));
}

export function findAccount(username, password) {
  return loadAccounts().find((a) => a.username === username && a.password === password) ?? null;
}

const lastLoginPrefix = "mcctv:last-login:";

export function recordLastLogin(username) {
  if (typeof window === "undefined" || !username) return;
  window.localStorage.setItem(`${lastLoginPrefix}${username}`, new Date().toISOString());
}

export function getLastLogin(username) {
  if (typeof window === "undefined" || !username) return null;
  return window.localStorage.getItem(`${lastLoginPrefix}${username}`) ?? null;
}

export function seedDefaultAccounts() {
  if (typeof window === "undefined") return;
  const existing = loadAccounts();
  if (existing.length > 0) return;

  const defaults = [
    { unitName: "Default User", username: "user", password: "123456", role: "user" },
    { unitName: "Default Admin", username: "admin", password: "123456", role: "admin" },
    { unitName: "Default Superadmin", username: "superadmin", password: "123456", role: "superadmin" }
  ];

  for (const account of defaults) {
    createAccount(account);
  }
}
