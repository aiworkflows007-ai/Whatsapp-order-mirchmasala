export function envValue(name: string): string {
  const raw = process.env[name] || "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const quote = trimmed[0];
  if (quote === `"` || quote === "'") {
    const closingIndex = trimmed.indexOf(quote, 1);
    return closingIndex > 0 ? trimmed.slice(1, closingIndex) : trimmed.slice(1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}
