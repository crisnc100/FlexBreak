/**
 * Simple EventEmitter implementation for communication between components
 */

export type Listener = (data: any) => void;

export class EventEmitter {
  private events: Record<string, Listener[]> = {};

  /**
   * Register an event listener
   * @param event Event name
   * @param listener Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on(event: string, listener: Listener): Function {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    
    // Return function to remove this specific listener
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Remove an event listener
   * @param event Event name
   * @param listenerToRemove Function to remove
   */
  off(event: string, listenerToRemove: Listener): void {
    if (!this.events[event]) {
      return;
    }

    this.events[event] = this.events[event].filter(
      listener => listener !== listenerToRemove
    );
    
    // Clean up empty event arrays
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  /**
   * Emit an event with data
   * @param event Event name
   * @param data Data to pass to listeners
   */
  emit(event: string, data: any = {}): void {
    if (!this.events[event]) {
      return;
    }

    // Create a copy of the listeners array to avoid issues 
    // if listeners are added/removed during emission
    const listeners = [...this.events[event]];
    
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param event Event name (optional, if not provided all events are cleared)
   */
  clear(event?: string): void {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.events[event]?.length || 0;
  }
}

export default EventEmitter; 