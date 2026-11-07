import { z } from "zod";

export const GAME_TYPES = ["html5", "external", "native_apk"] as const;
export const PRICING_TYPES = ["free", "premium"] as const;
export const PUBLICATION_STATUSES = [
  "draft",
  "pending",
  "approved",
  "published",
  "rejected",
  "disabled",
] as const;

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only.");

const safeHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a valid URL.")
  .refine((value) => /^https?:\/\//i.test(value), "Only http(s) URLs are allowed.");

/** Absolute http(s) URL or a same-origin path such as /covers/game.jpg */
const assetRef = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith("/")) return !value.startsWith("//") && !value.includes("..");
    if (!/^https?:\/\//i.test(value)) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use an https URL or a path that starts with /.");

export const gameInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: slugSchema,
  shortDescription: z.string(). trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  coverUrl: assetRef.optional().or(z.literal("")),
  developer: z.string().trim().max(120).optional().or(z.literal("")),
  publisher: z.string().trim().max(120).optional().or(z.literal("")),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  gameUrl: assetRef.optional().or(z.literal("")),
  gameType: z.enum(GAME_TYPES).default("html5"),
  source: z.string().trim().max(200).optional().or(z.literal("")),
  license: z.string().trim().max(200).optional().or(z.literal("")),
  pricingType: z.enum(PRICING_TYPES).default("free"),
  publicationStatus: z.enum(PUBLICATION_STATUSES).default("draft"),
  featured: z.boolean().default(false),
  releasedAt: z.string().trim().max(20).optional().or(z.literal("")),
  supportedDevices: z.string().trim().max(200).optional().or(z.literal("")),
  controls: z.string().trim().max(400).optional().or(z.literal("")),
  languages: z.string().trim().max(200).optional().or(z.literal("")),
  orientation: z.enum(["any", "portrait", "landscape"]).default("any"),
  screenshots: z.array(assetRef).max(8).default([]),
});

export type GameInput = z.infer<typeof gameInputSchema>;

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().max(1200).optional().or(z.literal("")),
});

export const reportInputSchema = z.object({
  reason: z.enum(["not_working", "broken_link", "inappropriate", "copyright", "other"]),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  nameAr: z.string().trim().max(60).optional().or(z.literal("")),
  nameFr: z.string().trim().max(60).optional().or(z.literal("")),
  slug: slugSchema,
  description: z.string().trim().max(400).optional().or(z.literal("")),
  icon: z.string().trim().max(8).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const suggestionInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  url: safeHttpUrl.optional().or(z.literal("")),
  note: z.string().trim().max(600).optional().or(z.literal("")),
});

export const notificationInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  url: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adPlacementInputSchema = z.object({
  key: z.enum(["home_banner", "game_details", "home_promo", "search_sponsored"]),
  enabled: z.boolean(),
  imageUrl: safeHttpUrl.optional().or(z.literal("")),
  targetUrl: safeHttpUrl.optional().or(z.literal("")),
});

export const campaignInputSchema = z.object({
  gameId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  status: z.enum(["draft", "active", "paused", "ended"]).default("draft"),
  budgetStars: z.number().int().min(0).max(1_000_000).default(0),
  startsAt: z.string().trim().max(30).optional().or(z.literal("")),
  endsAt: z.string().trim().max(30).optional().or(z.literal("")),
});

export const planInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  nameAr: z.string().trim().max(60).optional().or(z.literal("")),
  nameFr: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  price: z.number().int().min(1).max(100_000),
  durationDays: z.number().int().min(1).max(3650),
  features: z.array(z.string().trim().max(120)).max(12).default([]),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const profileUpdateSchema = z.object({
  language: z.enum(["en", "ar", "fr"]).optional(),
});
