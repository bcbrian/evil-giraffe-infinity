import { useState } from "react";
import { UTCDate } from "@date-fns/utc";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  currentMonth: string;
  onMonthChange: (newMonth: string) => void;
}

export default function MonthSelector({
  currentMonth,
  onMonthChange,
}: MonthSelectorProps) {
  const [currentDate, setCurrentDate] = useState(new UTCDate(currentMonth));

  const handleMonthChange = (direction: "prev" | "next") => {
    let newDate;

    if (direction === "prev") {
      newDate = new UTCDate(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - 1,
        1
      );
    } else {
      newDate = new UTCDate(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() + 1,
        1
      );
    }

    setCurrentDate(newDate);
    onMonthChange(newDate.toISOString());
  };

  const formatMonthYear = (date: UTCDate) => {
    return format(date, "MMMM yyyy");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-center mb-6 bg-black bg-opacity-50 p-4 rounded-lg shadow-lg"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleMonthChange("prev")}
        className="bg-purple-600 text-purple-100 p-2 rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out flex items-center"
      >
        <ChevronLeft size={24} />
        <span className="sr-only">Previous Month</span>
      </motion.button>
      <motion.span
        key={currentDate.toISOString()}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="font-bold text-xl text-purple-300"
      >
        {formatMonthYear(currentDate)}
      </motion.span>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleMonthChange("next")}
        className="bg-purple-600 text-purple-100 p-2 rounded-full shadow-md hover:bg-purple-700 transition duration-300 ease-in-out flex items-center"
      >
        <ChevronRight size={24} />
        <span className="sr-only">Next Month</span>
      </motion.button>
    </motion.div>
  );
}
