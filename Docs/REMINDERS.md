# Reminders Implementation in Sprout

## Overview
The reminders system in Sprout allows users to create care reminders for their plants. Reminders are stored in AsyncStorage and can be scheduled to trigger notifications at specified intervals.

## Storage
Reminders are stored in AsyncStorage under the key `'SPROUT_CARE_REMINDERS'`. They are saved as a JSON array of reminder objects.

## Reminder Schema

Each reminder object has the following structure:

```javascript
{
  // Core fields
  id: "reminder-[unique_id]",              // Unique identifier for the reminder
  created_at: "2025-07-11T15:12:20.413Z",  // ISO timestamp of when the reminder was created
  plant_id: "image-1752246525986-nepenthes-mirabilis", // ID of the associated plant
  
  // Reminder content
  title: "Watering Reminder: Common Swamp Pitcher-Plant", // Title displayed in notifications and UI
  description: "Your Common Swamp Pitcher-Plant needs water! Keep soil moist but not soggy.", // Detailed instructions
  
  // Reminder type and scheduling
  care_type: "watering",                   // Type of care (watering, fertilizing, pruning, etc.)
  frequency_days: 7,                       // How often the reminder should repeat (in days)
  next_due: "2025-07-15T09:00:00.000Z",    // When the next reminder is due (ISO timestamp)
  
  // Status
  enabled: true,                           // Whether the reminder is active
  last_completed: "2025-07-08T09:00:00.000Z", // When the reminder was last marked as completed (optional)
  
  // Optional fields
  plant_name: "Common Swamp Pitcher-Plant", // Name of the plant (for display purposes)
  notes: "Use distilled water if possible"  // Additional notes (optional)
}
```

## Key Components

### 1. ReminderContext.js
The central manager for all reminder-related functionality. It provides:
- Loading reminders from AsyncStorage
- Saving reminders to AsyncStorage
- Adding, updating, and deleting reminders
- Toggling reminder status
- Filtering reminders by plant
- Scheduling notifications

### 2. reminders.js (Care Reminders Screen)
Displays all reminders grouped by plant. Features:
- Grouping reminders by plant
- Displaying plant-specific reminders
- Enabling/disabling reminders
- Editing and deleting reminders
- Completing reminders

### 3. RemindersTab.js
Displays reminders for a specific plant in the plant profile. Features:
- Showing only reminders for the current plant
- Displaying reminder details

### 4. NotificationService.js
Handles scheduling and canceling notifications for reminders.

## Workflow

1. **Creating a Reminder**:
   - User adds a reminder with plant ID, care type, frequency, etc.
   - `addReminder` in ReminderContext creates a new reminder object
   - The reminder is added to the state and saved to AsyncStorage
   - A notification is scheduled using NotificationService

2. **Retrieving Reminders**:
   - On app startup, reminders are loaded from AsyncStorage
   - For plant-specific views, reminders are filtered by plant ID

3. **Updating Reminders**:
   - When a reminder is updated, the state is updated and saved to AsyncStorage
   - Any associated notification is rescheduled

4. **Completing Reminders**:
   - When marked as completed, the reminder's next_due date is updated
   - The notification is rescheduled for the new date

5. **Deleting Reminders**:
   - The reminder is removed from state and AsyncStorage
   - The associated notification is canceled

## Debugging

Debug logs are implemented throughout the reminder system to track:
- Loading reminders from AsyncStorage
- Saving reminders to AsyncStorage
- Adding, updating, and deleting reminders
- Scheduling and canceling notifications
- Grouping reminders by plant

## Common Issues

1. **Reminders not displaying**: 
   - Ensure the storage key is consistent across the app (`'SPROUT_CARE_REMINDERS'`)
   - Check that reminders have the required fields (id, plant_id, etc.)
   - Verify that reminders are being properly saved to AsyncStorage

2. **Notifications not triggering**:
   - Ensure notification permissions are granted
   - Check that reminders have valid next_due dates
   - Verify that notifications are being properly scheduled

3. **Plant grouping issues**:
   - Ensure reminders have valid plant_id fields
   - Check that the plant_id matches the ID format of saved plants

4. **Reminders being incorrectly deleted**:
   - Plant IDs must be consistently compared as strings throughout the app
   - Both `ReminderContext.js` and `app/reminders.js` have cleanup mechanisms that remove reminders for deleted plants
   - These mechanisms use `String(plantId)` to ensure consistent comparison

## Implementation Notes

### Plant ID Comparison

Plant IDs are stored as strings in the reminder objects, but they might be compared with plant IDs from other sources that could be of different types. To ensure consistent comparison:

```javascript
// Convert plant IDs to strings for consistent comparison
const savedPlantIds = new Set(savedPlants.map(plant => String(plant.id)));

// When checking if a plant exists
const plantIdStr = String(reminder.plant_id);
const exists = savedPlantIds.has(plantIdStr);
```

### Cleanup Mechanism

The app has a single cleanup mechanism in `ReminderContext.js` that handles removing reminders for deleted plants:

1. It converts all plant IDs to strings for consistent comparison using `String(plantId)`
2. It creates a set of saved plant IDs for efficient lookup
3. It filters reminders to find those whose plant_id doesn't exist in the saved plants
4. It removes these orphaned reminders and cancels their notifications

The cleanup in `app/reminders.js` has been disabled to prevent duplicate cleanup operations that were causing reminders to disappear unexpectedly.
