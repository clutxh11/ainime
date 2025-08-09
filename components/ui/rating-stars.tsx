"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  totalRatings?: number;
  userRating?: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  showTotal?: boolean;
  className?: string;
}

export function RatingStars({
  rating,
  totalRatings = 0,
  userRating = 0,
  onRatingChange,
  interactive = false,
  size = "md",
  showTotal = false,
  className,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleStarClick = async (starRating: number) => {
    if (!interactive || isSubmitting) return;

    setIsSubmitting(true);

    if (onRatingChange) {
      await onRatingChange(starRating);
    }

    setIsSubmitting(false);
  };

  const handleStarHover = (starRating: number) => {
    if (!interactive) return;
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  const displayRating = interactive
    ? hoverRating || userRating || rating
    : rating;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive || isSubmitting}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
            className={cn(
              "transition-colors duration-200",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-400"
              )}
            />
          </button>
        ))}
      </div>

      {showTotal && (
        <span className="text-sm text-gray-400 ml-2">
          ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
        </span>
      )}
    </div>
  );
}
