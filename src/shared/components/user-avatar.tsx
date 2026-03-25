import Image from "next/image";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-lg",
};

const imageSizes = {
  sm: 40,
  md: 56,
  lg: 80,
};

export function UserAvatar({ name, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const initials = getInitials(name);
  const containerClassName = [
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-950 bg-slate-950 font-heading uppercase tracking-[0.18em] text-zinc-100",
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (avatarUrl) {
    return (
      <span className={containerClassName}>
        <Image src={avatarUrl} alt={`Foto de ${name}`} fill sizes={`${imageSizes[size]}px`} className="object-cover" />
      </span>
    );
  }

  return <span className={containerClassName}>{initials}</span>;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "US";
}
