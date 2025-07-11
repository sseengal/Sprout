# Plant Data Standardization

## Overview

This document outlines the standardized approach to plant data storage in the Sprout app. We've implemented a consistent data model for storing plant information from both image-based (PlantNet) and text-based (Gemini) searches.

## Standardized Plant Data Model

The standardized plant data model is defined in `utils/plantDataModel.js` and includes:

### Core Fields
- `id`: Unique identifier for the plant
- `commonName`: Common name of the plant
- `scientificName`: Scientific name of the plant
- `family`: Plant family
- `genus`: Plant genus
- `imageUri`: URI of the plant image
- `searchType`: Type of search ('image' or 'text')
- `searchTerm`: Original search term for text searches
- `probability`: Confidence level from PlantNet (for image searches)
- `savedAt`: When the plant was saved

### Journal Entries
- `journalEntries`: Array of journal entries for the plant
  - `id`: Unique identifier for the entry
  - `type`: Type of entry (e.g., 'note', 'watering', 'fertilizing')
  - `description`: Text content of the entry
  - `images`: Array of image objects with `uri` properties
  - `date`: ISO timestamp when the entry was created

### Original Data
- `plantNetData`: Original PlantNet API response data
- `geminiData`: Original Gemini API response data

## Implementation

The standardization has been implemented in:

1. **Plant Data Model (`utils/plantDataModel.js`)**
   - Provides utility functions to create standardized plant data objects
   - Validates plant data structure

2. **Plant Storage Service (`services/plantStorage.js`)**
   - Enhanced to use the standardized data model
   - Provides CRUD operations for plant data
   - Handles duplicate detection consistently
   - Manages journal entries with methods:
     - `getJournalEntries(plantId)`: Retrieves all journal entries for a plant
     - `addJournalEntry(plantId, entry)`: Adds a new journal entry
     - `deleteJournalEntry(plantId, entryId)`: Removes a journal entry

3. **SavedPlantsContext (`contexts/SavedPlantsContext.js`)**
   - Updated to use the enhanced storage service
   - Maintains backward compatibility

4. **Analysis State (`hooks/useAnalysisState.js`)**
   - Modified to format plant data consistently before saving
   - Ensures both search types use the same data format

5. **JournalTab Component (`components/PlantProfile/JournalTab.js`)**
   - Manages the journal entry creation and display UI
   - Handles image capture and selection
   - Integrates with plant storage for persisting entries
   - Supports entry types: note, watering, and fertilizing

6. **JournalEntry Component (`components/PlantProfile/JournalEntry.js`)**
   - Renders individual journal entries
   - Displays entry type with appropriate icons
   - Shows images in a horizontal scrollable list
   - Handles date formatting and layout

7. **My Plants Page (`app/(tabs)/My plants.js`)**
   - Updated to support both old and new data formats
   - Displays plant information consistently

## Benefits

This standardization provides:

1. **Consistency**: Uniform data structure regardless of source
2. **Maintainability**: Centralized data handling logic
3. **Extensibility**: Easy to add new data fields or sources
4. **Reliability**: Better error handling and data validation

## Usage

When working with plant data:

1. **Creating Plant Data**: Use `createStandardPlantData()` to ensure consistency
2. **Saving Plants**: Use the `plantStorage.js` methods
3. **Accessing Plant Data**: Access fields directly from the plant object

## Backward Compatibility

The implementation maintains backward compatibility with existing saved plants by:
- Supporting both old and new data formats in UI components
- Using optional chaining to safely access properties
- Providing fallbacks for missing data
