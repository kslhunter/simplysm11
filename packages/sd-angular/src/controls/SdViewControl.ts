import {ChangeDetectionStrategy, Component, Input} from "@angular/core";

@Component({
  selector: "sd-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      background: white;
    }
  `]
})
export class SdViewControl {
  @Input()
  value?: any;
}
