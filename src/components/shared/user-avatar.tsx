import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "size-9 text-sm",
  md: "size-11 text-base",
  lg: "size-24 text-2xl",
};

/** Circular avatar — the uploaded photo when present, else the name's initial in a tinted circle. */
export function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-section-workspace-bg font-heading font-semibold text-brand",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar, arbitrary local/remote origin, next/image would need per-deploy remotePatterns config
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}
