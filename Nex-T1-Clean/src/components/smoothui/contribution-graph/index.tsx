"use client";

import { motion, useReducedMotion } from "motion/react";
import type React from "react";
import { useMemo, useState } from "react";

export interface ContributionData {
  date: string;
  count: number;
  level: number;
}

export interface ContributionGraphProps {
  data?: ContributionData[];
  year?: number;
  className?: string;
  showLegend?: boolean;
  showTooltips?: boolean;
}

const WEEKS_IN_YEAR = 53;
const DAYS_IN_WEEK = 7;
const JANUARY_MONTH = 0;
const DECEMBER_MONTH = 11;
const SUNDAY_DAY = 0;
const MIN_WEEKS_FOR_DECEMBER_HEADER = 2;
const TOOLTIP_OFFSET_X = 10;
const TOOLTIP_OFFSET_Y = 40;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CONTRIBUTION_COLORS = [
  "bg-[var(--settings-border-soft)]",
  "bg-cyan-500/20",
  "bg-cyan-500/45",
  "bg-cyan-400/70",
  "bg-cyan-300",
];
const LEVEL_0 = 0;
const DAY_1 = 1;
const DAY_31 = 31;

const isDateInValidRange = (
  currentDate: Date,
  startDate: Date,
  endDate: Date,
  targetYear: number,
) => {
  const inRange = currentDate >= startDate && currentDate <= endDate;
  const isPrevDecember =
    currentDate.getFullYear() === targetYear - 1 &&
    currentDate.getMonth() === DECEMBER_MONTH;
  const isNextJanuary =
    currentDate.getFullYear() === targetYear + 1 &&
    currentDate.getMonth() === JANUARY_MONTH;
  return inRange || isPrevDecember || isNextJanuary;
};

const createDayData = (
  currentDate: Date,
  contributionData: Map<string, ContributionData>,
) => {
  const dateString = currentDate.toISOString().split("T")[0] ?? "";
  const existingData = contributionData.get(dateString);
  return {
    date: dateString,
    count: existingData?.count ?? LEVEL_0,
    level: existingData?.level ?? LEVEL_0,
  } satisfies ContributionData;
};

const shouldShowMonthHeader = ({
  currentYear,
  targetYear,
  currentMonth,
  startDateDay,
  weekCount,
}: {
  currentYear: number;
  targetYear: number;
  currentMonth: number;
  startDateDay: number;
  weekCount: number;
}) =>
  currentYear === targetYear ||
  (currentYear === targetYear - 1 &&
    currentMonth === DECEMBER_MONTH &&
    startDateDay !== SUNDAY_DAY &&
    weekCount >= MIN_WEEKS_FOR_DECEMBER_HEADER);

const calculateMonthHeaders = (targetYear: number) => {
  const headers: { month: string; colspan: number; startWeek: number }[] = [];
  const startDate = new Date(targetYear, JANUARY_MONTH, DAY_1);
  const firstSunday = new Date(startDate);
  firstSunday.setDate(startDate.getDate() - startDate.getDay());

  let currentMonth = -1;
  let currentYear = -1;
  let monthStartWeek = 0;
  let weekCount = 0;

  for (let weekNumber = 0; weekNumber < WEEKS_IN_YEAR; weekNumber += 1) {
    const weekDate = new Date(firstSunday);
    weekDate.setDate(firstSunday.getDate() + weekNumber * DAYS_IN_WEEK);

    const monthKey = weekDate.getMonth();
    const yearKey = weekDate.getFullYear();

    if (monthKey !== currentMonth || yearKey !== currentYear) {
      if (
        currentMonth !== -1 &&
        shouldShowMonthHeader({
          currentYear,
          targetYear,
          currentMonth,
          startDateDay: startDate.getDay(),
          weekCount,
        })
      ) {
        headers.push({
          month: MONTHS[currentMonth]!,
          colspan: weekCount,
          startWeek: monthStartWeek,
        });
      }

      currentMonth = monthKey;
      currentYear = yearKey;
      monthStartWeek = weekNumber;
      weekCount = 1;
      continue;
    }

    weekCount += 1;
  }

  if (
    currentMonth !== -1 &&
    shouldShowMonthHeader({
      currentYear,
      targetYear,
      currentMonth,
      startDateDay: startDate.getDay(),
      weekCount,
    })
  ) {
    headers.push({
      month: MONTHS[currentMonth]!,
      colspan: weekCount,
      startWeek: monthStartWeek,
    });
  }

  return headers;
};

export default function ContributionGraph({
  data = [],
  year = new Date().getFullYear(),
  className = "",
  showLegend = true,
  showTooltips = true,
}: ContributionGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();
  const dataByDate = useMemo(
    () => new Map(data.map((item) => [item.date, item])),
    [data],
  );

  const yearData = useMemo(() => {
    const startDate = new Date(year, JANUARY_MONTH, DAY_1);
    const endDate = new Date(year, DECEMBER_MONTH, DAY_31);
    const days: ContributionData[] = [];
    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());

    for (let weekNumber = 0; weekNumber < WEEKS_IN_YEAR; weekNumber += 1) {
      for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
        const currentDate = new Date(firstSunday);
        currentDate.setDate(
          firstSunday.getDate() + weekNumber * DAYS_IN_WEEK + day,
        );

        if (isDateInValidRange(currentDate, startDate, endDate, year)) {
          days.push(createDayData(currentDate, dataByDate));
          continue;
        }

        days.push({
          date: "",
          count: LEVEL_0,
          level: LEVEL_0,
        });
      }
    }

    return days;
  }, [dataByDate, year]);

  const monthHeaders = useMemo(() => calculateMonthHeaders(year), [year]);

  const handleDayHover = (day: ContributionData, event: React.MouseEvent) => {
    if (!showTooltips || !day.date) return;
    setHoveredDay(day);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleDayLeave = () => setHoveredDay(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getContributionText = (count: number) => {
    if (count === LEVEL_0) return "No activity";
    if (count === 1) return "1 activity point";
    return `${count} activity points`;
  };

  return (
    <div className={`contribution-graph ${className}`}>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <caption className="sr-only">Contribution Graph for {year}</caption>
          <thead>
            <tr className="h-3">
              <td className="w-7 min-w-7" />
              {monthHeaders.map((header) => (
                <td
                  className="relative text-left text-[var(--settings-foreground-subtle)]"
                  colSpan={header.colspan}
                  key={`${header.month}-${header.startWeek}`}
                >
                  <span className="absolute left-1 top-0">{header.month}</span>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => (
              <tr className="h-2.5" key={DAYS[dayIndex]}>
                <td className="relative w-7 min-w-7 text-[var(--settings-foreground-subtle)]">
                  {dayIndex % 2 === 0 ? (
                    <span className="absolute -bottom-0.5 left-0 text-xs">
                      {DAYS[dayIndex]}
                    </span>
                  ) : null}
                </td>
                {Array.from({ length: WEEKS_IN_YEAR }, (_, weekIndex) => {
                  const dayData = yearData[weekIndex * DAYS_IN_WEEK + dayIndex];
                  const cellKey = `${dayData?.date ?? "empty"}-${weekIndex}-${dayIndex}`;

                  if (!dayData?.date) {
                    return (
                      <td className="h-2.5 w-2.5 p-0" key={cellKey}>
                        <div className="h-2.5 w-2.5" />
                      </td>
                    );
                  }

                  return (
                    <td
                      className="h-2.5 w-2.5 cursor-pointer p-0"
                      key={cellKey}
                      onMouseEnter={(event) => handleDayHover(dayData, event)}
                      onMouseLeave={handleDayLeave}
                      title={
                        showTooltips
                          ? `${formatDate(dayData.date)}: ${getContributionText(dayData.count)}`
                          : undefined
                      }
                    >
                      <div
                        className={`h-2.5 w-2.5 rounded-sm ${
                          CONTRIBUTION_COLORS[dayData.level] ?? CONTRIBUTION_COLORS[0]
                        } ring-0 transition-shadow hover:ring-2 hover:ring-white/20`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showTooltips && hoveredDay ? (
        <motion.div
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          className="pointer-events-none fixed z-50 rounded-lg border border-white/10 bg-[#111214] px-3 py-2 text-sm text-white shadow-lg"
          exit={
            shouldReduceMotion
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, scale: 0.8 }
          }
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
          style={{
            left: tooltipPosition.x + TOOLTIP_OFFSET_X,
            top: tooltipPosition.y - TOOLTIP_OFFSET_Y,
          }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
        >
          <div className="font-semibold">{getContributionText(hoveredDay.count)}</div>
          <div className="text-white/70">{formatDate(hoveredDay.date)}</div>
        </motion.div>
      ) : null}

      {showLegend ? (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--settings-foreground-subtle)]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                className={`h-3 w-3 rounded-sm ${
                  CONTRIBUTION_COLORS[level] ?? CONTRIBUTION_COLORS[0]
                }`}
                key={level}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      ) : null}
    </div>
  );
}
