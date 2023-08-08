function getDatesByTimeFrame(todayDate) {
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  const oneWeekAgoEnd = new Date(yesterday);
  oneWeekAgoEnd.setDate(yesterday.getDate() - 1);
  oneWeekAgoEnd.setHours(23, 59, 59, 59);

  const lastMonthEnd = new Date(today);
  lastMonthEnd.setDate(0); // Set to the last day of the previous month
  lastMonthEnd.setHours(23, 59, 59, 59);

  // Convert dates to local time zone
  const toLocalDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return {
    today: {
      start: toLocalDate(today),
      end: toLocalDate(endOfDay),
    },
    yesterday: {
      start: toLocalDate(yesterday),
      end: toLocalDate(endOfYesterday),
    },
    oneWeekAgo: {
      start: toLocalDate(oneWeekAgo),
      end: toLocalDate(oneWeekAgoEnd),
    },
    lastMonth: {
      start: toLocalDate(lastMonth),
      end: toLocalDate(lastMonthEnd),
    },
  };
}


  module.exports = getDatesByTimeFrame