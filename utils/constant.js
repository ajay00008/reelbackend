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
  
    // Convert dates to local time zone
    const toLocalDate = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  
    return {
      today: {
        start: toLocalDate(today),
        end: toLocalDate(endOfDay),
      },
      yesterday: {
        start: toLocalDate(yesterday),
        end: toLocalDate(endOfDay),
      },
      oneWeekAgo: {
        start: toLocalDate(oneWeekAgo),
        end: toLocalDate(endOfDay),
      },
      lastMonth: {
        start: toLocalDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1)),
        end: toLocalDate(endOfDay),
      },
    };
  }


  module.exports = getDatesByTimeFrame