# Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a single-page web application built with vanilla JavaScript, HTML5, and CSS3. It provides a unified interface for time awareness, task management, focus timing, and quick website access. The application runs entirely client-side with no backend dependencies, using the browser's Local Storage API for data persistence.

### Design Goals

- **Simplicity**: Clean, minimal interface that reduces cognitive load
- **Performance**: Fast load times and responsive interactions
- **Reliability**: Robust data persistence with no data loss
- **Maintainability**: Clear separation of concerns and modular code structure
- **Accessibility**: Semantic HTML and keyboard navigation support

### Technology Stack

- **HTML5**: Semantic markup for structure
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript (ES6+)**: No frameworks or libraries
- **Local Storage API**: Client-side data persistence
- **Web APIs**: setInterval, Date, Notification (optional)

## Architecture

### High-Level Architecture

The application follows a component-based architecture with clear separation between presentation, business logic, and data persistence:

```
┌─────────────────────────────────────────────────────────┐
│                     index.html                          │
│                  (Entry Point)                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Greeting   │  │  Task List   │  │ Focus Timer  │  │
│  │  Component   │  │  Component   │  │  Component   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Quick Links  │  │    Theme     │                    │
│  │  Component   │  │  Component   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Storage Manager                         │
│         (Abstraction over Local Storage)                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Browser Local Storage API                   │
└─────────────────────────────────────────────────────────┘
```

### Component Architecture

Each component follows a consistent pattern:

1. **State Management**: Internal state object tracking component data
2. **Rendering**: Methods to update DOM based on state
3. **Event Handling**: User interaction handlers
4. **Persistence**: Integration with Storage Manager for data persistence

### Module Organization

```
todo-list-life-dashboard/
├── index.html              # Entry point
├── css/
│   └── styles.css          # All styles (light/dark themes)
└── js/
    └── app.js              # All JavaScript (components + storage)
```

## Components and Interfaces

### 1. Storage Manager

**Purpose**: Centralized interface for Local Storage operations with error handling and data validation.

**Interface**:
```javascript
class StorageManager {
  // Save data to Local Storage
  static save(key, value)
  
  // Load data from Local Storage
  static load(key, defaultValue = null)
  
  // Remove data from Local Storage
  static remove(key)
  
  // Clear all application data
  static clear()
}
```

**Storage Keys**:
- `dashboard_tasks`: Array of task objects
- `dashboard_userName`: String for personalized greeting
- `dashboard_theme`: String ('light' or 'dark')
- `dashboard_timerDuration`: Number (minutes)
- `dashboard_quickLinks`: Array of link objects
- `dashboard_sortOrder`: String ('creation', 'completion')

**Error Handling**:
- Catches quota exceeded errors
- Validates JSON parsing
- Returns default values on failure

### 2. Greeting Component

**Purpose**: Displays current time, date, and personalized greeting based on time of day.

**Interface**:
```javascript
class GreetingComponent {
  constructor(containerElement)
  
  // Initialize component and start clock
  init()
  
  // Update time display (called every second)
  updateTime()
  
  // Get greeting based on current hour
  getGreeting()
  
  // Set user name for personalized greeting
  setUserName(name)
  
  // Render the component
  render()
}
```

**State**:
```javascript
{
  userName: string | null,
  currentTime: Date,
  greeting: string
}
```

**Time Update Strategy**:
- Uses `setInterval` with 1000ms interval
- Calculates greeting on each update
- Only re-renders when greeting text changes (optimization)

### 3. Task List Component

**Purpose**: Manages task creation, display, editing, deletion, and completion tracking.

**Interface**:
```javascript
class TaskListComponent {
  constructor(containerElement)
  
  // Initialize component and load tasks
  init()
  
  // Add new task
  addTask(text)
  
  // Edit existing task
  editTask(taskId, newText)
  
  // Delete task
  deleteTask(taskId)
  
  // Toggle task completion
  toggleComplete(taskId)
  
  // Set sort order
  setSortOrder(order)
  
  // Check for duplicate task
  isDuplicate(text)
  
  // Render task list
  render()
  
  // Save tasks to storage
  saveTasks()
}
```

**State**:
```javascript
{
  tasks: [
    {
      id: string,           // Unique identifier (timestamp-based)
      text: string,         // Task description
      completed: boolean,   // Completion status
      createdAt: number     // Timestamp for sorting
    }
  ],
  sortOrder: string,        // 'creation' or 'completion'
  editingTaskId: string | null
}
```

**Task ID Generation**:
- Uses `Date.now() + Math.random()` for unique IDs
- Ensures no collisions even with rapid task creation

**Duplicate Detection**:
- Case-insensitive comparison
- Trims whitespace before comparison
- Only checks against active (non-deleted) tasks

### 4. Focus Timer Component

**Purpose**: Countdown timer for time-boxing and focus sessions.

**Interface**:
```javascript
class FocusTimerComponent {
  constructor(containerElement)
  
  // Initialize component
  init()
  
  // Start countdown
  start()
  
  // Stop/pause countdown
  stop()
  
  // Reset to configured duration
  reset()
  
  // Set timer duration (in minutes)
  setDuration(minutes)
  
  // Update display (called every second)
  tick()
  
  // Handle timer completion
  onComplete()
  
  // Render timer display
  render()
}
```

**State**:
```javascript
{
  duration: number,         // Total duration in seconds
  remaining: number,        // Remaining time in seconds
  isRunning: boolean,       // Timer active state
  intervalId: number | null // setInterval reference
}
```

**Timer Precision**:
- Uses `setInterval` with 1000ms interval
- Tracks actual elapsed time to prevent drift
- Clears interval on stop/complete

**Notification Strategy**:
- Attempts to use Notification API if available
- Falls back to visual indicator if permission denied
- Plays audio cue (optional enhancement)

### 5. Quick Links Component

**Purpose**: Manages user-defined website shortcuts.

**Interface**:
```javascript
class QuickLinksComponent {
  constructor(containerElement)
  
  // Initialize component
  init()
  
  // Add new link
  addLink(url, displayName = null)
  
  // Delete link
  deleteLink(linkId)
  
  // Validate URL format
  isValidUrl(url)
  
  // Render links
  render()
  
  // Save links to storage
  saveLinks()
}
```

**State**:
```javascript
{
  links: [
    {
      id: string,           // Unique identifier
      url: string,          // Full URL
      displayName: string   // User-provided or derived from URL
    }
  ]
}
```

**URL Validation**:
- Checks for valid URL format using URL constructor
- Ensures protocol is present (http/https)
- Rejects javascript: and data: URLs for security

**Display Name Generation**:
- If not provided, extracts hostname from URL
- Removes 'www.' prefix
- Capitalizes first letter

### 6. Theme Component

**Purpose**: Manages light/dark theme switching and persistence.

**Interface**:
```javascript
class ThemeComponent {
  constructor()
  
  // Initialize theme from storage
  init()
  
  // Toggle between light and dark
  toggle()
  
  // Set specific theme
  setTheme(theme)
  
  // Apply theme to document
  applyTheme()
}
```

**State**:
```javascript
{
  currentTheme: string  // 'light' or 'dark'
}
```

**Theme Application**:
- Adds/removes CSS class on document root
- Uses CSS custom properties for theme colors
- Transitions smoothly between themes

## Data Models

### Task Model

```javascript
{
  id: string,              // Unique identifier (e.g., "1699564823456-0.123")
  text: string,            // Task description (1-500 characters)
  completed: boolean,      // Completion status
  createdAt: number        // Unix timestamp in milliseconds
}
```

**Constraints**:
- `text`: Non-empty, trimmed, max 500 characters
- `id`: Must be unique within task list
- `createdAt`: Valid Unix timestamp

**Validation Rules**:
- Text cannot be only whitespace
- Text cannot be duplicate of existing task (case-insensitive)
- Completed defaults to false for new tasks

### Quick Link Model

```javascript
{
  id: string,              // Unique identifier
  url: string,             // Valid HTTP/HTTPS URL
  displayName: string      // Display text (1-50 characters)
}
```

**Constraints**:
- `url`: Must be valid HTTP or HTTPS URL
- `displayName`: Non-empty, max 50 characters
- `id`: Must be unique within links list

**Validation Rules**:
- URL must pass URL constructor validation
- URL protocol must be http: or https:
- Display name auto-generated if not provided

### User Preferences Model

```javascript
{
  userName: string | null,     // User's name for greeting (max 50 chars)
  theme: string,               // 'light' or 'dark'
  timerDuration: number,       // Minutes (1-120)
  sortOrder: string            // 'creation' or 'completion'
}
```

**Constraints**:
- `userName`: Optional, max 50 characters
- `theme`: Must be 'light' or 'dark'
- `timerDuration`: Integer between 1 and 120
- `sortOrder`: Must be 'creation' or 'completion'

**Default Values**:
- `userName`: null
- `theme`: 'dark'
- `timerDuration`: 25
- `sortOrder`: 'creation'

### Local Storage Schema

All data is stored as JSON strings in Local Storage:

```javascript
// Example stored data
localStorage['dashboard_tasks'] = '[{"id":"123","text":"Buy milk","completed":false,"createdAt":1699564823456}]'
localStorage['dashboard_userName'] = '"John"'
localStorage['dashboard_theme'] = '"dark"'
localStorage['dashboard_timerDuration'] = '25'
localStorage['dashboard_quickLinks'] = '[{"id":"456","url":"https://github.com","displayName":"GitHub"}]'
localStorage['dashboard_sortOrder'] = '"creation"'
```

**Storage Size Considerations**:
- Local Storage limit: ~5-10MB per origin
- Estimated usage with 100 tasks + 20 links: ~50KB
- Well within limits for target use case


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Multiple persistence properties (3.5, 5.4, 6.5, 7.3, 10.6) can be consolidated into comprehensive persistence properties
- Time formatting properties (1.1, 1.2) can be combined into a single formatting property
- Greeting time-of-day examples (1.5-1.8) are covered by the general greeting property (1.4)
- Task list operations that all update storage can share common persistence validation

### Property 1: Time Display Formatting

For any Date object, the formatted time output shall contain hours in 12-hour format (1-12), minutes (00-59), seconds (00-59), and AM/PM indicator, and the formatted date output shall contain day of week, month name, and day number.

**Validates: Requirements 1.1, 1.2**

### Property 2: Greeting Based on Hour

For any hour value (0-23), the greeting function shall return "Good morning" for hours 5-11, "Good afternoon" for hours 12-16, "Good evening" for hours 17-20, and "Good night" for hours 21-4.

**Validates: Requirements 1.4, 1.5, 1.6, 1.7, 1.8**

### Property 3: Personalized Greeting Includes Name

For any non-empty name string, when set as the user name, the greeting output shall contain that name.

**Validates: Requirements 2.1**

### Property 4: User Name Persistence Round-Trip

For any valid user name string, storing it to Local Storage then retrieving it shall return an equivalent value.

**Validates: Requirements 2.5**

### Property 5: Adding Valid Tasks Grows List

For any task list and any non-empty, non-whitespace task text, adding the task shall increase the task list length by one.

**Validates: Requirements 3.2**

### Property 6: Empty Tasks Rejected

For any string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to add it as a task shall be rejected and the task list shall remain unchanged.

**Validates: Requirements 3.3**

### Property 7: Duplicate Tasks Rejected

For any task list containing a task with text T (case-insensitive, trimmed), attempting to add another task with text equivalent to T shall be rejected.

**Validates: Requirements 3.4**

### Property 8: Task Addition Clears Input

For any UI state where the task input field is non-empty, submitting a valid task shall result in the input field being empty.

**Validates: Requirements 3.6**

### Property 9: All Tasks Rendered

For any task list, the rendered output shall contain all task texts and their completion statuses.

**Validates: Requirements 4.1**

### Property 10: Completed Tasks Visually Distinguished

For any task, the rendered output shall have different visual indicators (CSS classes or attributes) based on whether the task is completed or incomplete.

**Validates: Requirements 4.2**

### Property 11: Task List Loads from Storage

For any task list stored in Local Storage, initializing the Task List component shall load and display all stored tasks.

**Validates: Requirements 4.3**

### Property 12: Tasks Sorted by Order

For any task list and sort order setting ('creation' or 'completion'), the rendered task list shall be ordered according to the specified sort order.

**Validates: Requirements 4.5, 15.2, 15.3, 15.4**

### Property 13: Task Completion Toggle Round-Trip

For any task, toggling its completion status twice shall return it to its original completion state.

**Validates: Requirements 5.3, 5.5**

### Property 14: Task Editing Updates Text

For any task with text T1 and any valid new text T2, editing the task to T2 shall result in the task's text being T2.

**Validates: Requirements 6.3**

### Property 15: Empty Edit Rejected

For any task with non-empty text, attempting to edit it to empty or whitespace-only text shall be rejected and the original text shall be preserved.

**Validates: Requirements 6.4**

### Property 16: Task Deletion Removes Task

For any task list containing a task with ID, deleting that task shall result in a task list that does not contain that ID.

**Validates: Requirements 7.2**

### Property 17: Timer Reset Restores Duration

For any timer with configured duration D, after any sequence of start/stop operations, resetting the timer shall set the remaining time to D.

**Validates: Requirements 8.9**

### Property 18: Timer Duration Configuration

For any duration value between 1 and 120 minutes, setting the timer duration to that value shall result in the timer using that duration on the next reset.

**Validates: Requirements 9.1, 9.3, 9.4**

### Property 19: Invalid Timer Duration Rejected

For any duration value less than 1 or greater than 120 minutes, attempting to set the timer duration shall be rejected and the current duration shall be preserved.

**Validates: Requirements 9.5**

### Property 20: Timer Duration Persistence

For any valid timer duration, storing it to Local Storage then retrieving it shall return an equivalent value.

**Validates: Requirements 9.2**

### Property 21: Quick Link Requires URL

For any attempt to add a quick link without a valid HTTP/HTTPS URL, the operation shall be rejected.

**Validates: Requirements 10.2**

### Property 22: Quick Link Display Name Optional

For any valid URL, adding a quick link with that URL shall succeed both with and without a display name, and when no display name is provided, one shall be auto-generated from the URL.

**Validates: Requirements 10.3**

### Property 23: Quick Links Load from Storage

For any quick links list stored in Local Storage, initializing the Quick Links component shall load and display all stored links.

**Validates: Requirements 10.7**

### Property 24: Theme Application

For any theme value ('light' or 'dark'), setting the theme shall apply the corresponding CSS class to the document root.

**Validates: Requirements 11.3**

### Property 25: Theme Persistence Round-Trip

For any valid theme value ('light' or 'dark'), storing it to Local Storage then retrieving it shall return an equivalent value.

**Validates: Requirements 11.4, 11.5, 11.6**

### Property 26: Data Persistence Round-Trip

For any valid data structure (tasks array, links array, preferences object), serializing to JSON, storing in Local Storage, retrieving, and parsing shall produce an equivalent data structure.

**Validates: Requirements 12.1, 12.2, 12.3, 12.6**

### Property 27: Sort Order Persistence

For any valid sort order value ('creation' or 'completion'), storing it to Local Storage then retrieving it shall return an equivalent value.

**Validates: Requirements 15.5**

## Error Handling

### Local Storage Errors

**Quota Exceeded**:
- Catch `QuotaExceededError` exceptions
- Display user-friendly error message
- Suggest clearing old data or reducing task count
- Gracefully degrade to in-memory storage for session

**Parse Errors**:
- Catch JSON parse exceptions when loading data
- Log error to console for debugging
- Fall back to default/empty state
- Preserve corrupted data in separate key for recovery

**Access Denied**:
- Handle cases where Local Storage is disabled (private browsing)
- Display informational message to user
- Continue with in-memory storage
- Warn that data won't persist

### Input Validation Errors

**Task Text Validation**:
- Trim whitespace before validation
- Reject empty strings silently (no error message)
- Reject duplicates with user-friendly message
- Enforce max length (500 characters) with character counter

**Timer Duration Validation**:
- Validate range (1-120 minutes)
- Display error message for out-of-range values
- Preserve previous valid value on error
- Provide visual feedback (red border, error text)

**URL Validation**:
- Use try-catch with URL constructor
- Reject invalid URLs with clear error message
- Reject non-HTTP/HTTPS protocols for security
- Provide example of valid URL format

### Timer Edge Cases

**Timer at Zero**:
- Stop interval immediately when reaching zero
- Prevent negative time values
- Trigger completion notification
- Disable start button until reset

**Rapid Start/Stop**:
- Clear previous interval before starting new one
- Prevent multiple simultaneous intervals
- Ensure state consistency

**Page Visibility**:
- Continue timer when page is hidden (optional: pause)
- Sync time on page visibility change
- Handle clock drift for long-running timers

### Component Initialization Errors

**Missing DOM Elements**:
- Validate container elements exist before initialization
- Throw descriptive error if required elements missing
- Provide clear error messages for developers

**Initialization Order**:
- Ensure Storage Manager initializes first
- Load preferences before initializing components
- Handle circular dependencies gracefully

## Testing Strategy

### Dual Testing Approach

The application will use both unit testing and property-based testing for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

These approaches are complementary—unit tests catch concrete bugs and validate specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing

**Library Selection**: Use **fast-check** for JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Seed-based reproducibility for failed tests
- Shrinking enabled to find minimal failing cases

**Test Tagging**:
Each property test must include a comment referencing the design document property:
```javascript
// Feature: todo-list-life-dashboard, Property 5: Adding Valid Tasks Grows List
fc.assert(
  fc.property(fc.array(taskArb), fc.string(), (tasks, newTaskText) => {
    // Test implementation
  }),
  { numRuns: 100 }
);
```

**Generators (Arbitraries)**:
- `taskArb`: Generates valid task objects
- `taskTextArb`: Generates valid task text (non-empty, trimmed)
- `whitespaceArb`: Generates whitespace-only strings
- `dateArb`: Generates Date objects
- `hourArb`: Generates hour values (0-23)
- `urlArb`: Generates valid HTTP/HTTPS URLs
- `themeArb`: Generates theme values ('light', 'dark')
- `durationArb`: Generates timer durations (1-120)

### Unit Testing

**Framework**: Use **Jest** or **Vitest** for unit testing

**Test Organization**:
```
tests/
├── storage-manager.test.js
├── greeting-component.test.js
├── task-list-component.test.js
├── focus-timer-component.test.js
├── quick-links-component.test.js
└── theme-component.test.js
```

**Unit Test Focus**:
- Specific examples from requirements (e.g., "Good morning" for 9 AM)
- Edge cases (empty task list, timer at zero, quota exceeded)
- Error conditions (invalid URLs, out-of-range durations)
- Integration between components
- DOM manipulation and event handling

**Example Unit Tests**:
```javascript
describe('GreetingComponent', () => {
  test('displays "Good morning" at 9 AM', () => {
    const greeting = getGreeting(9);
    expect(greeting).toBe('Good morning');
  });
  
  test('displays empty state when no name configured', () => {
    const component = new GreetingComponent(container);
    component.init();
    expect(component.userName).toBeNull();
  });
});

describe('TaskListComponent', () => {
  test('displays empty state when no tasks exist', () => {
    const component = new TaskListComponent(container);
    component.init();
    expect(container.querySelector('.empty-state')).toBeTruthy();
  });
  
  test('rejects task with only whitespace', () => {
    const component = new TaskListComponent(container);
    const result = component.addTask('   ');
    expect(result).toBe(false);
    expect(component.tasks.length).toBe(0);
  });
});

describe('FocusTimerComponent', () => {
  test('defaults to 25 minutes', () => {
    const component = new FocusTimerComponent(container);
    component.init();
    expect(component.duration).toBe(25 * 60);
  });
  
  test('stops at zero', () => {
    const component = new FocusTimerComponent(container);
    component.remaining = 0;
    component.tick();
    expect(component.isRunning).toBe(false);
  });
});
```

### Integration Testing

**Scope**: Test interactions between components and Local Storage

**Key Integration Tests**:
- Task CRUD operations with persistence
- Theme switching with persistence
- Timer duration changes with persistence
- Quick links management with persistence
- Component initialization from stored data

### Manual Testing Checklist

**Browser Compatibility**:
- [ ] Chrome 90+ (Windows, macOS, Linux)
- [ ] Firefox 88+ (Windows, macOS, Linux)
- [ ] Edge 90+ (Windows)
- [ ] Safari 14+ (macOS, iOS)

**Performance**:
- [ ] Initial load under 500ms
- [ ] UI interactions respond within 50ms
- [ ] Task operations complete within 100ms
- [ ] Smooth animations at 60fps

**Accessibility**:
- [ ] Keyboard navigation works for all controls
- [ ] Focus indicators visible
- [ ] Semantic HTML structure
- [ ] ARIA labels where appropriate

**Responsive Design**:
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667, 414x896)

### Test Coverage Goals

- **Line Coverage**: Minimum 80%
- **Branch Coverage**: Minimum 75%
- **Function Coverage**: Minimum 85%
- **Property Coverage**: 100% (all 27 properties tested)

### Continuous Testing

**Pre-commit Hooks**:
- Run unit tests
- Run linter (ESLint)
- Check code formatting (Prettier)

**CI/CD Pipeline**:
- Run full test suite (unit + property tests)
- Generate coverage reports
- Run in multiple browser environments
- Performance benchmarking

