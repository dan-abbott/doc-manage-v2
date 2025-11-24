/**
 * Utility functions for user greetings
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
 * Get a contextual greeting based on time of day
 * Returns variations like "Good morning", "Good afternoon", etc.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  
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
 */
export function getGreetingWithName(fullName: string | null | undefined): string {
  const firstName = getFirstName(fullName);
  if (!firstName) return getGreeting();
  
  return `${getGreeting()}, ${firstName}`;
}
