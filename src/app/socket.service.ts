import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject, timer, of, throwError } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { catchError, tap, switchMap, delay, retryWhen, take } from 'rxjs/operators';

export interface SocketMessage {
  type: string;
  payload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket$: WebSocketSubject<any> | null = null;
  private messagesSubject = new Subject<SocketMessage>();
  public messages$ = this.messagesSubject.asObservable();
  
  // Connection status
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  // Track current connection URL
  private currentUrl: string | null = null;
  
  // Max reconnection attempts
  private readonly MAX_RETRIES = 5;

  constructor() { }

  /**
   * Connect to a WebSocket
   */
  public connect(url: string): void {
    if (this.socket$ && !this.socket$.closed) {
      this.socket$.complete(); // Close any existing socket
    }
    
    this.currentUrl = url;
    this.socket$ = this.createWebSocket();
    
    if (!this.socket$) {
      console.error('Failed to create WebSocket');
      return;
    }
    
    this.socket$.pipe(
      catchError(error => {
        console.error('Socket error:', error);
        return throwError(() => new Error(error));
      })
    ).subscribe({
      next: (message) => {
        console.log('Received message:', message);
        // Handle both strings and objects
        if (typeof message === 'string') {
          try {
            const parsed = JSON.parse(message);
            this.messagesSubject.next({
              type: parsed.type || 'message',
              payload: parsed
            });
          } catch (e) {
            this.messagesSubject.next({
              type: 'message',
              payload: { text: message }
            });
          }
        } else {
          this.messagesSubject.next({
            type: message.type || 'message',
            payload: message
          });
        }
      },
      error: (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatusSubject.next(false);
        this.reconnect();
      },
      complete: () => {
        console.log('WebSocket connection closed');
        this.connectionStatusSubject.next(false);
      }
    });
  }

  /**
   * Send a message through the WebSocket
   */
  public send(message: SocketMessage): void {
    if (this.socket$ && !this.socket$.closed) {
      console.log('Sending message:', message);
      this.socket$.next(message);
    } else {
      console.error('Cannot send message - socket is closed or not initialized');
    }
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    if (this.socket$) {
      console.log('Closing WebSocket connection');
      this.socket$.complete();
      this.socket$ = null;
      this.currentUrl = null;
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private reconnect(): void {
    if (!this.currentUrl) {
      return;
    }
    
    console.log('Attempting to reconnect...');
    
    // Wait before reconnecting
    timer(1000).pipe(
      take(1),
      tap(() => {
        this.socket$ = this.createWebSocket();
        if (this.socket$) {
          this.socket$.subscribe({
            next: (message) => {
              if (typeof message === 'string') {
                try {
                  const parsed = JSON.parse(message);
                  this.messagesSubject.next({
                    type: parsed.type || 'message',
                    payload: parsed
                  });
                } catch (e) {
                  this.messagesSubject.next({
                    type: 'message',
                    payload: { text: message }
                  });
                }
              } else {
                this.messagesSubject.next({
                  type: message.type || 'message',
                  payload: message
                });
              }
            },
            error: (error) => {
              console.error('Reconnection error:', error);
              this.connectionStatusSubject.next(false);
            }
          });
        }
      })
    ).subscribe();
  }

  /**
   * Create a new WebSocket subject
   */
  private createWebSocket(): WebSocketSubject<any> | null {
    if (!this.currentUrl) {
      return null;
    }
    
    try {
      console.log(`Creating WebSocket connection to ${this.currentUrl}`);
      const ws = webSocket({
        url: this.currentUrl,
        openObserver: {
          next: () => {
            console.log('WebSocket connection opened');
            this.connectionStatusSubject.next(true);
          }
        },
        closeObserver: {
          next: () => {
            console.log('WebSocket connection closed');
            this.connectionStatusSubject.next(false);
          }
        }
      });
      
      return ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      this.connectionStatusSubject.next(false);
      return null;
    }
  }
} 