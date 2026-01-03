/**
 * Utility functions for user greetings with timezone support
 */

/**
 * Get the first name from a full name
 * Examples: "Dan Abbott" → "Dan", "John" → "John"
 */
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

/**
 * Get current hour in a specific timezone
 */
function getHourInTimezone(timezone: string): number {
  try {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit'
    });
    return parseInt(timeString, 10);
  } catch (error) {
    // Fallback to server time if timezone is invalid
    console.error('Invalid timezone:', timezone, error);
    return new Date().getHours();
  }
}

/**
 * Get a contextual greeting based on time of day
 * Returns variations like "Good morning", "Good afternoon", etc.
 * 
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 */
export function getGreeting(timezone?: string): string {
  const hour = timezone ? getHourInTimezone(timezone) : new Date().getHours();
  
  // Early morning (5 AM - 11:59 AM)
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  
  // Afternoon (12 PM - 4:59 PM)
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  
  // Evening (5 PM - 8:59 PM)
  if (hour >= 17 && hour < 21) {
    return 'Good evening';
  }
  
  // Night (9 PM - 4:59 AM)
  return 'Hi';
}

/**
 * Get a complete greeting with user's first name
 * Example: "Good morning, Dan" or "Hi, Dan"
 * 
 * @param fullName - User's full name
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 */
export function getGreetingWithName(
  fullName: string | null | undefined, 
  timezone?: string
): string {
  const firstName = getFirstName(fullName);
  if (!firstName) return getGreeting(timezone);
  
  return `${getGreeting(timezone)}, ${firstName}`;
}
