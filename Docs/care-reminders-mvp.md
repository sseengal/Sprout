# Smart Care Calendar MVP Specification

## MVP Overview

The Minimum Viable Product (MVP) for the Smart Care Calendar feature focuses on delivering the core functionality of plant care reminders with minimal complexity while providing immediate value to users.

## MVP Features

### 1. Basic Care Reminder Setup
- **Auto-Generated Schedules**: Create default care schedules based on plant species data from Gemini API
- **Limited Care Types**: Focus on the most essential care types:
  - Watering (highest priority)
  - Fertilizing (secondary priority)
- **Simple Frequency Options**: Weekly, Bi-weekly, Monthly

### 2. Streamlined User Interface
- **Plant Detail Integration**: Add a "Care Schedule" section to the existing plant detail screen
- **Simple Toggle Controls**: Enable/disable reminders with a single tap
- **Basic Frequency Adjustment**: Allow users to adjust the frequency with a simple dropdown

### 3. Core Notification System
- **Basic Notifications**: Send push notifications for upcoming care tasks
- **Essential Information**: Include plant name and care type in notification
- **Single Action**: Tap notification to open the app to the relevant plant

### 4. Minimal Data Requirements
- **Reminder Storage**: 
  - Plant ID reference
  - Care type (watering/fertilizing)
  - Frequency (in days)
  - Next due date
  - Enabled status (boolean)

## Technical Implementation Priorities

### 1. Data Structure
```
reminders {
  id: uuid
  user_id: reference to users table
  plant_id: reference to saved plants
  care_type: string (watering|fertilizing)
  frequency_days: number
  next_due: timestamp
  enabled: boolean
  created_at: timestamp
}
```

### 2. Core Components
- **ReminderContext**: Basic state management for reminders
- **CareScheduleCard**: Simple UI component for the plant detail screen
- **NotificationService**: Minimal service to schedule and handle notifications

### 3. User Flows
- **Initial Setup**: Automatic suggestion after plant is saved
- **View/Edit**: Access from plant detail screen
- **Receive Notification**: Get notified when care is due
- **Complete Task**: Mark task as complete in the app

## MVP Limitations (for Future Enhancement)
- No visual calendar view (will be added in next phase)
- Limited to two care types (more will be added later)
- No care history tracking (will be added in next phase)
- No direct actions from notifications (will be added in next phase)
- No streak tracking or gamification (will be added in future phases)

## Development Approach
1. ~~Create the data structure in Supabase~~ (Skipped for initial implementation)
2. Implement the ReminderContext for state management with local storage
3. Build the basic UI components
4. Set up the notification system
5. Test with a small set of plant types

> **Note:** Supabase integration is temporarily skipped in the initial implementation. Reminders will be stored locally using AsyncStorage until the Supabase integration is completed in a future update.

## Compatibility Notes
- Ensure all implementations are compatible with Expo Go
- Use Expo's notification system rather than native modules
- Follow existing app patterns for state management and UI components
- Maintain the same security practices for user data

## Success Metrics
- User adoption rate of reminders feature
- Notification interaction rate
- Retention impact (do users with reminders return more often?)
