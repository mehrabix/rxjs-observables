import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SocketService, SocketMessage } from './socket.service';

@Component({
  selector: 'app-socket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="socket-container">
      <h2>WebSocket Connection</h2>
      
      <div class="connection-status" [class.connected]="isConnected">
        Status: {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
      
      <div class="predefined-servers">
        <h3>Select a WebSocket Server:</h3>
        <div class="server-options">
          <button type="button" (click)="selectServer('echo')" [disabled]="isConnected">Echo Test Server</button>
          <button type="button" (click)="selectServer('crypto')" [disabled]="isConnected">Cryptocurrency</button>
          <button type="button" (click)="selectServer('custom')" [disabled]="isConnected">Custom Server</button>
        </div>
      </div>
      
      <form [formGroup]="socketForm" (ngSubmit)="connect()">
        <div class="form-group">
          <label for="socketUrl">Socket URL:</label>
          <input 
            type="text" 
            id="socketUrl" 
            formControlName="socketUrl" 
            [disabled]="isConnected"
          >
          <div *ngIf="socketForm.get('socketUrl')?.invalid && socketForm.get('socketUrl')?.touched" class="error">
            Please enter a valid WebSocket URL (starting with ws:// or wss://)
          </div>
        </div>
        
        <div class="button-group">
          <button 
            type="submit" 
            [disabled]="socketForm.invalid || isConnected"
          >Connect</button>
          
          <button 
            type="button" 
            [disabled]="!isConnected" 
            (click)="disconnect()"
          >Disconnect</button>
        </div>
      </form>
      
      <div class="message-section">
        <h3>Messages</h3>
        
        <div class="message-input" *ngIf="showMessageForm && isConnected">
          <form [formGroup]="messageForm" (ngSubmit)="sendMessage()">
            <div class="form-group">
              <label for="messageType">Message Type:</label>
              <input type="text" id="messageType" formControlName="type" [disabled]="!isConnected">
            </div>
            
            <div class="form-group">
              <label for="messagePayload">Payload (JSON):</label>
              <textarea 
                id="messagePayload" 
                formControlName="payload" 
                rows="5" 
                [disabled]="!isConnected"
              ></textarea>
              <div *ngIf="messageForm.get('payload')?.hasError('jsonInvalid')" class="error">
                Invalid JSON format
              </div>
            </div>
            
            <button 
              type="submit" 
              [disabled]="messageForm.invalid || !isConnected"
            >Send Message</button>
          </form>
        </div>
        
        <div class="server-info" *ngIf="selectedServer && isConnected">
          <div *ngIf="selectedServer === 'echo'" class="info-box">
            <p><strong>Connected to Echo WebSocket Server</strong></p>
            <p>This server will echo back any message you send.</p>
          </div>
          <div *ngIf="selectedServer === 'crypto'" class="info-box">
            <p><strong>Connected to Cryptocurrency WebSocket</strong></p>
            <p>The server will stream real cryptocurrency price data after you send the subscription message.</p>
          </div>
        </div>
        
        <div class="connection-actions" *ngIf="selectedServer === 'crypto' && isConnected">
          <button (click)="sendCryptoSubscription()" class="action-button">Subscribe to BTC, ETH Tickers</button>
        </div>
        
        <div class="message-log">
          <h4>Message Log: <button (click)="clearMessages()" *ngIf="messages.length > 0" class="small-button">Clear</button></h4>
          <div class="log-container">
            <div *ngFor="let message of messages" class="message">
              <div class="message-header">
                <span class="message-type">{{ message.type }}</span>
                <span class="message-time">{{ message.timestamp | date:'medium' }}</span>
              </div>
              <pre class="message-content">{{ message.payload | json }}</pre>
            </div>
            
            <div *ngIf="messages.length === 0" class="no-messages">
              No messages received yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .socket-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .connection-status {
      padding: 10px;
      margin-bottom: 20px;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
    }
    
    .connection-status.connected {
      background-color: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
    }
    
    .predefined-servers {
      margin-bottom: 20px;
    }
    
    .server-options {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }
    
    .info-box {
      background-color: #e8f4fd;
      border-left: 4px solid #3498db;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 0 4px 4px 0;
    }
    
    .connection-actions {
      margin-bottom: 15px;
    }
    
    .action-button {
      background-color: #28a745;
    }
    
    .action-button:hover:not(:disabled) {
      background-color: #218838;
    }
    
    .small-button {
      padding: 2px 8px;
      font-size: 12px;
      background-color: #6c757d;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    button {
      padding: 8px 16px;
      margin-right: 10px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover:not(:disabled) {
      background-color: #3367d6;
    }
    
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    .error {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }
    
    .message-section {
      margin-top: 30px;
    }
    
    .message-log {
      margin-top: 20px;
    }
    
    .log-container {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      background-color: #f8f9fa;
    }
    
    .message {
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .message-type {
      font-weight: bold;
      color: #4285f4;
    }
    
    .message-time {
      color: #666;
      font-size: 12px;
    }
    
    .message-content {
      background-color: #fff;
      padding: 8px;
      border-radius: 4px;
      font-size: 14px;
      overflow-x: auto;
      margin: 0;
    }
    
    .no-messages {
      color: #666;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }
  `]
})
export class SocketComponent implements OnInit, OnDestroy {
  socketForm: FormGroup;
  messageForm: FormGroup;
  isConnected = false;
  messages: Array<{ type: string; payload: any; timestamp: Date }> = [];
  
  // Properties for WebSocket servers
  selectedServer: string | null = null;
  showMessageForm = true;
  connectionError = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private socketService: SocketService
  ) {
    // Initialize forms
    this.socketForm = this.fb.group({
      socketUrl: ['', [
        Validators.required, 
        Validators.pattern('^(ws|wss)://.*')
      ]]
    });
    
    this.messageForm = this.fb.group({
      type: ['message', Validators.required],
      payload: ['{}', [Validators.required, this.jsonValidator]]
    });
  }

  ngOnInit(): void {
    // Subscribe to connection status changes
    this.socketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('Connection status changed:', status);
        this.isConnected = status;
        
        if (status && this.selectedServer === 'crypto') {
          // Show a notification that user needs to subscribe
          this.messages.unshift({
            type: 'INFO',
            payload: {
              message: 'Connected to crypto feed. Click "Subscribe to BTC, ETH Tickers" to start receiving data'
            },
            timestamp: new Date()
          });
        }
      });
    
    // Subscribe to incoming messages
    this.socketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('Message received:', message);
        this.messages.unshift({
          type: message.type || 'message',
          payload: message.payload || {},
          timestamp: new Date()
        });
      });
  }
  
  // Select a predefined server
  selectServer(serverType: string): void {
    this.selectedServer = serverType;
    this.connectionError = false;
    
    switch(serverType) {
      case 'echo':
        // Simple echo WebSocket server
        this.socketForm.patchValue({
          socketUrl: 'wss://echo.websocket.org'
        });
        this.messageForm.patchValue({
          type: 'message',
          payload: JSON.stringify({ text: 'Hello WebSocket!' }, null, 2)
        });
        this.showMessageForm = true;
        break;
        
      case 'crypto':
        // Coinbase WebSocket API
        this.socketForm.patchValue({
          socketUrl: 'wss://ws-feed.exchange.coinbase.com'
        });
        this.messageForm.patchValue({
          type: 'subscribe',
          payload: JSON.stringify({
            type: 'subscribe',
            product_ids: ['BTC-USD', 'ETH-USD'],
            channels: ['ticker']
          }, null, 2)
        });
        this.showMessageForm = true;
        break;
        
      case 'custom':
        // Allow custom WebSocket URL
        this.socketForm.patchValue({
          socketUrl: ''
        });
        this.messageForm.patchValue({
          type: 'message',
          payload: '{}'
        });
        this.showMessageForm = true;
        break;
    }
  }
  
  // Send crypto subscription message
  sendCryptoSubscription(): void {
    if (this.isConnected && this.selectedServer === 'crypto') {
      const subscriptionMessage = {
        type: 'subscribe',
        product_ids: ['BTC-USD', 'ETH-USD'],
        channels: ['ticker']
      };
      
      this.socketService.send({
        type: 'subscribe',
        payload: subscriptionMessage
      });
      
      // Add to messages list
      this.messages.unshift({
        type: 'SENT: subscribe',
        payload: subscriptionMessage,
        timestamp: new Date()
      });
    }
  }
  
  // Custom validator for JSON input
  jsonValidator(control: any) {
    try {
      JSON.parse(control.value);
      return null;
    } catch (e) {
      return { jsonInvalid: true };
    }
  }
  
  // Connect to WebSocket
  connect(): void {
    if (this.socketForm.valid) {
      this.connectionError = false;
      const url = this.socketForm.value.socketUrl;
      
      try {
        this.socketService.connect(url);
        this.messages = []; // Clear messages on new connection
      } catch (error) {
        console.error('Connection error:', error);
        this.connectionError = true;
      }
    }
  }
  
  // Disconnect from WebSocket
  disconnect(): void {
    this.socketService.close();
    this.selectedServer = null;
  }
  
  // Clear messages
  clearMessages(): void {
    this.messages = [];
  }
  
  // Send a message through WebSocket
  sendMessage(): void {
    if (this.messageForm.valid && this.isConnected) {
      try {
        const messagePayload = JSON.parse(this.messageForm.value.payload);
        
        // For Coinbase API, the payload itself needs to be sent as the message
        if (this.selectedServer === 'crypto') {
          this.socketService.send(messagePayload);
        } else {
          // For other servers, wrap in SocketMessage format
          const message: SocketMessage = {
            type: this.messageForm.value.type,
            payload: messagePayload
          };
          this.socketService.send(message);
        }
        
        // Add to messages list
        this.messages.unshift({
          type: `SENT: ${this.messageForm.value.type}`,
          payload: messagePayload,
          timestamp: new Date()
        });
      } catch (e) {
        console.error('Error sending message:', e);
      }
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Close socket connection if active
    if (this.isConnected) {
      this.socketService.close();
    }
  }
} 