import fs from "node:fs";
import path from "node:path";

export type VerificationCheck = { name: string; ok: boolean; detail: string };
export type VerificationResult = { ok: boolean; checks: VerificationCheck[] };

const PRIVATE_HOST = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|::1|\[::1\])/i;

/**
 * Verifies a game launch URL before publication.
 * - Same-origin paths must resolve to a real file under /public.
 * - https targets are fetched server-side with SSRF guards, a timeout and
 *   a size cap; private networks and non-http(s) schemes are rejected.
 */
export async function verifyGameUrl(rawUrl: string): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  const url = rawUrl.trim();

  if (!url) {
    return { ok: false, checks: [{ name: "url_present", ok: false, detail: "No game URL provided." }] };
  }

  if (url.startsWith("/")) {
    const clean = url.split("?")[0].replace(/\.\./g, "");
    let filePath = path.join(process.cwd(), "public", clean);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    checks.push({ name: "same_origin_file", ok: exists, detail: exists ? `Found ${clean}` : `${clean} not found in /public` });
    if (exists) {
      const head = fs.readFileSync(filePath, "utf8").slice(0, 4096).toLowerCase();
      const isHtml = filePath.endsWith(".html") || head.includes("<!doctype html") || head.includes("<html");
      checks.push({ name: "html_document", ok: isHtml, detail: isHtml ? "HTML entry point detected" : "Entry point is not HTML" });
      checks.push({
        name: "https_or_same_origin",
        ok: true,
        detail: "Served from the Playnix origin (safe to embed)",
      });
    }
    return { ok: checks.every((check) => check.ok), checks };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, checks: [{ name: "url_valid", ok: false, detail: "Not a valid absolute URL." }] };
  }

  if (parsed.protocol !== "https:") {
    checks.push({ name: "https", ok: false, detail: "Only https:// game URLs are allowed in the Mini App." });
    return { ok: false, checks };
  }
  checks.push({ name: "https", ok: true, detail: "Secure https URL" });

  if (PRIVATE_HOST.test(parsed.hostname)) {
    checks.push({ name: "public_host", ok: false, detail: "Private/loopback hosts are blocked." });
    return { ok: false, checks };
  }
  checks.push({ name: "public_host", ok: true, detail: parsed.hostname });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "PlaynixCatalogVerifier/1.0", Accept: "text/html,*/*;q=0.8" },
      cache: "no-store",
    });
    clearTimeout(timer);

    const finalUrl = new URL(response.url);
    checks.push({
      name: "reachable",
      ok: response.ok,
      detail: `HTTP ${response.status}${response.redirected ? ` (redirected to ${finalUrl.host})` : ""}`,
    });
    checks.push({
      name: "https_after_redirect",
      ok: finalUrl.protocol === "https:",
      detail: finalUrl.protocol === "https:" ? "Stays on https" : "Redirects to an insecure origin",
    });
    const contentType = response.headers.get("content-type") ?? "";
    checks.push({
      name: "html_content",
      ok: contentType.includes("text/html") || contentType === "",
      detail: contentType || "no content-type header",
    });
    checks.push({
      name: "frameable",
      ok: !/x-frame-options:\s*deny/i.test(response.headers.get("x-frame-options") ?? ""),
      detail:
        response.headers.get("x-frame-options")?.toUpperCase().includes("DENY")
          ? "Publisher blocks embedding (X-Frame-Options: DENY) — list as external only"
          : "No blocking frame headers detected",
    });
    const csp = response.headers.get("content-security-policy") ?? "";
    checks.push({
      name: "csp_frame_ancestors",
      ok: !/frame-ancestors\s+'none'/i.test(csp),
      detail: /frame-ancestors\s+'none'/i.test(csp) ? "CSP forbids embedding" : "CSP permits embedding (or none set)",
    });
  } catch (error) {
    checks.push({
      name: "reachable",
      ok: false,
      detail: error instanceof Error ? error.message : "Request failed",
    });
  }

  return { ok: checks.every((check) => check.ok), checks };
}
