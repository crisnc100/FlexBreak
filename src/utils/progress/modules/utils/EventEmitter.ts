/**
 * Simple EventEmitter implementation compatible with React Native
 * Provides similar functionality to Node.js EventEmitter
 */
export class EventEmitter {
  private events: Record<string, Array<(data?: any) => void>> = {};

  /**
   * Subscribe to an event
   * @param eventName Name of the event to listen for
   * @param listener Function to call when the event occurs
   */
  public on(eventName: string, listener: (data?: any) => void): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(listener);
  }

  /**
   * Unsubscribe from an event
   * @param eventName Name of the event
   * @param listener Function to remove from listeners
   */
  public off(eventName: string, listener: (data?: any) => void): void {
    if (!this.events[eventName]) {
      return;
    }
    
    const index = this.events[eventName].indexOf(listener);
    if (index !== -1) {
      this.events[eventName].splice(index, 1);
    }
  }

  /**
   * Emit an event with optional data
   * @param eventName Name of the event to emit
   * @param data Optional data to pass to listeners
   */
  public emit(eventName: string, data?: any): void {
    if (!this.events[eventName]) {
      return;
    }
    
    // Create a copy of the listeners array to avoid issues
    // if a listener modifies the array during iteration
    const listeners = [...this.events[eventName]];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event and unsubscribe after it occurs once
   * @param eventName Name of the event
   * @param listener Function to call when the event occurs
   */
  public once(eventName: string, listener: (data?: any) => void): void {
    const onceWrapper = (data?: any) => {
      listener(data);
      this.off(eventName, onceWrapper);
    };
    
    this.on(eventName, onceWrapper);
  }

  /**
   * Remove all listeners for an event, or all events if no event name is provided
   * @param eventName Optional name of the event
   */
  public removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
  }
} 