/**
 * Centralized State Store
 * Simple event-based state management
 */

class Store {
    constructor() {
        this.state = {
            user: null,
            themes: [],
            currentTheme: null,
            currentNote: null,
            isEditMode: false
        };
        this.listeners = {};
    }

    /**
     * Get a state value
     * @param {string} key 
     * @returns {any}
     */
    get(key) {
        return this.state[key];
    }

    /**
     * Set a state value and emit change event
     * @param {string} key 
     * @param {any} value 
     */
    set(key, value) {
        this.state[key] = value;
        this.emit(`${key}:changed`, value);
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @param {Function} callback 
     * @returns {Function} unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    /**
     * Emit an event
     * @param {string} event 
     * @param {any} data 
     */
    emit(event, data) {
        const callbacks = this.listeners[event] || [];
        callbacks.forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`Error in event listener for ${event}:`, e);
            }
        });
    }

    /**
     * Get entire state (for debugging)
     * @returns {Object}
     */
    getState() {
        return { ...this.state };
    }
}

// Singleton instance
export const store = new Store();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.__store = store;
}
