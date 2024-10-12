import { useState } from "react";
import { UTCDate } from "@date-fns/utc";
import { format } from "date-fns";

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
    <div className="flex justify-between items-center mb-4">
      <button
        onClick={() => handleMonthChange("prev")}
        className="bg-gray-200 p-2 rounded"
      >
        Previous Month
      </button>
      <span className="font-semibold">{formatMonthYear(currentDate)}</span>
      <button
        onClick={() => handleMonthChange("next")}
        className="bg-gray-200 p-2 rounded"
      >
        Next Month
      </button>
    </div>
  );
}
