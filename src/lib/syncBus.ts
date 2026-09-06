/**
 * NEXOVIRA Unified Cross-Domain & Cross-Tab Real-Time Synchronization Bus
 * Ensures that changes to cart, wishlist, currency, orders, and authentication
 * state immediately synchronize across all open tabs, windows, and sessions.
 */

export type SyncEventType =
  | 'CART_UPDATED'
  | 'WISHLIST_UPDATED'
  | 'CURRENCY_CHANGED'
  | 'AUTH_CHANGED'
  | 'CATALOG_INVALIDATED'
  | 'TECH_SERVICES_UPDATED';

export interface SyncMessage<T = any> {
  type: SyncEventType;
  payload?: T;
  timestamp: number;
  origin: string;
}

const CHANNEL_NAME = 'nexovira_unified_sync_bus';

class UnifiedSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: SyncMessage) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            this.notifyListeners(event.data);
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel not available, falling back to storage events:', e);
      }

      // Fallback & complementary storage event listener for older engines or cross-context
      window.addEventListener('storage', (e) => {
        if (e.key === 'nexovira_sync_pulse' && e.newValue) {
          try {
            const data: SyncMessage = JSON.parse(e.newValue);
            this.notifyListeners(data);
          } catch {
            // ignore JSON parse error
          }
        }
      });
    }
  }

  private notifyListeners(message: SyncMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in sync listener:', err);
      }
    });
  }

  /**
   * Broadcasts a synchronization pulse to all open tabs and windows
   */
  public broadcast<T = any>(type: SyncEventType, payload?: T) {
    if (typeof window === 'undefined') return;

    const message: SyncMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      origin: window.location.origin,
    };

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('Channel postMessage failed:', err);
      }
    }

    try {
      localStorage.setItem('nexovira_sync_pulse', JSON.stringify(message));
    } catch {
      // ignore storage error
    }

    // Also dispatch to local window so local components update seamlessly
    this.notifyListeners(message);
  }

  /**
   * Subscribes to real-time cross-tab/cross-window events
   */
  public subscribe(listener: (message: SyncMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const syncBus = new UnifiedSyncBus();
