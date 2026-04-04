import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="page"
      [class.page--with-bg]="hasBg"
      [class.page--with-solid-card]="hasSolidCard"
      [style]="pageStyle"
    >
      <ng-content></ng-content>
    </div>
  `,
})
export class PageShellComponent {
  @Input() pageStyle?: Record<string, string> | null;
  @Input() hasBg = false;
  @Input() hasSolidCard = false;
}
