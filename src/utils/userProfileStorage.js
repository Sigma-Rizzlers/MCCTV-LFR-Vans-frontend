const userProfileStorageKey = "mcctv:user-profile";

export const emptyUserProfile = Object.freeze({
  name: "",
  phone: "",
  gender: "",
  role: "",
  supportFileName: ""
});

function toText(value) {
  return String(value ?? "").trim();
}

export function sanitizeUserProfile(profile) {
  const rawProfile = profile && typeof profile === "object" ? profile : {};

  return {
    name: toText(rawProfile.name),
    phone: toText(rawProfile.phone),
    gender: toText(rawProfile.gender),
    role: toText(rawProfile.role),
    supportFileName: toText(rawProfile.supportFileName || rawProfile.supportFile?.name)
  };
}

export function loadUserProfile() {
  if (typeof window === "undefined") {
    return { ...emptyUserProfile };
  }

  try {
    const rawValue = window.localStorage.getItem(userProfileStorageKey);
    if (!rawValue) {
      return { ...emptyUserProfile };
    }

    return sanitizeUserProfile(JSON.parse(rawValue));
  } catch (error) {
    console.error(error);
    return { ...emptyUserProfile };
  }
}

export function saveUserProfile(profile) {
  const sanitizedProfile = sanitizeUserProfile(profile);

  if (typeof window === "undefined") {
    return sanitizedProfile;
  }

  const hasValue = Object.values(sanitizedProfile).some(Boolean);

  try {
    if (hasValue) {
      window.localStorage.setItem(userProfileStorageKey, JSON.stringify(sanitizedProfile));
    } else {
      window.localStorage.removeItem(userProfileStorageKey);
    }
  } catch (error) {
    console.error(error);
  }

  return sanitizedProfile;
}
