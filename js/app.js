// To-Do List Life Dashboard

/**
 * Utility function to debounce rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * StorageManager - Centralized interface for Local Storage operations
 * Provides error handling for quota exceeded and JSON parse errors
 * Gracefully degrades to in-memory storage when Local Storage is unavailable
 * Validates: Requirements 12.1, 12.2, 12.3
 */
class StorageManager {
  // In-memory storage fallback
  static memoryStorage = {};
  static isLocalStorageAvailable = true;
  static hasShownStorageWarning = false;

  /**
   * Check if Local Storage is available
   * @returns {boolean} - True if Local Storage is available, false otherwise
   */
  static checkLocalStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize storage manager and check availability
   */
  static init() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability();

    if (!this.isLocalStorageAvailable && !this.hasShownStorageWarning) {
      this.showStorageWarning();
      this.hasShownStorageWarning = true;
    }
  }

  /**
   * Show user-friendly warning when Local Storage is unavailable
   */
  static showStorageWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'storage-warning';
    warningDiv.innerHTML = `
      <div class="storage-warning-content">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">Local Storage is disabled. Your data will not persist between sessions.</span>
        <button class="warning-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Insert at the top of the body
    document.body.insertBefore(warningDiv, document.body.firstChild);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (warningDiv.parentElement) {
        warningDiv.remove();
      }
    }, 10000);
  }

  /**
   * Show user-friendly error message for quota exceeded
   */
  static showQuotaExceededError() {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'storage-error';
    errorDiv.innerHTML = `
      <div class="storage-error-content">
        <span class="error-icon">❌</span>
        <span class="error-text">Storage quota exceeded. Please delete some tasks or links to free up space.</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Insert at the top of the body
    document.body.insertBefore(errorDiv, document.body.firstChild);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 10000);
  }

  /**
   * Save data to Local Storage or in-memory storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON serialized)
   * @returns {boolean} - True if successful, false otherwise
   */
  static save(key, value) {
    try {
      const serialized = JSON.stringify(value);

      if (this.isLocalStorageAvailable) {
        try {
          localStorage.setItem(key, serialized);
          return true;
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.error('Storage quota exceeded. Unable to save data.', error);
            this.showQuotaExceededError();

            // Fall back to in-memory storage
            this.isLocalStorageAvailable = false;
            this.memoryStorage[key] = serialized;

            if (!this.hasShownStorageWarning) {
              this.showStorageWarning();
              this.hasShownStorageWarning = true;
            }

            return true; // Return true since we saved to memory
          } else {
            console.error('Error saving to Local Storage:', error);

            // Fall back to in-memory storage
            this.memoryStorage[key] = serialized;
            return true;
          }
        }
      } else {
        // Use in-memory storage
        this.memoryStorage[key] = serialized;
        return true;
      }
    } catch (error) {
      console.error('Error serializing data:', error);
      return false;
    }
  }

  /**
   * Load data from Local Storage or in-memory storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value to return on failure (default: null)
   * @returns {*} - Parsed value or default value
   */
  static load(key, defaultValue = null) {
    try {
      let serialized = null;

      if (this.isLocalStorageAvailable) {
        try {
          serialized = localStorage.getItem(key);
        } catch (error) {
          console.error('Error accessing Local Storage:', error);
          this.isLocalStorageAvailable = false;

          if (!this.hasShownStorageWarning) {
            this.showStorageWarning();
            this.hasShownStorageWarning = true;
          }
        }
      }

      // Fall back to in-memory storage if Local Storage failed
      if (!this.isLocalStorageAvailable) {
        serialized = this.memoryStorage[key] || null;
      }

      // If key doesn't exist, return default value
      if (serialized === null) {
        return defaultValue;
      }

      // Parse and return the stored value
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Error loading from storage:', error);

      // If JSON parse fails, preserve corrupted data for potential recovery
      if (error instanceof SyntaxError && this.isLocalStorageAvailable) {
        try {
          const corrupted = localStorage.getItem(key);
          if (corrupted !== null) {
            const recoveryKey = `${key}_corrupted_${Date.now()}`;
            try {
              localStorage.setItem(recoveryKey, corrupted);
              console.warn(`Corrupted data preserved at key: ${recoveryKey}`);
            } catch (e) {
              console.error('Unable to preserve corrupted data:', e);
            }
          }
        } catch (e) {
          console.error('Error accessing corrupted data:', e);
        }
      }

      // Return default value on any error
      return defaultValue;
    }
  }

  /**
   * Remove data from Local Storage or in-memory storage
   * @param {string} key - Storage key to remove
   * @returns {boolean} - True if successful, false otherwise
   */
  static remove(key) {
    try {
      if (this.isLocalStorageAvailable) {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from Local Storage:', error);
        }
      }

      // Also remove from in-memory storage
      delete this.memoryStorage[key];

      return true;
    } catch (error) {
      console.error('Error removing from storage:', error);
      return false;
    }
  }

  /**
   * Clear all application data from Local Storage and in-memory storage
   * Only removes keys with 'dashboard_' prefix to avoid affecting other apps
   * @returns {boolean} - True if successful, false otherwise
   */
  static clear() {
    try {
      if (this.isLocalStorageAvailable) {
        try {
          const keysToRemove = [];

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('dashboard_')) {
              keysToRemove.push(key);
            }
          }

          keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
          console.error('Error clearing Local Storage:', error);
        }
      }

      const keysToRemove = Object.keys(this.memoryStorage).filter(key =>
        key.startsWith('dashboard_')
      );
      keysToRemove.forEach(key => delete this.memoryStorage[key]);

      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  }
}

/**
 * GreetingComponent - Displays current time, date, and time-based greeting
 * Updates every second and changes greeting based on time of day
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
class GreetingComponent {
  /**
   * @param {HTMLElement} containerElement - DOM element to render the component
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.userName = null;
    this.currentTime = new Date();
    this.greeting = '';
    this.intervalId = null;
  }

  /**
   * Initialize component and start clock
   */
  init() {
    // Load user name from Local Storage
    this.userName = StorageManager.load('dashboard_userName', null);
    
    // Initial render
    this.updateTime();
    
    // Update time every second
    this.intervalId = setInterval(() => {
      this.updateTime();
    }, 1000);
    
    // Prompt for name on first visit (after a short delay for better UX)
    if (this.userName === null) {
      setTimeout(() => {
        this.promptForName();
      }, 1000);
    }
  }
  
  /**
   * Prompt user to enter their name
   */
  promptForName() {
    const name = prompt('What\'s your name?', this.userName || '');
    if (name !== null && name.trim()) {
      this.setUserName(name.trim());
    } else if (name !== null && !name.trim() && this.userName) {
      // User cleared the name
      this.setUserName(null);
    }
  }

  /**
   * Update time display (called every second)
   * Formats time in 12-hour format with AM/PM
   * Formats date with day of week, month, and day
   * Optimized: Only re-renders when values actually change
   */
  updateTime() {
    const previousTime = this.formatTime();
    const previousDate = this.formatDate();
    const previousGreeting = this.greeting;
    
    this.currentTime = new Date();
    this.greeting = this.getGreeting();
    
    // Only re-render if something changed (optimization for performance)
    const newTime = this.formatTime();
    const newDate = this.formatDate();
    
    if (newTime !== previousTime || newDate !== previousDate || this.greeting !== previousGreeting) {
      this.render();
    }
  }

  /**
   * Get greeting based on current hour
   * 5-11: morning, 12-16: afternoon, 17-20: evening, 21-4: night
   * @returns {string} - Greeting message
   */
  getGreeting() {
    const hour = this.currentTime.getHours();
    
    if (hour >= 5 && hour <= 11) {
      return 'Good Morning';
    } else if (hour >= 12 && hour <= 16) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour <= 20) {
      return 'Good Evening';
    } else {
      // 21-23 or 0-4
      return 'Good Night';
    }
  }

  /**
   * Format time in 12-hour format with AM/PM
   * @returns {string} - Formatted time (e.g., "3:45:12 PM")
   */
  formatTime() {
    let hours = this.currentTime.getHours();
    const minutes = this.currentTime.getMinutes();
    const seconds = this.currentTime.getSeconds();
    
    // Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    // Pad minutes and seconds with leading zeros
    const minutesStr = minutes.toString().padStart(2, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    
    return `${hours}:${minutesStr}:${secondsStr} ${ampm}`;
  }

  /**
   * Format date with day of week, month, and day
   * @returns {string} - Formatted date (e.g., "Monday, January 15")
   */
  formatDate() {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayOfWeek = daysOfWeek[this.currentTime.getDay()];
    const month = months[this.currentTime.getMonth()];
    const day = this.currentTime.getDate();
    
    return `${dayOfWeek}, ${month} ${day}`;
  }

  /**
   * Set user name for personalized greeting
   * @param {string|null} name - User's name
   */
  setUserName(name) {
    this.userName = name;
    StorageManager.save('dashboard_userName', name);
    this.render();
  }

  /**
   * Render the component
   */
  render() {
    const timeStr = this.formatTime();
    const dateStr = this.formatDate();
    const greetingText = this.userName ? `${this.greeting}, ${this.userName}` : this.greeting;
    
    this.container.innerHTML = `
      <div class="greeting-display">
        <div class="time">${timeStr}</div>
        <div class="date">${dateStr}</div>
        <div class="greeting" id="greeting-text" style="cursor: pointer;" title="Click to set your name">${greetingText}</div>
      </div>
    `;
    
    // Add click listener to greeting for setting name
    const greetingElement = this.container.querySelector('#greeting-text');
    if (greetingElement) {
      greetingElement.addEventListener('click', () => {
        this.promptForName();
      });
    }
  }

  /**
   * Clean up interval when component is destroyed
   */
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * TaskListComponent - Manages task creation, display, editing, deletion, and completion tracking
 * Validates: Requirements 3.1, 4.3, 12.1
 */
class TaskListComponent {
  /**
   * @param {HTMLElement} containerElement - DOM element to render the component
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.tasks = [];
    this.sortOrder = 'creation';
    this.editingTaskId = null;
    this.eventListenersAttached = false;
    this.taskListClickHandler = null;
    this.taskListChangeHandler = null;
    this.taskListKeypressHandler = null;
    this.taskListKeydownHandler = null;
  }

  /**
   * Initialize component and load tasks from Local Storage
   */
  init() {
    // Load tasks from Local Storage
    this.tasks = StorageManager.load('dashboard_tasks', []);
    
    // Load sort order from Local Storage
    this.sortOrder = StorageManager.load('dashboard_sortOrder', 'creation');
    
    // Initial render
    this.render();
  }

  /**
   * Generate unique task ID using timestamp and random number
   * @returns {string} - Unique task ID
   */
  generateTaskId() {
    return `${Date.now()}-${Math.random()}`;
  }

  /**
   * Save tasks to Local Storage
   * @returns {boolean} - True if successful, false otherwise
   */
  saveTasks() {
    return StorageManager.save('dashboard_tasks', this.tasks);
  }

  /**
   * Check if a task with the given text already exists (case-insensitive, trimmed)
   * Validates: Requirement 3.4
   * @param {string} text - Task text to check
   * @returns {boolean} - True if duplicate exists, false otherwise
   */
  isDuplicate(text) {
    const trimmedText = text.trim().toLowerCase();
    return this.tasks.some(task => task.text.trim().toLowerCase() === trimmedText);
  }

  /**
   * Add new task with validation
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   * @param {string} text - Task text to add
   * @returns {object} - {success: boolean, error: string|null}
   */
  addTask(text) {
    // Trim whitespace before validation
    const trimmedText = text.trim();
    
    // Validate non-empty, non-whitespace text (Requirement 3.3)
    if (trimmedText.length === 0) {
      return { success: false, error: 'Task cannot be empty' };
    }
    
    // Enforce max length (500 characters)
    if (trimmedText.length > 500) {
      return { success: false, error: 'Task is too long (max 500 characters)' };
    }
    
    // Reject duplicates when duplicate prevention enabled (Requirement 3.4)
    // Note: Duplicate prevention is always enabled per the requirements
    if (this.isDuplicate(trimmedText)) {
      return { success: false, error: 'This task already exists' };
    }
    
    // Create new task
    const newTask = {
      id: this.generateTaskId(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now()
    };
    
    // Add task to list (Requirement 3.2)
    this.tasks.push(newTask);
    
    // Save to Local Storage (Requirement 3.5)
    this.saveTasks();
    
    // Re-render the task list
    this.render();
    
    return { success: true, error: null };
  }

  /**
   * Activate edit mode for a task
   * Validates: Requirement 6.1
   * @param {string} taskId - ID of task to edit
   */
  activateEditMode(taskId) {
    this.editingTaskId = taskId;
    this.render();
  }

  /**
   * Cancel edit mode without saving changes
   * Validates: Requirement 6.4 (preserve original text)
   */
  cancelEditMode() {
    this.editingTaskId = null;
    this.render();
  }

  /**
   * Edit existing task with validation
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
   * @param {string} taskId - ID of task to edit
   * @param {string} newText - New text for the task
   * @returns {boolean} - True if task edited successfully, false if rejected
   */
  editTask(taskId, newText) {
    // Find the task by ID
    const task = this.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return false;
    }
    
    // Trim whitespace before validation
    const trimmedText = newText.trim();
    
    // Validate non-empty text (Requirement 6.4)
    // Reject empty/whitespace-only edits and preserve original text
    if (trimmedText.length === 0) {
      return false;
    }
    
    // Enforce max length (500 characters)
    if (trimmedText.length > 500) {
      return false;
    }
    
    // Update task text (Requirement 6.3)
    task.text = trimmedText;
    
    // Save to Local Storage (Requirement 6.5)
    this.saveTasks();
    
    // Exit edit mode
    this.editingTaskId = null;
    
    // Re-render the task list
    this.render();
    
    return true;
  }

  /**
   * Delete task by ID
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   * @param {string} taskId - ID of task to delete
   * @returns {boolean} - True if task deleted successfully, false otherwise
   */
  deleteTask(taskId) {
    // Find the task index
    const taskIndex = this.tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      return false;
    }

    // Remove task from state by ID (Requirement 7.2)
    this.tasks.splice(taskIndex, 1);

    // Save to Local Storage after delete (Requirement 7.3)
    this.saveTasks();

    // Update display within 100ms (Requirement 7.4)
    // Re-render the task list immediately
    this.render();

    return true;
  }

  /**
   * Toggle task completion status
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   * @param {string} taskId - ID of task to toggle
   * @returns {boolean} - True if task toggled successfully, false otherwise
   */
  toggleComplete(taskId) {
    // Find the task by ID
    const task = this.tasks.find(t => t.id === taskId);

    if (!task) {
      return false;
    }

    // Toggle completed boolean on task (Requirement 5.1, 5.2)
    task.completed = !task.completed;

    // Save to Local Storage after toggle (Requirement 5.4)
    this.saveTasks();

    // Update visual appearance (CSS class) (Requirement 5.2)
    // Re-render the task list to update visual appearance
    this.render();

    return true;
  }
  /**
   * Set sort order for tasks
   * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
   * @param {string} order - Sort order ('creation' or 'completion')
   * @returns {boolean} - True if sort order set successfully, false otherwise
   */
  setSortOrder(order) {
    // Validate sort order value
    if (order !== 'creation' && order !== 'completion') {
      return false;
    }

    // Set sort order
    this.sortOrder = order;

    // Save sort order to Local Storage (Requirement 15.5)
    StorageManager.save('dashboard_sortOrder', order);

    // Reorder tasks immediately (Requirement 15.4)
    this.render();

    return true;
  }



  /**
   * Render task list (placeholder for now)
   */
  /**
     * Render task list with all tasks, empty state, and event listeners
     * Validates: Requirements 4.1, 4.2, 4.4
     * Optimized: Uses DocumentFragment for batch DOM updates
     */
    render() {
      const startTime = performance.now();
      const taskListElement = this.container.querySelector('#task-list');

      if (!taskListElement) {
        console.error('Task list element not found');
        return;
      }

      // Display empty state when no tasks exist (Requirement 4.4)
      if (this.tasks.length === 0) {
        taskListElement.innerHTML = `
          <li class="empty-state">
            <p>No tasks yet. Add one to get started!</p>
          </li>
        `;
        return;
      }

      // Sort tasks based on sort order
      const sortedTasks = this.getSortedTasks();

      // Use DocumentFragment for better performance (batch DOM updates)
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');

      // Display all tasks with text and completion status (Requirement 4.1)
      tempDiv.innerHTML = sortedTasks.map(task => {
        // Visually distinguish completed vs incomplete tasks (Requirement 4.2)
        const completedClass = task.completed ? 'completed' : 'incomplete';
        const checkedAttr = task.completed ? 'checked' : '';

        // If this task is being edited, show edit input
        if (this.editingTaskId === task.id) {
          return `
            <li class="task-item ${completedClass}" data-task-id="${task.id}">
              <input type="text" class="task-edit-input" value="${this.escapeHtml(task.text)}" data-task-id="${task.id}">
              <div class="task-edit-controls">
                <button class="task-save-btn" data-task-id="${task.id}" aria-label="Save task">Save</button>
                <button class="task-cancel-btn" data-task-id="${task.id}" aria-label="Cancel edit">Cancel</button>
              </div>
            </li>
          `;
        }

        // Normal task display
        return `
          <li class="task-item ${completedClass}" data-task-id="${task.id}">
            <input type="checkbox" class="task-checkbox" ${checkedAttr} data-task-id="${task.id}" aria-label="Toggle task completion">
            <span class="task-text">${this.escapeHtml(task.text)}</span>
            <div class="task-controls">
              <button class="task-edit-btn" data-task-id="${task.id}" aria-label="Edit task">Edit</button>
              <button class="task-delete-btn" data-task-id="${task.id}" aria-label="Delete task">Delete</button>
            </div>
          </li>
        `;
      }).join('');

      // Move all children to fragment
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }

      // Clear and update in one operation
      taskListElement.innerHTML = '';
      taskListElement.appendChild(fragment);

      // Attach event listeners for edit, delete, toggle controls (Requirement 4.4)
      // Event listeners are attached once to the container for better performance
      if (!this.eventListenersAttached) {
        this.attachEventListeners();
        this.eventListenersAttached = true;
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Ensure render completes within 100ms (Requirement 14.3)
      if (renderTime > 100) {
        console.warn(`Task list render took ${renderTime.toFixed(2)}ms (target: <100ms)`);
      }
    }

    /**
     * Get sorted tasks based on current sort order
     * @returns {Array} - Sorted array of tasks
     */
    getSortedTasks() {
      const tasksCopy = [...this.tasks];

      if (this.sortOrder === 'completion') {
        // Sort by completion status (incomplete first, then completed)
        return tasksCopy.sort((a, b) => {
          if (a.completed === b.completed) {
            return 0;
          }
          return a.completed ? 1 : -1;
        });
      }

      // Default: sort by creation order (createdAt timestamp)
      return tasksCopy.sort((a, b) => a.createdAt - b.createdAt);
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Attach event listeners to task controls using event delegation
     * Optimized: Uses event delegation for better performance
     */
    attachEventListeners() {
      const taskListElement = this.container.querySelector('#task-list');

      if (!taskListElement) {
        return;
      }

      // Remove existing listener if any
      if (this.taskListClickHandler) {
        taskListElement.removeEventListener('click', this.taskListClickHandler);
        taskListElement.removeEventListener('change', this.taskListChangeHandler);
        taskListElement.removeEventListener('keypress', this.taskListKeypressHandler);
        taskListElement.removeEventListener('keydown', this.taskListKeydownHandler);
      }

      // Use event delegation for all click events
      this.taskListClickHandler = (e) => {
        const target = e.target;
        const taskId = target.dataset.taskId;

        if (!taskId) return;

        // Handle different button types
        if (target.classList.contains('task-edit-btn')) {
          this.activateEditMode(taskId);
        } else if (target.classList.contains('task-delete-btn')) {
          this.deleteTask(taskId);
        } else if (target.classList.contains('task-save-btn')) {
          const input = taskListElement.querySelector(`.task-edit-input[data-task-id="${taskId}"]`);
          if (input) {
            this.editTask(taskId, input.value);
          }
        } else if (target.classList.contains('task-cancel-btn')) {
          this.cancelEditMode();
        }
      };

      // Use event delegation for checkbox changes
      this.taskListChangeHandler = (e) => {
        const target = e.target;
        if (target.classList.contains('task-checkbox')) {
          const taskId = target.dataset.taskId;
          if (taskId) {
            this.toggleComplete(taskId);
          }
        }
      };

      // Use event delegation for keypress events (Enter key)
      this.taskListKeypressHandler = (e) => {
        const target = e.target;
        if (target.classList.contains('task-edit-input') && e.key === 'Enter') {
          const taskId = target.dataset.taskId;
          if (taskId) {
            this.editTask(taskId, target.value);
          }
        }
      };

      // Use event delegation for keydown events (Escape key)
      this.taskListKeydownHandler = (e) => {
        const target = e.target;
        if (target.classList.contains('task-edit-input') && e.key === 'Escape') {
          this.cancelEditMode();
        }
      };

      // Attach delegated event listeners
      taskListElement.addEventListener('click', this.taskListClickHandler);
      taskListElement.addEventListener('change', this.taskListChangeHandler);
      taskListElement.addEventListener('keypress', this.taskListKeypressHandler);
      taskListElement.addEventListener('keydown', this.taskListKeydownHandler);
    }
}

/**
 * FocusTimerComponent - Countdown timer for time-boxing and focus sessions
 * Validates: Requirements 8.1, 9.1, 9.2
 */
class FocusTimerComponent {
  /**
   * @param {HTMLElement} containerElement - DOM element to render the component
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.duration = 25 * 60; // Default to 25 minutes (1500 seconds)
    this.remaining = this.duration;
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Initialize component and load timer duration from Local Storage
   * Validates: Requirements 8.1, 9.1, 9.2
   */
  init() {
    // Load timer duration from Local Storage (Requirement 9.2)
    const savedDuration = StorageManager.load('dashboard_timerDuration', 25);
    
    // Set duration in seconds (Requirement 9.1)
    this.duration = savedDuration * 60;
    this.remaining = this.duration;
    
    // Initial render
    this.render();
  }

  /**
   * Format time in MM:SS display format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time (e.g., "25:00")
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    // Pad seconds with leading zero
    const secondsStr = secs.toString().padStart(2, '0');
    
    return `${minutes}:${secondsStr}`;
  }

  /**
   * Render timer display
   */
  /**
     * Render timer display
     */
    render() {
      const timerDisplay = this.container.querySelector('.timer-display');

      if (timerDisplay) {
        timerDisplay.textContent = this.formatTime(this.remaining);
      }

      // Update button states
      this.updateButtonStates();
    }
  /**
   * Start countdown timer
   * Validates: Requirements 8.2, 8.5, 8.8, 8.10
   */
  start() {
    // Don't start if already running
    if (this.isRunning) {
      return;
    }

    // Don't start if timer is at zero
    if (this.remaining <= 0) {
      return;
    }

    // Set running state
    this.isRunning = true;

    // Clear any existing interval to prevent multiple simultaneous intervals
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Begin countdown with setInterval (1000ms) (Requirement 8.2, 8.5)
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    // Update button states
    this.updateButtonStates();
  }

  /**
   * Stop/pause countdown timer
   * Validates: Requirements 8.3, 8.8
   */
  stop() {
    // Pause countdown (Requirement 8.8)
    this.isRunning = false;

    // Clear interval (Requirement 8.3)
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Update button states
    this.updateButtonStates();
  }

  /**
   * Reset timer to configured duration
   * Validates: Requirements 8.4, 8.9
   */
  reset() {
    // Stop the timer if running
    this.isRunning = false;

    // Clear interval (Requirement 8.4)
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Restore to configured duration (Requirement 8.9)
    this.remaining = this.duration;

    // Update display
    this.render();

    // Update button states
    this.updateButtonStates();
  }

  /**
   * Update timer display every second during countdown
   * Validates: Requirements 8.5, 8.10
   */
  tick() {
    // Decrement remaining time by 1 second
    this.remaining--;

    // Update display every second (Requirement 8.10)
    this.render();

    // Stop at zero (prevent negative values)
    if (this.remaining <= 0) {
      this.remaining = 0;
      this.stop();
      this.onComplete();
    }
  }

  /**
   * Handle timer completion
   * Validates: Requirements 8.6, 8.7
   */
  onComplete() {
    // Play sound alert
    this.playCompletionSound();
    
    // Trigger notification on completion (Requirement 8.7)
    // Try to use Notification API if available
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Focus Timer Complete', {
          body: 'Your focus session has ended!',
          icon: '⏰'
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission for future notifications
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Focus Timer Complete', {
              body: 'Your focus session has ended!',
              icon: '⏰'
            });
          }
        });
      }
    }
    
    // Visual indicator fallback - add a completion class to the timer display
    const timerDisplay = this.container.querySelector('.timer-display');
    if (timerDisplay) {
      timerDisplay.classList.add('timer-complete');
      // Remove the class after 3 seconds
      setTimeout(() => {
        timerDisplay.classList.remove('timer-complete');
      }, 3000);
    }

    // Update button states (disable start until reset)
    this.updateButtonStates();
  }
  
  /**
   * Play completion sound using Web Audio API
   * Creates a pleasant notification tone
   */
  playCompletionSound() {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a pleasant three-tone notification sound
      const playTone = (frequency, startTime, duration) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      // Play three ascending tones (C5, E5, G5 - a pleasant C major chord)
      const now = audioContext.currentTime;
      playTone(523.25, now, 0.2);        // C5
      playTone(659.25, now + 0.15, 0.2); // E5
      playTone(783.99, now + 0.3, 0.3);  // G5
      
    } catch (error) {
      console.warn('Could not play completion sound:', error);
    }
  }

  /**
   * Update button states based on timer state
   */
  updateButtonStates() {
    const startBtn = document.getElementById('timer-start');
    const stopBtn = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn && stopBtn && resetBtn) {
      // Disable start button if running or at zero
      startBtn.disabled = this.isRunning || this.remaining <= 0;

      // Disable stop button if not running
      stopBtn.disabled = !this.isRunning;

      // Reset button always enabled
      resetBtn.disabled = false;
    }
  }
  /**
   * Set timer duration with validation
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
   * @param {number} minutes - Duration in minutes (1-120)
   * @returns {boolean} - True if duration was set successfully, false otherwise
   */
  /**
     * Set timer duration with validation
     * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
     * @param {number} minutes - Duration in minutes (1-120)
     * @returns {boolean} - True if duration was set successfully, false otherwise
     */
    setDuration(minutes) {
      // Validate range (1-120 minutes) (Requirement 9.4)
      if (typeof minutes !== 'number' || minutes < 1 || minutes > 120) {
        // Reject out-of-range values (Requirement 9.5)
        // Preserve previous valid value on error (Requirement 9.5)
        console.error(`Invalid timer duration: ${minutes}. Must be between 1 and 120 minutes.`);
        return false;
      }

      // Store old duration to check if we should update remaining time
      const oldDuration = this.duration;

      // Set the new duration
      this.duration = minutes * 60; // Convert to seconds

      // Save to Local Storage on valid change (Requirement 9.2)
      StorageManager.save('dashboard_timerDuration', minutes);

      // Apply new duration on next reset (Requirement 9.3)
      // If timer is not running and is at the old duration (i.e., hasn't been started yet or was just reset), update immediately
      if (!this.isRunning && this.remaining === oldDuration) {
        this.remaining = this.duration;
        this.render();
      }

      return true;
    }


  /**
   * Clean up interval when component is destroyed
   */
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * QuickLinksComponent - Manages user-defined website shortcuts
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 12.2
 */
class QuickLinksComponent {
  /**
   * @param {HTMLElement} containerElement - DOM element to render the component
   */
  constructor(containerElement) {
    this.container = containerElement;
    this.links = [];
    this.eventListenersAttached = false;
    this.linksListClickHandler = null;
  }

  /**
   * Initialize component and load links from Local Storage
   * Validates: Requirements 10.7, 12.2
   */
  init() {
    // Load links from Local Storage (Requirement 10.7)
    this.links = StorageManager.load('dashboard_quickLinks', []);
    
    // Initial render
    this.render();
  }

  /**
   * Generate unique link ID using timestamp and random number
   * @returns {string} - Unique link ID
   */
  generateLinkId() {
    return `${Date.now()}-${Math.random()}`;
  }

  /**
   * Save links to Local Storage
   * Validates: Requirements 10.6, 12.2
   * @returns {boolean} - True if successful, false otherwise
   */
  saveLinks() {
    return StorageManager.save('dashboard_quickLinks', this.links);
  }

  /**
   * Validate URL format
   * Validates: Requirement 10.2
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Require HTTP or HTTPS protocol
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }
      
      // Explicitly reject javascript: and data: URLs for security
      // (already covered by the protocol check above, but being explicit)
      const lowerUrl = url.toLowerCase().trim();
      if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate display name from URL if not provided
   * @param {string} url - URL to extract display name from
   * @returns {string} - Generated display name
   */
  generateDisplayName(url) {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname;
      
      // Remove 'www.' prefix
      hostname = hostname.replace(/^www\./, '');
      
      // Capitalize first letter
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch (error) {
      return url;
    }
  }

  /**
   * Add new link with validation
   * Validates: Requirements 10.1, 10.2, 10.3, 10.6
   * @param {string} url - URL to add (required)
   * @param {string|null} displayName - Display name (optional)
   * @returns {boolean} - True if link added successfully, false if rejected
   */
  addLink(url, displayName = null) {
    // Validate URL format (Requirement 10.2)
    if (!this.isValidUrl(url)) {
      console.error(`Invalid URL: ${url}`);
      return false;
    }
    
    // Generate display name if not provided (Requirement 10.3)
    const finalDisplayName = displayName && displayName.trim().length > 0
      ? displayName.trim()
      : this.generateDisplayName(url);
    
    // Enforce max length for display name (50 characters)
    if (finalDisplayName.length > 50) {
      console.error('Display name too long (max 50 characters)');
      return false;
    }
    
    // Create new link
    const newLink = {
      id: this.generateLinkId(),
      url: url,
      displayName: finalDisplayName
    };
    
    // Add link to list (Requirement 10.1)
    this.links.push(newLink);
    
    // Save to Local Storage (Requirement 10.6)
    this.saveLinks();
    
    // Re-render the links list
    this.render();
    
    return true;
  }

  /**
   * Delete link by ID
   * Validates: Requirements 10.5, 10.6
   * @param {string} linkId - ID of link to delete
   * @returns {boolean} - True if link deleted successfully, false otherwise
   */
  deleteLink(linkId) {
    // Find the link index
    const linkIndex = this.links.findIndex(l => l.id === linkId);
    
    if (linkIndex === -1) {
      return false;
    }
    
    // Remove link from list (Requirement 10.5)
    this.links.splice(linkIndex, 1);
    
    // Save to Local Storage (Requirement 10.6)
    this.saveLinks();
    
    // Re-render the links list
    this.render();
    
    return true;
  }

  /**
   * Render quick links list
   * Validates: Requirements 10.4, 10.7
   * Optimized: Uses DocumentFragment for batch DOM updates and event delegation
   */
  render() {
    const linksListElement = this.container.querySelector('#quick-links-list');
    
    if (!linksListElement) {
      console.error('Quick links list element not found');
      return;
    }
    
    // Display empty state when no links exist
    if (this.links.length === 0) {
      linksListElement.innerHTML = `
        <li class="empty-state">
          <p>No quick links yet. Add one to get started!</p>
        </li>
      `;
      return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    // Display all links
    tempDiv.innerHTML = this.links.map(link => {
      return `
        <li class="link-item" data-link-id="${link.id}">
          <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-anchor">
            ${this.escapeHtml(link.displayName)}
          </a>
          <button class="link-delete-btn" data-link-id="${link.id}" aria-label="Delete link">Delete</button>
        </li>
      `;
    }).join('');
    
    // Move all children to fragment
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    
    // Clear and update in one operation
    linksListElement.innerHTML = '';
    linksListElement.appendChild(fragment);
    
    // Attach event listeners using event delegation
    if (!this.eventListenersAttached) {
      this.attachEventListeners();
      this.eventListenersAttached = true;
    }
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to link controls using event delegation
   * Optimized: Uses event delegation for better performance
   */
  attachEventListeners() {
    const linksListElement = this.container.querySelector('#quick-links-list');
    
    if (!linksListElement) {
      return;
    }
    
    // Remove existing listener if any
    if (this.linksListClickHandler) {
      linksListElement.removeEventListener('click', this.linksListClickHandler);
    }
    
    // Use event delegation for delete button clicks
    this.linksListClickHandler = (e) => {
      const target = e.target;
      if (target.classList.contains('link-delete-btn')) {
        const linkId = target.dataset.linkId;
        if (linkId) {
          this.deleteLink(linkId);
        }
      }
    };
    
    linksListElement.addEventListener('click', this.linksListClickHandler);
  }
}

/**
 * ThemeComponent - Manages light/dark theme switching and persistence
 * Validates: Requirements 11.1, 11.2, 11.4, 11.5
 */
class ThemeComponent {
  /**
   * Constructor initializes the theme component
   */
  constructor() {
    this.currentTheme = 'dark'; // Default to dark theme (Requirement 11.2)
  }

  /**
   * Initialize theme from Local Storage
   * Validates: Requirements 11.2, 11.5
   */
  init() {
    // Load theme from Local Storage on init (Requirement 11.5)
    this.currentTheme = StorageManager.load('dashboard_theme', 'dark');
    
    // Apply the loaded theme
    this.applyTheme();
  }

  /**
   * Toggle between light and dark themes
   * Validates: Requirement 11.1
   */
  toggle() {
    // Toggle between 'light' and 'dark'
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    
    // Apply the new theme (which also saves to Local Storage)
    this.applyTheme();
  }

  /**
   * Set specific theme
   * Validates: Requirements 11.1, 11.4
   * @param {string} theme - Theme to set ('light' or 'dark')
   * @returns {boolean} - True if theme was set successfully, false otherwise
   */
  setTheme(theme) {
    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      console.error(`Invalid theme: ${theme}. Must be 'light' or 'dark'.`);
      return false;
    }
    
    // Set the theme
    this.currentTheme = theme;
    
    // Apply the theme (which also saves to Local Storage)
    this.applyTheme();
    
    return true;
  }

  /**
   * Apply theme to document
   * Validates: Requirements 11.3, 11.4
   */
  applyTheme() {
    // Add/remove CSS class on document root (Requirement 11.3)
    const root = document.documentElement;
    
    if (this.currentTheme === 'light') {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      root.classList.add('dark-theme');
    }
    
    // Update all visual elements to match theme (Requirement 11.3)
    // This is handled by CSS classes applied to the root element
    
    // Save theme to Local Storage on change (Requirement 11.4)
    StorageManager.save('dashboard_theme', this.currentTheme);
    
    // Update theme toggle button icon
    this.updateThemeIcon();
  }

  /**
   * Update theme toggle button icon
   */
  updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    
    if (themeIcon) {
      // Show sun icon for light theme, moon icon for dark theme
      themeIcon.textContent = this.currentTheme === 'light' ? '☀️' : '🌙';
    }
  }
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  // Remove any existing error messages
  const existingError = document.querySelector('.task-error-message');
  if (existingError) {
    existingError.remove();
  }
  
  // Create error message element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'task-error-message';
  errorDiv.textContent = message;
  
  // Insert after task input container
  const taskInputContainer = document.querySelector('.task-input-container');
  taskInputContainer.parentNode.insertBefore(errorDiv, taskInputContainer.nextSibling);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    errorDiv.style.opacity = '0';
    setTimeout(() => {
      errorDiv.remove();
    }, 300);
  }, 3000);
}

/**
 * Initialize application when DOM is ready
 * Optimized for fast initial load (< 500ms target)
 */
document.addEventListener('DOMContentLoaded', () => {
  const loadStartTime = performance.now();

  // Initialize Storage Manager first to check availability and show warnings
  StorageManager.init();
  
  // Request notification permission on first visit
  if ('Notification' in window && Notification.permission === 'default') {
    // Small delay to let the page load first for better UX
    setTimeout(() => {
      Notification.requestPermission();
    }, 2000);
  }

  // Initialize Theme Component first to apply theme before other components render
  const themeComponent = new ThemeComponent();
  themeComponent.init();

  // Wire up theme toggle button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      themeComponent.toggle();
    });
  }

  // Initialize critical components immediately (greeting and tasks)
  // These are the most visible and important for initial user experience
  
  // Initialize Greeting Component
  const greetingContainer = document.querySelector('.greeting-section');
  let greetingComponent;
  if (greetingContainer) {
    greetingComponent = new GreetingComponent(greetingContainer);
    greetingComponent.init();
  }

  // Initialize Task List Component
  const taskListContainer = document.querySelector('.tasks-section');
  let taskListComponent;
  if (taskListContainer) {
    taskListComponent = new TaskListComponent(taskListContainer);
    taskListComponent.init();

    // Wire up task input
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');

    // Handle add task button click
    const handleAddTask = () => {
      const text = taskInput.value;
      const result = taskListComponent.addTask(text);
      
      // Clear input field after successful add (Requirement 3.6)
      if (result.success) {
        taskInput.value = '';
      } else if (result.error) {
        // Show error message
        showErrorMessage(result.error);
      }
    };

    // Add task on button click
    addTaskBtn.addEventListener('click', handleAddTask);

    // Add task on Enter key press
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAddTask();
      }
    });

    // Wire up sort order dropdown
    const sortOrderSelect = document.getElementById('sort-order');
    if (sortOrderSelect) {
      // Set initial value from loaded sort order
      sortOrderSelect.value = taskListComponent.sortOrder;

      // Handle sort order change
      sortOrderSelect.addEventListener('change', (e) => {
        taskListComponent.setSortOrder(e.target.value);
      });
    }
  }

  // Defer initialization of non-critical components (timer and quick links)
  // Use requestAnimationFrame to ensure smooth initial render
  requestAnimationFrame(() => {
    // Initialize Focus Timer Component
    const timerContainer = document.querySelector('.timer-section');
    if (timerContainer) {
      const focusTimerComponent = new FocusTimerComponent(timerContainer);
      focusTimerComponent.init();

      // Wire up timer controls
      const startBtn = document.getElementById('timer-start');
      const stopBtn = document.getElementById('timer-stop');
      const resetBtn = document.getElementById('timer-reset');

      // Start timer
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          focusTimerComponent.start();
        });
      }

      // Stop timer
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          focusTimerComponent.stop();
        });
      }

      // Reset timer
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          focusTimerComponent.reset();
        });
      }

      // Wire up timer duration input
      const timerDurationInput = document.getElementById('timer-duration');
      if (timerDurationInput) {
        // Set initial value from loaded duration
        timerDurationInput.value = focusTimerComponent.duration / 60;

        // Debounce duration changes to avoid rapid updates (Requirement 14.5)
        const debouncedDurationChange = debounce((minutes) => {
          const success = focusTimerComponent.setDuration(minutes);
          
          // If invalid, reset to current duration
          if (!success) {
            timerDurationInput.value = focusTimerComponent.duration / 60;
            alert('Invalid duration. Please enter a value between 1 and 120 minutes.');
          }
        }, 500); // 500ms debounce

        // Handle duration change with debouncing
        timerDurationInput.addEventListener('input', (e) => {
          const minutes = parseInt(e.target.value, 10);
          if (!isNaN(minutes)) {
            debouncedDurationChange(minutes);
          }
        });

        // Also handle on blur for immediate validation
        timerDurationInput.addEventListener('blur', (e) => {
          const minutes = parseInt(e.target.value, 10);
          const success = focusTimerComponent.setDuration(minutes);
          
          // If invalid, reset to current duration
          if (!success) {
            e.target.value = focusTimerComponent.duration / 60;
            alert('Invalid duration. Please enter a value between 1 and 120 minutes.');
          }
        });
      }
    }

    // Initialize Quick Links Component
    const quickLinksContainer = document.querySelector('.quick-links-section');
    if (quickLinksContainer) {
      const quickLinksComponent = new QuickLinksComponent(quickLinksContainer);
      quickLinksComponent.init();

      // Wire up link input
      const linkUrlInput = document.getElementById('link-url');
      const linkNameInput = document.getElementById('link-name');
      const addLinkBtn = document.getElementById('add-link-btn');

      // Handle add link button click
      const handleAddLink = () => {
        const url = linkUrlInput.value.trim();
        const displayName = linkNameInput.value.trim();
        
        if (url) {
          const success = quickLinksComponent.addLink(url, displayName || null);
          
          // Clear input fields after successful add
          if (success) {
            linkUrlInput.value = '';
            linkNameInput.value = '';
          } else {
            // Show error message to user
            alert('Invalid URL. Please enter a valid HTTP or HTTPS URL.');
          }
        }
      };

      // Add link on button click
      if (addLinkBtn) {
        addLinkBtn.addEventListener('click', handleAddLink);
      }

      // Add link on Enter key press in URL input
      if (linkUrlInput) {
        linkUrlInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleAddLink();
          }
        });
      }

      // Add link on Enter key press in name input
      if (linkNameInput) {
        linkNameInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleAddLink();
          }
        });
      }
    }

    // Log load time for performance monitoring
    const loadEndTime = performance.now();
    const totalLoadTime = loadEndTime - loadStartTime;
    
    if (totalLoadTime > 500) {
      console.warn(`Initial load took ${totalLoadTime.toFixed(2)}ms (target: <500ms)`);
    } else {
      console.log(`Initial load completed in ${totalLoadTime.toFixed(2)}ms`);
    }
  });
});
