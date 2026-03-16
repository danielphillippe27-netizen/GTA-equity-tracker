export function getFounderEmails() {
  const configured =
    process.env.FOUNDER_EMAILS ||
    process.env.CMA_REQUEST_NOTIFY_EMAIL ||
    '';

  return configured
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isFounderEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getFounderEmails().includes(email.trim().toLowerCase());
}
