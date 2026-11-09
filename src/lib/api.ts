import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { getCurrentUser, isAdmin, type User } from "./auth";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Base class for errors raised by domain modules (developers, progression) that
 * already know the HTTP status they should map to.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "bad_request",
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(status: number, message: string, code = "error", details?: unknown) {
  return NextResponse.json({ error: { message, code, details } }, { status, headers: { "Cache-Control": "no-store" } });
}

type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Wraps route handlers with uniform JSON error handling. */
export function route(handler: Handler) {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(error.status, error.message, error.code, error.details);
      }
      if (error instanceof ZodError) {
        return fail(422, "Validation failed.", "validation_error", error.flatten());
      }
      // Domain errors carry their own status and message; surface them as-is
      // instead of collapsing every one of them into a 500.
      if (error instanceof DomainError) {
        return fail(error.status, error.message, error.code);
      }
      console.error("[api]", error);
      return fail(500, "Something went wrong. Please try again.", "internal_error");
    }
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Sign in with Telegram to continue.", "unauthorized");
  if (user.status === "suspended") throw new HttpError(403, "This account is suspended.", "suspended");
  if (user.status !== "active") throw new HttpError(403, "This account is not active.", "inactive");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) throw new HttpError(403, "Administrator access is required.", "forbidden");
  return user;
}

export async function parseBody<S extends ZodTypeAny>(request: NextRequest, schema: S): Promise<z.infer<S>> {
  const contentType = request.headers.get("content-type") ?? "";
  let raw: unknown;
  if (contentType.includes("application/json")) {
    raw = await request.json().catch(() => {
      throw new HttpError(400, "Request body is not valid JSON.", "bad_request");
    });
  } else {
    throw new HttpError(415, "Content-Type must be application/json.", "unsupported_media_type");
  }
  return schema.parse(raw);
}

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Same-origin enforcement for state changing requests (CSRF defense in depth). */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // native Mini App fetch may omit Origin; cookies are SameSite=Lax
  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      throw new HttpError(403, "Cross-origin request rejected.", "cross_origin");
    }
  } catch {
    throw new HttpError(403, "Invalid origin.", "cross_origin");
  }
}
