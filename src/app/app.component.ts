import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable, Subject, interval, of, from, fromEvent, throwError, BehaviorSubject } from 'rxjs';
import { map, filter, take, takeUntil, catchError, tap, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RxjsExampleService, User, Post } from './rxjs-example.service';
import { SearchComponent } from './search.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, HttpClientModule, SearchComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
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
    throwError(() => new Error('Test error')).pipe(
      catchError(error => {
        console.error('Caught error:', error.message);
        return of('Recovered from error');
      })
    ).subscribe(val => console.log(val));
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
