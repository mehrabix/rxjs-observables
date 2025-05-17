import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <input
        type="text"
        [placeholder]="placeholder"
        [(ngModel)]="searchTerm"
        (input)="onInput()"
        [disabled]="disabled"
      />
      <div *ngIf="loading" class="search-loading">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 100%;
    }
    
    input {
      width: 100%;
      padding: 10px;
      padding-right: 40px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    
    .search-loading {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search...';
  @Input() debounceMs = 300;
  @Input() disabled = false;
  @Input() loading = false;
  @Output() search = new EventEmitter<string>();
  
  searchTerm = '';
  private searchTerms = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    // Set up the debounced search
    this.searchTerms.pipe(
      debounceTime(this.debounceMs),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.search.emit(term);
    });
  }
  
  onInput(): void {
    this.searchTerms.next(this.searchTerm);
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 