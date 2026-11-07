"use client";

import { track, type TrackName } from "@/lib/analytics-client";

export function TrackAnchor({
  href,
  event,
  className,
  children,
}: {
  href: string;
  event: TrackName;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} className={className} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} onClick={() => track(event)}>
      {children}
    </a>
  );
}
