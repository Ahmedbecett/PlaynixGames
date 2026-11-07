export function Avatar({
  photoUrl,
  name,
  size = 36,
}: {
  photoUrl?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name ?? "P").trim().charAt(0).toUpperCase() || "P";
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name ?? "Player"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size, border: "1px solid rgba(139,92,246,.45)" }}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-full font-extrabold text-[#0b0f18]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: "linear-gradient(135deg,#FF7A18,#8B5CF6)",
      }}
    >
      {initial}
    </span>
  );
}
