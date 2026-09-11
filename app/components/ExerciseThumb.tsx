"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";
import { exerciseImage } from "@/lib/exerciseMedia";

export function ExerciseThumb({
  name,
  className = "h-12 w-12",
}: {
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = exerciseImage(name);
  if (!src || failed) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-shighest text-primary ${className}`}
        title={name}
      >
        <Icon name="fitness_center" className="text-[22px]" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-xl bg-shighest object-cover ${className}`}
    />
  );
}
