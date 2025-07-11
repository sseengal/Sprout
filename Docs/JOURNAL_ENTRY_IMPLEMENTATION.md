# Journal Entry Implementation Guide

## Overview
The Journal Entry feature allows users to create and view plant care logs with text and images. This document covers the implementation details, component structure, and common issues.

## Components

### 1. JournalTab.js
Main container component that manages the journal entries list and the add entry modal.

#### Key Features:
- Manages journal entries state
- Handles image capture and selection
- Renders the list of entries
- Contains the entry creation form

### 2. JournalEntry.js
Reusable component that displays a single journal entry.

#### Props:
- `entry`: Object containing entry data
  - `id`: Unique identifier
  - `title`: Entry title
  - `description`: Entry description
  - `date`: ISO date string
  - `type`: Entry type (note/watering/fertilizing)
  - `images`: Array of image objects with `uri`, `width`, `height`

## Data Flow

### Creating a New Entry
1. User taps the FAB button
2. `isModalVisible` state is set to `true`
3. User fills in the form and adds images
4. On save, entry is added to the `journalEntries` array
5. Modal closes and list updates

### Image Handling
- Max 5 images per entry
- Images can be captured via camera or selected from gallery
- Each image is stored with its URI and dimensions
- Images are displayed in a horizontal scrollable list

## Styling

### Style Organization
- Each component has its own `StyleSheet`
- Common styles are defined at the top of each file
- No global styles to prevent conflicts

### Known Style Issues
1. **Style Override Conflicts**
   - Issue: Styles might be overridden by parent components
   - Solution: Use explicit style props and `!important` when necessary
   - Example: `style={[styles.text, { color: '#000' }]}`

2. **Image Dimensions**
   - Issue: Images may appear stretched or cropped
   - Solution: Store and use original dimensions
   ```javascript
   {
     uri: asset.uri,
     width: asset.width,
     height: asset.height
   }
   ```

3. **Modal Z-Index**
   - Issue: Modal content might appear behind other elements
   - Solution: Ensure proper z-index and elevation
   ```javascript
   modalOverlay: {
     ...StyleSheet.absoluteFillObject,
     backgroundColor: 'rgba(0,0,0,0.5)',
     zIndex: 1000,
   }
   ```

## Common Issues & Solutions

### 1. Image Upload Failures
- **Cause**: Missing permissions or invalid image format
- **Solution**:
  ```javascript
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission needed');
      return;
    }
  } catch (error) {
    console.error('Permission error:', error);
  }
  ```

### 2. State Update Warnings
- **Cause**: Updating state on an unmounted component
- **Solution**: Use cleanup functions
  ```javascript
  useEffect(() => {
    let isMounted = true;
    // ... async operations
    return () => { isMounted = false; };
  }, []);
  ```

### 3. Performance with Many Images
- **Issue**: Slow rendering with multiple high-res images
- **Solutions**:
  - Use `resizeMode="cover"`
  - Implement pagination for entries
  - Use `FlatList` with `windowSize` prop

## Best Practices

1. **Component Structure**
   - Keep components small and focused
   - Extract reusable UI elements
   - Use proper prop types

2. **State Management**
   - Lift state up when needed
   - Use local state for UI-specific state
   - Consider Context API for global state

3. **Error Handling**
   - Always wrap async operations in try/catch
   - Provide user feedback for errors
   - Log errors for debugging

## Future Improvements

1. **Offline Support**
   - Implement local storage for offline access
   - Sync when back online

2. **Image Optimization**
   - Compress images before upload
   - Lazy load images
   - Implement progressive loading

3. **Rich Text Editing**
   - Add text formatting options
   - Support for checklists
   - Tagging system

## Dependencies
- `expo-image-picker`: For camera and gallery access
- `@expo/vector-icons`: For UI icons
- `react-native` core components

## Testing

### Test Cases
1. Create a new entry with text and images
2. Edit an existing entry
3. Delete images from an entry
4. Test with maximum (5) images
5. Test camera and gallery permissions

### Test Environment
- iOS Simulator/Android Emulator
- Physical devices (for camera testing)
- Different screen sizes

## Troubleshooting

### Common Errors
1. **"Camera not available"**
   - Check simulator/device permissions
   - Verify camera hardware availability

2. **Image upload fails**
   - Check network connection
   - Verify image size and format
   - Check server logs for errors

3. **UI glitches**
   - Clear Metro bundler cache
   - Restart the development server
   - Check for style conflicts

## Related Files
- `/components/PlantProfile/JournalTab.js`
- `/components/PlantProfile/JournalEntry.js`
- `/styles/plantProfileStyles.js` (if using shared styles)

## Last Updated
July 12, 2025

---
*Documentation generated by AI Assistant*
