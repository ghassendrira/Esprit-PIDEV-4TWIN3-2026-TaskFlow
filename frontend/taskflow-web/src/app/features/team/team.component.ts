import { Component } from '@angular/core';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';

@Component({
  selector: 'tf-team',
  standalone: true,
  imports: [TfCardComponent],
  template: `
    <tf-card>
      <h2 style="margin: 0;">Équipe</h2>
      <p class="muted">Module en cours de construction.</p>
    </tf-card>
  `
})
export class TeamComponent {}

