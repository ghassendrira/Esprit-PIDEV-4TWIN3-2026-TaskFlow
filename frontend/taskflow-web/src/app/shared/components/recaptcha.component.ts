import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

declare const grecaptcha: any;

/**
 * Reusable reCAPTCHA v2 checkbox component.
 *
 * Usage:
 *   <app-recaptcha (resolved)="onCaptcha($event)" (expired)="onExpired()"></app-recaptcha>
 */
@Component({
  selector: 'app-recaptcha',
  standalone: true,
  template: `<div #recaptchaContainer></div>`,
  styles: [
    `
      :host {
        display: flex;
        justify-content: center;
      }
    `,
  ],
})
export class RecaptchaComponent implements OnInit, OnDestroy {
  /** Google reCAPTCHA site key — defaults to the public test key. */
  @Input() siteKey = '6LcB17osAAAAAG1rmNGuSnn-mleaokZ298W1HvRK';

  /** Emitted with the reCAPTCHA response token when the user solves the challenge. */
  @Output() resolved = new EventEmitter<string>();

  /** Emitted when the reCAPTCHA token expires (user waited too long). */
  @Output() expired = new EventEmitter<void>();

  @ViewChild('recaptchaContainer', { static: true })
  container!: ElementRef<HTMLDivElement>;

  private zone = inject(NgZone);
  private widgetId: number | null = null;
  private checkInterval: any = null;

  ngOnInit(): void {
    this.renderWhenReady();
  }

  ngOnDestroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Reset the widget so the user can solve the captcha again.
   * Call this after a form submission error or on re-submit.
   */
  reset(): void {
    if (this.widgetId !== null && typeof grecaptcha !== 'undefined') {
      grecaptcha.reset(this.widgetId);
    }
  }

  /** Wait for the grecaptcha global to be available, then render. */
  private renderWhenReady(): void {
    if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
      this.renderWidget();
      return;
    }

    // Poll until the library is loaded (typically < 2 seconds)
    this.checkInterval = setInterval(() => {
      if (typeof grecaptcha !== 'undefined' && grecaptcha.render) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
        this.renderWidget();
      }
    }, 200);
  }

  private renderWidget(): void {
    this.zone.runOutsideAngular(() => {
      this.widgetId = grecaptcha.render(this.container.nativeElement, {
        sitekey: this.siteKey,
        callback: (token: string) => {
          this.zone.run(() => this.resolved.emit(token));
        },
        'expired-callback': () => {
          this.zone.run(() => this.expired.emit());
        },
      });
    });
  }
}
