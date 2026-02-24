'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const sizes = {
    sm: 14,
    md: 20,
    lg: 28,
  };

  const iconSize = sizes[size];

  const handleClick = (star: number) => {
    if (!readonly && onChange) {
      onChange(star);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = value !== null && star <= Math.round(value);
        const isHalf = value !== null && star === Math.ceil(value) && value % 1 !== 0;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            disabled={readonly}
            className={`transition-colors ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <Star
              size={iconSize}
              className={`transition-colors ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-zinc-600'
              }`}
            />
          </button>
        );
      })}
      {showValue && value !== null && (
        <span className={`ml-2 text-amber-400 font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
