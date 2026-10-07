import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { FiShoppingCart } from "react-icons/fi";
import { useMemo, useState } from "react";

type Range = "1D" | "1W" | "1M" | "1Y";

type SalesChartProps = {
  sales: {
    createdAt: string;
    total: string;
    status:
      | "PENDING"
      | "COMPLETED"
      | "CANCELLED"
      | "RETURNED";
  }[];
  selectedDate: Date;
  isLoading?: boolean;
};

function sumSalesForPeriod(
  sales: SalesChartProps["sales"],
  start: Date,
  end: Date,
) {
  return sales.reduce((sum, sale) => {
    if (
      sale.status === "CANCELLED" ||
      sale.status === "RETURNED"
    ) {
      return sum;
    }

    const createdAt = new Date(sale.createdAt);

    if (createdAt >= start && createdAt < end) {
      return sum + Number(sale.total);
    }

    return sum;
  }, 0);
}

export default function SalesChart({
  sales,
  selectedDate,
  isLoading = false,
}: SalesChartProps) {
  const ranges = ["1D", "1W", "1M", "1Y"] as const;
  const [activeRange, setActiveRange] = useState<Range>("1W");

  const chartData = useMemo(() => {
    const now = new Date(selectedDate);
    now.setHours(23, 59, 59, 999);

    const hourlyCategories: string[] = [];
    const hourlyData: number[] = [];

    for (let hour = 0; hour < 24; hour += 4) {
      const start = new Date(now);
      start.setHours(hour, 0, 0, 0);

      const end = new Date(start);
      end.setHours(start.getHours() + 4);

      hourlyCategories.push(
        start.toLocaleTimeString([], {
          hour: "numeric",
          hour12: true,
        }),
      );
      hourlyData.push(
        sumSalesForPeriod(sales, start, end),
      );
    }

    const dailyCategories: string[] = [];
    const dailyData: number[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - i);

      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      dailyCategories.push(
        start.toLocaleDateString("en-US", {
          weekday: "short",
        }),
      );
      dailyData.push(
        sumSalesForPeriod(sales, start, end),
      );
    }

    const weeklyCategories: string[] = [];
    const weeklyData: number[] = [];

    for (let i = 3; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(now.getDate() - i * 7 - 6);

      const end = new Date(start);
      end.setDate(start.getDate() + 7);

      weeklyCategories.push(`Week ${4 - i}`);
      weeklyData.push(
        sumSalesForPeriod(sales, start, end),
      );
    }

    const monthlyCategories: string[] = [];
    const monthlyData: number[] = [];

    for (let i = 11; i >= 0; i -= 1) {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1,
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        1,
      );

      monthlyCategories.push(
        start.toLocaleDateString("en-US", {
          month: "short",
        }),
      );
      monthlyData.push(
        sumSalesForPeriod(sales, start, end),
      );
    }

    return {
      "1D": {
        categories: hourlyCategories,
        data: hourlyData,
      },
      "1W": {
        categories: dailyCategories,
        data: dailyData,
      },
      "1M": {
        categories: weeklyCategories,
        data: weeklyData,
      },
      "1Y": {
        categories: monthlyCategories,
        data: monthlyData,
      },
    };
  }, [sales, selectedDate]);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      selection: {
        enabled: false,
      },
    },

    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "35%",
        borderRadiusApplication: "end",
      },
    },

    dataLabels: {
      enabled: false,
    },

    xaxis: {
      categories: chartData[activeRange].categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },

    yaxis: {
      labels: {
        formatter: (value) => {
          if (value >= 1000) {
            return `${value / 1000}k`;
          }

          return `${value}`;
        },
      },
    },

    grid: {
      borderColor: "#E5E7EB",
      strokeDashArray: 5,
    },

    colors: ["#FE9F43"],

    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
      active: {
        filter: {
          type: "none",
        },
      },
    },

    tooltip: {
      theme: "light",
      y: {
        formatter: (value) =>
          `ETB ${Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
    },
  };

  const series = [
    {
      name: "Sales",
      data: chartData[activeRange].data,
    },
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[#FE9F43]/15 px-3 py-2 text-[#FE9F43]">
            <FiShoppingCart size={24} />
          </div>
          <h5 className="text-xl font-semibold">
            Sales Overview
          </h5>
        </div>
        <ul className="flex w-fit overflow-hidden rounded-lg border border-[#E6EAED] bg-[#F9FAFB] text-sm divide-x divide-[#E6EAED]">
          {ranges.map((range) => (
            <li key={range}>
              <button
                onClick={() => setActiveRange(range)}
                className={`cursor-pointer px-3 py-1.5 transition-colors ${
                  activeRange === range
                    ? "bg-[#FE9F43] text-white"
                    : "hover:bg-[#FE9F43] hover:text-white"
                }`}
              >
                {range}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <hr className="mt-5 mb-3 -mx-6 border-t border-[#D1D5DB]" />
      {isLoading ? (
        <div className="flex h-[350px] items-center justify-center text-[#646B72]">
          Loading sales chart...
        </div>
      ) : (
        <Chart options={options} series={series} type="bar" height={350} />
      )}
    </div>
  );
}
