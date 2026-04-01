import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  templateUrl: './input.component.html',
})
export class InputComponent {
  @Input() label!: string;
  @Input() type: string = 'text';
}
