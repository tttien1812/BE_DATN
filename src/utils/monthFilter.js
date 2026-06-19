export const buildMonthRange = (month) => {
  // month format: YYYY-MM

  const [year, mon] = month.split("-").map(Number);

  const start = new Date(year, mon - 1, 1, 0, 0, 0);

  const end = new Date(year, mon, 0, 23, 59, 59, 999);

  return { start, end };
};

export const formatMonth = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
};
