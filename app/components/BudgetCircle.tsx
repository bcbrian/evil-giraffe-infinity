import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BudgetCircleProps {
  percentage: number;
  amount: number;
  daysLeft: number;
  backgroundColor: string;
  startColor: string;
  endColor: string;
  textColor: string;
  strokeColor: string;
}

export function BudgetCircle({
  percentage,
  amount,
  daysLeft,
  backgroundColor,
  startColor,
  endColor,
  textColor,
  strokeColor,
}: BudgetCircleProps) {
  const [showPercentage, setShowPercentage] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowPercentage((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const slideVariants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 100 : -100,
        opacity: 0,
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 100 : -100,
        opacity: 0,
      };
    },
  };

  const getColor = (percentage: number) => {
    const startRGB = hexToRgb(startColor);
    const endRGB = hexToRgb(endColor);

    if (!startRGB || !endRGB) return startColor; // Fallback to start color if conversion fails

    const r = Math.round(
      startRGB.r + (endRGB.r - startRGB.r) * (percentage / 100)
    );
    const g = Math.round(
      startRGB.g + (endRGB.g - startRGB.g) * (percentage / 100)
    );
    const b = Math.round(
      startRGB.b + (endRGB.b - startRGB.b) * (percentage / 100)
    );

    return `rgb(${r}, ${g}, ${b})`;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const fillColor = getColor(percentage);

  return (
    <div className="relative w-64 h-64 mb-8">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className={backgroundColor}
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="44"
          cx="50"
          cy="50"
        />
        <circle
          className={percentage > 75 ? "strobe" : ""}
          stroke={fillColor}
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r="44"
          cx="50"
          cy="50"
          strokeDasharray="276.46"
          strokeDashoffset={276.46 * (1 - percentage / 100)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
        <div className="relative h-12 overflow-hidden">
          <AnimatePresence initial={false} custom={showPercentage ? 1 : -1}>
            <motion.div
              key={showPercentage ? "percentage" : "amount"}
              custom={showPercentage ? 1 : -1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute w-full"
            >
              {showPercentage ? (
                <div className={`text-4xl font-bold ${textColor}`}>
                  {percentage}%
                </div>
              ) : (
                <div className={`text-4xl font-bold ${textColor}`}>
                  ${amount.toFixed(2)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={`text-xl ${strokeColor}`}>{daysLeft} days left</div>
      </div>
    </div>
  );
}
