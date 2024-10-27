import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface BudgetCircleProps {
  percentage: number;
  amount: number;
  daysLeft: number;
}

export function BudgetCircle({
  percentage,
  amount,
  daysLeft,
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
        y: direction > 0 ? 20 : -20,
        opacity: 0,
      };
    },
    center: {
      zIndex: 1,
      y: 0,
      opacity: 1,
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        y: direction < 0 ? 20 : -20,
        opacity: 0,
      };
    },
  };

  const getColor = (percentage: number) => {
    if (percentage <= 50) return "rgb(74, 222, 128)"; // green-400
    if (percentage <= 75) return "rgb(250, 204, 21)"; // yellow-400
    if (percentage <= 100) return "rgb(248, 113, 113)"; // red-400
    return "rgb(239, 68, 68)"; // red-500
  };

  const fillColor = getColor(percentage);

  const isOverBudget = percentage > 100;

  return (
    <div className="relative w-64 h-64 mb-8">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle
          className="text-purple-900"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="44"
          cx="50"
          cy="50"
        />
        <circle
          className={isOverBudget ? "animate-pulse" : ""}
          stroke={fillColor}
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r="44"
          cx="50"
          cy="50"
          strokeDasharray="276.46"
          strokeDashoffset={276.46 * (1 - Math.min(percentage, 100) / 100)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full">
        <div className="relative h-16 overflow-hidden">
          <AnimatePresence initial={false} custom={showPercentage ? 1 : -1}>
            <motion.div
              key={showPercentage ? "percentage" : "amount"}
              custom={showPercentage ? 1 : -1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                y: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute w-full"
            >
              {showPercentage ? (
                <div className="text-4xl font-bold text-purple-100">
                  {percentage}%
                </div>
              ) : (
                <div className="text-4xl font-bold text-purple-100">
                  ${amount.toFixed(2)}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="text-xl text-purple-300">{daysLeft} days left</div>
      </div>
      {isOverBudget && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="absolute -top-4 -right-4 bg-red-500 rounded-full p-2 shadow-lg"
        >
          <AlertTriangle className="text-white" size={24} />
        </motion.div>
      )}
    </div>
  );
}
