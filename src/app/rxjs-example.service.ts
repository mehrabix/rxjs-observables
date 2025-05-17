import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { 
  Observable, 
  Subject, 
  BehaviorSubject, 
  ReplaySubject, 
  of, 
  from, 
  timer, 
  combineLatest, 
  merge, 
  forkJoin 
} from 'rxjs';
import { 
  map, 
  switchMap, 
  mergeMap, 
  concatMap, 
  exhaustMap, 
  tap, 
  catchError, 
  retry, 
  debounceTime, 
  throttleTime, 
  distinctUntilChanged,
  shareReplay,
  scan
} from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  website?: string;
}

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

@Injectable({
  providedIn: 'root'
})
export class RxjsExampleService {
  // JSONPlaceholder API base URL
  private readonly API_BASE_URL = 'https://jsonplaceholder.typicode.com';
  
  // BehaviorSubject maintains the latest value
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();
  
  // Subject for notifications with scan to maintain array of last 3 messages
  private notificationsSubject = new Subject<string>();
  notifications$ = this.notificationsSubject.pipe(
    scan<string, string[]>((messages, message) => {
      const updated = [...messages, message];
      return updated.slice(-3); // Keep only last 3 messages
    }, [])
  );

  constructor(private http: HttpClient) { }

  // Using server-side filtering API for user search
  searchUsers(term: string): Observable<User[]> {
    if (!term.trim()) {
      return of([]);
    }
    
    this.loadingSubject.next(true);
    this.addNotification(`Searching for users matching: ${term}`);
    
    // Use query parameter for server-side filtering
    const params = new HttpParams().set('q', term);
    
    return this.http.get<User[]>(`${this.API_BASE_URL}/users`, { params }).pipe(
      tap(users => this.addNotification(`Found ${users.length} users matching "${term}"`)),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.addNotification(`Error: ${error.message}`);
        return of([]);
      })
    );
  }

  // Server-side filtering for posts search
  searchPosts(term: string): Observable<Post[]> {
    if (!term.trim()) {
      return of([]);
    }
    
    this.loadingSubject.next(true);
    this.addNotification(`Searching for posts matching: ${term}`);
    
    // Use query parameter for server-side filtering
    const params = new HttpParams().set('q', term);
    
    return this.http.get<Post[]>(`${this.API_BASE_URL}/posts`, { params }).pipe(
      tap(posts => this.addNotification(`Found ${posts.length} posts matching "${term}"`)),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.addNotification(`Error: ${error.message}`);
        return of([]);
      })
    );
  }

  // Get user by ID
  getUser(userId: number): Observable<User> {
    this.loadingSubject.next(true);
    
    return this.http.get<User>(`${this.API_BASE_URL}/users/${userId}`).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.addNotification(`Error loading user: ${error.message}`);
        throw error;
      })
    );
  }
  
  // Get posts by user ID using server filtering
  getUserPosts(userId: number): Observable<Post[]> {
    this.loadingSubject.next(true);
    
    // Use query parameter for filtering by userId
    const params = new HttpParams().set('userId', userId.toString());
    
    return this.http.get<Post[]>(`${this.API_BASE_URL}/posts`, { params }).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.addNotification(`Error loading posts: ${error.message}`);
        throw error;
      })
    );
  }

  // Using combineLatest to combine multiple observables with real API and server filtering
  getUserWithPosts(userId: number): Observable<any> {
    const user$ = this.getUser(userId);
    const posts$ = this.getUserPosts(userId);
    
    return combineLatest([user$, posts$]).pipe(
      map(([user, posts]) => ({
        ...user,
        posts
      })),
      tap(result => this.addNotification(`Loaded user ${result.name} with ${result.posts.length} posts`)),
      shareReplay(1), // Cache the result
      catchError(error => {
        this.addNotification(`Error loading user data: ${error.message}`);
        return of({ error: error.message });
      })
    );
  }

  // Using mergeMap for concurrent operations
  uploadFiles(files: string[]): Observable<string> {
    return from(files).pipe(
      mergeMap(file => this.uploadFile(file), 3) // Limit to 3 concurrent uploads
    );
  }

  // Using concatMap for sequential operations
  processItemsSequentially(items: number[]): Observable<string> {
    return from(items).pipe(
      concatMap(item => {
        return timer(500).pipe(
          map(() => `Processed item ${item}`)
        );
      })
    );
  }

  // Add notification using Subject
  addNotification(message: string): void {
    this.notificationsSubject.next(message);
  }

  // Private helper method
  private uploadFile(file: string): Observable<string> {
    // Simulate file upload
    return timer(1000).pipe(
      map(() => `Uploaded ${file}`),
      tap(result => this.addNotification(result))
    );
  }
} 