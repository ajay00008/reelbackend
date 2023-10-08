// Get the current date and time
const now = new Date();

// Calculate the date and time 24 hours ago
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

// twentyFourHoursAgo now holds the date and time 24 hours ago from now
console.log(twentyFourHoursAgo);
