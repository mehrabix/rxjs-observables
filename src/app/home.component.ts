import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, interval, of, BehaviorSubject } from 'rxjs';
import { map, filter, take, takeUntil, catchError, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RxjsExampleService, User, Post } from './rxjs-example.service';
import { SearchComponent } from './search.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, SearchComponent],
  template: `
    <div>
      <h1>RxJS Observable Examples</h1>
      
      <!-- Loading indicator -->
      <div *ngIf="loading$ | async" class="loading-indicator">
        Loading...
      </div>
      
      <!-- Notifications area - using async pipe to get the array of notifications -->
      <div class="notifications">
        <ng-container *ngIf="notifications$ | async as notificationsList">
          <div *ngFor="let notification of notificationsList" class="notification">
            {{ notification }}
          </div>
        </ng-container>
      </div>
      
      <section>
        <h2>Async Pipe Example</h2>
        <ul>
          <li *ngFor="let item of data$ | async">{{ item }}</li>
        </ul>
      </section>
      
      <section>
        <h2>BehaviorSubject Counter</h2>
        <div class="counter">
          <p>Current Count: {{ counter$ | async }}</p>
          <button (click)="decrementCounter()">-</button>
          <button (click)="incrementCounter()">+</button>
        </div>
      </section>
      
      <section>
        <h2>JSONPlaceholder User Search</h2>
        <p class="api-info">Using server-side filtering with JSONPlaceholder API</p>
        
        <!-- Using our reusable SearchComponent -->
        <app-search 
          placeholder="Search users by name, username, or email..."
          [loading]="(loading$ | async) === true"
          (search)="onUserSearch($event)">
        </app-search>
        
        <div class="results">
          <p *ngIf="(searchResults$ | async)?.length === 0">No users found</p>
          <div *ngIf="(searchResults$ | async) as users">
            <div *ngFor="let user of users" class="user-card">
              <h3>{{ user.name }}</h3>
              <p><strong>Username:</strong> {{ user.username }}</p>
              <p><strong>Email:</strong> {{ user.email }}</p>
              <p *ngIf="user.phone"><strong>Phone:</strong> {{ user.phone }}</p>
              <p *ngIf="user.website"><strong>Website:</strong> {{ user.website }}</p>
              <button (click)="loadUserWithPosts(user.id)">Load Posts</button>
            </div>
          </div>
        </div>
      </section>
      
      <section>
        <h2>JSONPlaceholder Post Search</h2>
        <p class="api-info">Using server-side filtering with JSONPlaceholder API</p>
        
        <!-- Using our reusable SearchComponent -->
        <app-search 
          placeholder="Search posts by title or content..."
          [loading]="(loading$ | async) === true"
          (search)="onPostSearch($event)">
        </app-search>
        
        <div class="results">
          <p *ngIf="(posts$ | async)?.length === 0">No posts found</p>
          <div *ngIf="(posts$ | async) as posts">
            <div *ngFor="let post of posts.slice(0, 5)" class="post-card">
              <h3>{{ post.title }}</h3>
              <p>{{ post.body }}</p>
            </div>
            <p *ngIf="posts.length > 5" class="more-results">Showing 5 of {{ posts.length }} results...</p>
          </div>
        </div>
      </section>
      
      <section>
        <h2>User with Posts (Combined Observables)</h2>
        <p class="api-info">Using combineLatest with server-filtered API requests</p>
        
        <div *ngIf="userWithPosts$ | async as userData">
          <div *ngIf="!userData.error; else errorTpl">
            <div class="user-details">
              <h3>{{ userData.name }}</h3>
              <p><strong>Username:</strong> {{ userData.username }}</p>
              <p><strong>Email:</strong> {{ userData.email }}</p>
            </div>
            
            <h4>Posts by {{ userData.name }}</h4>
            <div *ngIf="userData.posts.length === 0">No posts found</div>
            <div *ngFor="let post of userData.posts.slice(0, 3)" class="post-card">
              <h3>{{ post.title }}</h3>
              <p>{{ post.body }}</p>
            </div>
            <p *ngIf="userData.posts.length > 3" class="more-results">
              Showing 3 of {{ userData.posts.length }} posts...
            </p>
          </div>
          
          <ng-template #errorTpl>
            <div class="error-message">
              Error loading user data: {{ userData.error }}
            </div>
          </ng-template>
        </div>
        
        <div class="user-navigation">
          <button (click)="loadUserWithPosts(selectedUserId > 1 ? selectedUserId - 1 : 10)">Previous User</button>
          <span>User ID: {{ selectedUserId }}</span>
          <button (click)="loadUserWithPosts(selectedUserId < 10 ? selectedUserId + 1 : 1)">Next User</button>
        </div>
      </section>
      
      <section>
        <h2>Error Handling</h2>
        <button (click)="triggerError()">Trigger Error</button>
        <p>Check console for results</p>
      </section>
      
      <section>
        <h2>Console Examples</h2>
        <p>Open your browser console to see the following examples in action:</p>
        <ul>
          <li>Basic Observable subscription with operators</li>
          <li>Interval Observable</li>
          <li>Error handling</li>
        </ul>
      </section>
    </div>
  `,
  styleUrls: ['./app.component.scss']  // Reuse the same styles
})
export class HomeComponent implements OnInit, OnDestroy {
  title = 'observable';
  
  // Simple observable
  numbers$: Observable<number>;
  
  // Using Subject
  private destroy$ = new Subject<void>();
  
  // Using BehaviorSubject for state management
  private counterSubject = new BehaviorSubject<number>(0);
  counter$ = this.counterSubject.asObservable();
  
  // For async pipe demo
  data$: Observable<string[]>;
  
  // Search subjects
  private userSearchTerms$ = new Subject<string>();
  private postSearchTerms$ = new Subject<string>();
  
  // Event observable for search
  searchResults$: Observable<User[]>;
  
  // JSONPlaceholder API observables
  posts$: Observable<Post[]>;
  userWithPosts$: Observable<any> = of(null);
  selectedUserId = 1;
  
  // Expose loading$ from service
  loading$: Observable<boolean>;
  
  // Expose notifications$ from service
  notifications$: Observable<string[]>;
  
  constructor(private rxjsService: RxjsExampleService) {
    // Initialize observables
    this.numbers$ = of(1, 2, 3, 4, 5);
    this.data$ = of(['Apple', 'Banana', 'Cherry', 'Date']);
    this.loading$ = this.rxjsService.loading$;
    this.notifications$ = this.rxjsService.notifications$;
    
    // Set up search observables with switchMap
    this.searchResults$ = this.userSearchTerms$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => this.rxjsService.searchUsers(term))
    );
    
    this.posts$ = this.postSearchTerms$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(term => this.rxjsService.searchPosts(term))
    );
  }
  
  ngOnInit(): void {
    // Basic subscription
    this.numbers$.pipe(
      map(n => n * 2),
      filter(n => n > 5),
      takeUntil(this.destroy$)
    ).subscribe({
      next: value => console.log('Transformed value:', value),
      error: err => console.error('Error occurred:', err),
      complete: () => console.log('Stream completed')
    });
    
    // Interval example
    interval(1000).pipe(
      take(5),
      takeUntil(this.destroy$)
    ).subscribe(val => console.log('Interval:', val));
    
    // Load user with posts
    this.loadUserWithPosts(this.selectedUserId);
  }
  
  // Counter methods
  incrementCounter(): void {
    this.counterSubject.next(this.counterSubject.value + 1);
  }
  
  decrementCounter(): void {
    this.counterSubject.next(this.counterSubject.value - 1);
  }
  
  // Search method using reusable component
  onUserSearch(term: string): void {
    this.userSearchTerms$.next(term);
  }
  
  // Search posts method using reusable component
  onPostSearch(term: string): void {
    this.postSearchTerms$.next(term);
  }
  
  // Load user with posts
  loadUserWithPosts(userId: number): void {
    this.selectedUserId = userId;
    this.userWithPosts$ = this.rxjsService.getUserWithPosts(userId);
  }
  
  // Error handling example
  triggerError(): void {
    throw new Error('Test error');
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
} 