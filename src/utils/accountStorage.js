import bcrypt from "bcryptjs";

const accountsKey = "mcctv:accounts";
const VALID_ROLES = ["user", "admin", "superadmin"];
const BCRYPT_ROUNDS = 10;

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

export async function createAccount({ unitName, username, password, role }) {
  const accounts = loadAccounts();
  const trimmedUsername = toText(username);
  if (!trimmedUsername) return { error: "Username is required." };
  const trimmedPassword = toText(password);
  if (!trimmedPassword) return { error: "Password is required." };
  if (!VALID_ROLES.includes(role)) return { error: "Invalid role." };
  if (accounts.some((a) => a.username === trimmedUsername)) {
    return { error: "Username already exists." };
  }
  const hash = await bcrypt.hash(trimmedPassword, BCRYPT_ROUNDS);
  const account = sanitizeAccount({
    id: createAccountId(),
    unitName: toText(unitName),
    username: trimmedUsername,
    password: hash,
    role,
    createdAt: new Date().toISOString()
  });
  if (!account) return { error: "Invalid account data." };
  saveAllAccounts([...accounts, account]);
  return { account };
}

export async function updateAccount(id, changes) {
  const accounts = loadAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return { error: "Account not found." };
  const trimmedUsername = toText(changes.username ?? accounts[index].username);
  if (!trimmedUsername) return { error: "Username is required." };
  if (accounts.some((a, i) => a.username === trimmedUsername && i !== index)) {
    return { error: "Username already taken." };
  }
  const resolvedChanges = { ...changes };
  if (changes.password && toText(changes.password)) {
    resolvedChanges.password = await bcrypt.hash(toText(changes.password), BCRYPT_ROUNDS);
  }
  const updated = sanitizeAccount({ ...accounts[index], ...resolvedChanges, username: trimmedUsername });
  if (!updated) return { error: "Invalid account data." };
  const next = [...accounts];
  next[index] = updated;
  saveAllAccounts(next);
  return { account: updated };
}

export function deleteAccount(id) {
  saveAllAccounts(loadAccounts().filter((a) => a.id !== id));
}

export async function findAccount(username, password) {
  const account = loadAccounts().find((a) => a.username === username);
  if (!account) return null;
  const match = await bcrypt.compare(password, account.password);
  return match ? account : null;
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

export async function seedDefaultAccounts() {
  if (typeof window === "undefined") return;
  const existing = loadAccounts();
  if (existing.length > 0) return;

  const defaults = [
    { unitName: "Default User", username: "user", password: "123456", role: "user" },
    { unitName: "Default Admin", username: "admin", password: "123456", role: "admin" },
    { unitName: "Default Superadmin", username: "superadmin", password: "123456", role: "superadmin" }
  ];

  for (const account of defaults) {
    await createAccount(account);
  }
}

export async function migrateAccountPasswords() {
  if (typeof window === "undefined") return;
  const accounts = loadAccounts();
  if (accounts.length === 0) return;

  const needsMigration = accounts.some((a) => !a.password.startsWith("$2"));
  if (!needsMigration) return;

  const migrated = await Promise.all(
    accounts.map(async (a) => {
      if (a.password.startsWith("$2")) return a;
      const hash = await bcrypt.hash(a.password, BCRYPT_ROUNDS);
      return { ...a, password: hash };
    })
  );

  saveAllAccounts(migrated);
}
