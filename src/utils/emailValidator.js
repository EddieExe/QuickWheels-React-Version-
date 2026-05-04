// Checks email format properly
function isValidEmailFormat(email) {
  // standard format check
  const formatRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!formatRegex.test(email)) return false;

  const [local, domain] = email.split("@");

  // local part checks
  if (local.length < 2) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;

  // domain checks
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;

  // check for repeated characters — catches sssss@gmail.com
  const repeatedChars = /^(.)\1{4,}/.test(local); // 5+ same chars at start
  if (repeatedChars) return false;

  // local part must have some variety — not all same character
  const uniqueChars = new Set(local.replace(/[^a-zA-Z0-9]/g, "")).size;
  if (uniqueChars < 3) return false;

  // minimum local length
  if (local.replace(/[^a-zA-Z0-9]/g, "").length < 3) return false;

  return true;
}

// Get error message
export function validateEmail(email) {
  if (!email) return "Email is required.";
  if (!email.includes("@")) return "Email must include '@'.";
  if (!isValidEmailFormat(email)) {
    return "Sorry, this doesn't look like a valid email.";
  }
  return null; // null means valid
}

export default validateEmail;