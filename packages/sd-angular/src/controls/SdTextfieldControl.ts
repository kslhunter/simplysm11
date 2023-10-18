import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  NgZone,
  Output
} from "@angular/core";
import {
  DateOnly,
  DateTime,
  INotifyPropertyChange,
  NotifyPropertyChange,
  StringUtil,
  Time
} from "@simplysm/sd-core-common";
import {SdInputValidate} from "../utils/SdInputValidate";
import {sdThemes, TSdTheme} from "../commons";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-textfield",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="_contents"
         [style]="inputStyle"
         [class]="('_contents ' + (inputClass ?? '')).trim()"
         [attr.title]="title ?? placeholder">
      <div *ngIf="controlType === 'password'" class="tx-trans-light">
        ****
      </div>
      <ng-container *ngIf="controlType !== 'password'">
        <ng-container *ngIf="controlValue">
          <pre>{{ controlValueText }}</pre>
        </ng-container>
        <ng-container *ngIf="!controlValue">
          <span class="tx-trans-lighter">{{ placeholder }}</span>
        </ng-container>
      </ng-container>
    </div>
    <input *ngIf="!readonly && !disabled"
           [type]="controlType"
           [value]="controlValue"
           [attr.placeholder]="placeholder"
           [required]="required"
           [attr.min]="controlMin"
           [attr.max]="controlMax"
           [attr.minlength]="minlength"
           [attr.maxlength]="maxlength"
           [attr.step]="controlStep"
           [attr.pattern]="pattern"
           [attr.title]="title ?? placeholder"
           (input)="onInput($event)"
           [attr.inputmode]="type === 'number' ? 'numeric' : undefined"
           [style]="inputStyle"
           [class]="inputClass"/>

    <div class="_invalid-indicator"></div>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    :host {
      display: block;
      position: relative;

      > input,
      > ._contents {
        @include form-control-base();

        height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
        overflow: auto;
        width: 100%;

        @media not all and (pointer: coarse) {
          border: 1px solid var(--trans-light);
          border-radius: var(--border-radius-default);
          background: var(--theme-secondary-lightest);
        }
        
        @media all and (pointer: coarse) {
          border: none;
          border-bottom: 2px solid var(--border-color-default);
          background: transparent;
          transition: border-color 0.3s;
          padding: calc(var(--gap-sm) + 1px) 0 calc(var(--gap-sm) - 1px);
        }

        &::-webkit-scrollbar {
          display: none;
        }

        &::-webkit-input-placeholder {
          color: var(--text-trans-lighter);
        }

        &::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        &::-webkit-calendar-picker-indicator {
          cursor: pointer;
          margin: auto;
        }

        &:focus {
          outline: none;
          border-color: var(--theme-primary-default);
        }
      }

      > ._contents {
        display: none;
      }

      &[sd-type=number] {
        > input,
        > ._contents {
          text-align: right;
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          > input,
          > ._contents {
            background: var(--theme-#{$key}-lightest);
          }
        }
      }

      &[sd-size=sm] {
        > input,
        > ._contents {
          padding: var(--gap-xs) var(--gap-sm);
          height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }
      }

      &[sd-size=lg] {
        > input,
        > ._contents {
          padding: var(--gap-default) var(--gap-lg);
          height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);
          min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit) + 2px);

          &[type=color] {
            padding-top: 1px;
            padding-bottom: 1px;
          }
        }
      }

      &[sd-inline=true] {
        display: inline-block;
        vertical-align: top;

        > input,
        > ._contents {
          width: auto;
          vertical-align: top;
        }
      }

      &[sd-inset=true] {
        > ._contents {
          display: block;
        }

        > input {
          position: absolute;
          top: 0;
          left: 0;
        }

        > input,
        > ._contents {
          width: 100%;
          border: none;
          border-radius: 0;
          height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          min-height: calc(var(--gap-sm) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
        }

        &[sd-type=month] {
          > input,
          > ._contents {
            width: 100px;
          }
        }

        &[sd-type=date] {
          > input,
          > ._contents {
            width: 95px;
          }
        }

        &[sd-type=datetime] {
          > input,
          > ._contents {
            width: 170px;
          }
        }

        &[sd-size=sm] {
          > input,
          > ._contents {
            height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            min-height: calc(var(--gap-xs) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        &[sd-size=lg] {
          > input,
          > ._contents {
            height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
            min-height: calc(var(--gap-default) * 2 + var(--font-size-default) * var(--line-height-strip-unit));
          }
        }

        > input:focus {
          outline: 1px solid var(--theme-primary-default);
          outline-offset: -1px;
        }
      }


      &[sd-disabled=true] {
        > ._contents {
          display: block;
          background: var(--theme-grey-lightest);
          color: var(--text-trans-light);
        }

        &[sd-inset=true] {
          > ._contents {
            background: white;
            color: var(--text-trans-default);
          }
        }
      }

      > ._invalid-indicator {
        display: none;
      }

      @media not all and (pointer: coarse) {
        > input:invalid + ._invalid-indicator,
        &[sd-invalid=true] > ._invalid-indicator {
          display: block;
          position: absolute;
          background: var(--theme-danger-default);

          top: var(--gap-xs);
          left: var(--gap-xs);
          border-radius: 100%;
          width: var(--gap-sm);
          height: var(--gap-sm);
        }
      }

      @media all and (pointer: coarse) {
        > input:invalid,
        &[sd-invalid=true] > input {
          border-bottom-color: var(--theme-danger-default);
        }
      }

      &[sd-design=bottom-line] {
        > input,
        > ._contents {
          border: none;
          border-bottom: 2px solid var(--border-color-default);
          background: transparent;
          border-radius: 0;
          transition: border-color 0.3s;

          &:focus {
            border-color: var(--theme-primary-default);
          }

          &:disabled {
            border-bottom-color: transparent;
            color: var(--text-trans-light);
          }
        }
      }
    }
  `]
})
export class SdTextfieldControl implements INotifyPropertyChange, DoCheck {
  private _changeProperties: (keyof this)[] = [];

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["number", "text", "password", "date", "datetime", "datetime-sec", "time", "time-sec", "month", "year", "color", "email", "format"],
    notnull: true
  })
  @HostBinding("attr.sd-type")
  @NotifyPropertyChange()
  public type: "number" | "text" | "password" | "date" | "datetime" | "datetime-sec" | "time" | "time-sec" | "month" | "year" | "color" | "email" | "format" = "text";

  @Input()
  @SdInputValidate(String)
  public placeholder?: string;

  @Input()
  @SdInputValidate(String)
  public title?: string;

  @Input()
  @SdInputValidate([Number, String, DateOnly, DateTime, Time])
  @NotifyPropertyChange()
  public value?: number | string | DateOnly | DateTime | Time;

  @Output()
  public readonly valueChange = new EventEmitter<number | string | DateOnly | DateTime | Time | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-readonly")
  public readonly?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @NotifyPropertyChange()
  public required?: boolean;

  @Input()
  @SdInputValidate([Number, DateOnly])
  @NotifyPropertyChange()
  public min?: number | DateOnly;

  @Input()
  @SdInputValidate([Number, DateOnly])
  @NotifyPropertyChange()
  public max?: number | DateOnly;

  @Input()
  @SdInputValidate(Number)
  @NotifyPropertyChange()
  public minlength?: number;

  @Input()
  @SdInputValidate(Number)
  @NotifyPropertyChange()
  public maxlength?: number;

  /**
   * 10, 1, 0.1, 0.01, 0.01 방식으로 입력
   */
  @Input()
  @SdInputValidate(Number)
  @NotifyPropertyChange()
  public step?: number;

  @Input()
  @SdInputValidate(String)
  public pattern?: string;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate(Function)
  @NotifyPropertyChange()
  public validatorFn?: (value: number | string | DateOnly | DateTime | Time | undefined) => string | undefined;

  @Input()
  @SdInputValidate({
    type: String,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["bottom-line"]
  })
  @HostBinding("attr.sd-design")
  public design?: "bottom-line";

  @Input()
  public inputStyle?: string;

  @Input()
  public inputClass?: string;

  @Input()
  public format?: string;

  @HostBinding("attr.sd-invalid")
  public get isInvalid(): boolean {
    return Boolean(this.errorMessage);
  }

  @Input()
  @SdInputValidate(Boolean)
  @NotifyPropertyChange()
  public useNumberComma = true;

  public controlType = "text";
  public controlValue = "";
  public controlStep: number | string = "any";
  public controlMin?: number | string;
  public controlMax?: number | string;
  public errorMessage = "";
  public controlValueText = "";

  public constructor(private readonly _elRef: ElementRef<HTMLElement>,
                     private readonly _zone: NgZone) {
  }

  public onPropertyChange<K extends keyof this>(propertyName: K, oldValue: this[K], newValue: this[K]): void {
    this._changeProperties.push(propertyName);
  }

  public ngDoCheck(): void {
    const changedProps = this._changeProperties;
    this._changeProperties = [];

    this._reloadControlType(changedProps);
    this._reloadControlValue(changedProps);
    this._reloadControlStep(changedProps);
    this._reloadControlMinMax(changedProps);
    this._reloadErrorMessage(changedProps);
  }

  private _reloadControlType(changedProps: (keyof this)[]): void {
    if (!changedProps.includes("type")) return;

    this.controlType = this.type === "number" ? "text"
      : this.type === "format" ? "text"
        : this.type === "datetime" ? "datetime-local"
          : this.type === "datetime-sec" ? "datetime-local"
            : this.type === "time-sec" ? "time"
              : this.type;
  }

  private _reloadControlValue(changedProps: (keyof this)[]): void {
    if (
      !changedProps.includes("type") &&
      !changedProps.includes("value") &&
      !changedProps.includes("useNumberComma")
    ) return;

    if (this.value == null) {
      this.controlValue = "";
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "number" && typeof this.value === "number") {
      this.controlValue = this.useNumberComma ? this.value.toLocaleString(undefined, {maximumFractionDigits: 10}) : this.value.toString(10);
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "format" && !StringUtil.isNullOrEmpty(this.format) && typeof this.value === "string") {
      const formatItems = this.format.split("|");

      for (const formatItem of formatItems) {
        const fullLength = formatItem.match(/X/g)?.length;
        if (fullLength === this.value.length) {
          let result = "";
          let valCur = 0;
          for (const formatItemChar of formatItem) {
            if (formatItemChar === "X") {
              result += this.value[valCur];
              valCur++;
            }
            else {
              result += formatItemChar;
            }
          }
          this.controlValue = result;
          this.controlValueText = result;
          return;
        }
      }

      this.controlValue = this.value;
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "datetime" && this.value instanceof DateTime) {
      this.controlValue = this.value.toFormatString("yyyy-MM-ddTHH:mm");
      this.controlValueText = this.value.toFormatString("yyyy-MM-dd tt hh:mm");
    }
    else if (this.type === "datetime-sec" && this.value instanceof DateTime) {
      this.controlValue = this.value.toFormatString("yyyy-MM-ddTHH:mm:ss");
      this.controlValueText = this.value.toFormatString("yyyy-MM-dd tt hh:mm:ss");
    }
    else if (this.type === "year" && this.value instanceof DateOnly) {
      this.controlValue = this.value.toFormatString("yyyy");
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "month" && this.value instanceof DateOnly) {
      this.controlValue = this.value.toFormatString("yyyy-MM");
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "date" && this.value instanceof DateOnly) {
      this.controlValue = this.value.toFormatString("yyyy-MM-dd");
      this.controlValueText = this.controlValue;
    }
    else if (this.type === "time" && (this.value instanceof DateTime || this.value instanceof Time)) {
      this.controlValue = this.value.toFormatString("HH:mm");
      this.controlValueText = this.value.toFormatString("tt hh:mm");
    }
    else if (this.type === "time-sec" && (this.value instanceof DateTime || this.value instanceof Time)) {
      this.controlValue = this.value.toFormatString("HH:mm:ss");
      this.controlValueText = this.value.toFormatString("tt hh:mm:ss");
    }
    else if (typeof this.value === "string") {
      this.controlValue = this.value;
      this.controlValueText = this.controlValue;
    }
    else {
      throw new Error(`'sd-textfield'에 대한 'value'가 잘못되었습니다. (입력값: ${this.value.toString()})`);
    }
  }

  private _reloadControlStep(changedProps: (keyof this)[]): void {
    if (
      !changedProps.includes("type") &&
      !changedProps.includes("step")
    ) return;

    if (this.step !== undefined) {
      this.controlStep = this.step;
    }
    else if (this.type === "datetime-sec" || this.type === "time-sec") {
      this.controlStep = 1;
    }
    else {
      this.controlStep = "any";
    }
  }

  private _reloadControlMinMax(changedProps: (keyof this)[]): void {
    if (
      !changedProps.includes("min") &&
      !changedProps.includes("max")
    ) return;

    if (this.min instanceof DateOnly) {
      this.controlMin = this.min.toFormatString("yyyy-MM-dd");
    }
    else {
      this.controlMin = this.min;
    }

    if (this.max instanceof DateOnly) {
      this.controlMax = this.max.toFormatString("yyyy-MM-dd");
    }
    else {
      this.controlMax = this.max;
    }
  }

  private _reloadErrorMessage(changedProps: (keyof this)[]): void {
    if (
      !changedProps.includes("type") &&
      !changedProps.includes("value") &&
      !changedProps.includes("required") &&
      !changedProps.includes("min") &&
      !changedProps.includes("max") &&
      !changedProps.includes("minlength") &&
      !changedProps.includes("maxlength") &&
      !changedProps.includes("validatorFn") &&
      !this.validatorFn
    ) return;

    const errorMessages: string[] = [];
    if (this.value == null) {
      if (this.required) {
        errorMessages.push("값을 입력하세요.");
      }
    }
    else if (this.type === "number") {
      if (typeof this.value !== "number") {
        errorMessages.push("숫자를 입력하세요");
      }
      else {
        if (this.min !== undefined && this.min > this.value) {
          errorMessages.push(`${this.min}보다 크거나 같아야 합니다.`);
        }
        if (this.max !== undefined && this.max < this.value) {
          errorMessages.push(`${this.max}보다 작거나 같아야 합니다.`);
        }
      }
    }
    else if (this.type === "format" && !StringUtil.isNullOrEmpty(this.format)) {
      const formatItems = this.format.split("|");

      if (!formatItems.some((formatItem) => formatItem.match(/X/g)?.length === (this.value as string).length)) {
        errorMessages.push(`문자의 길이가 요구되는 길이와 다릅니다.`);
      }
    }
    else if (["year", "month", "date"].includes(this.type)) {
      if (!(this.value instanceof DateOnly)) {
        errorMessages.push("날짜를 입력하세요");
      }
      else {
        if (this.min instanceof DateOnly && this.min.tick > this.value.tick) {
          errorMessages.push(`${this.min}보다 크거나 같아야 합니다.`);
        }
        if (this.max instanceof DateOnly && this.max.tick < this.value.tick) {
          errorMessages.push(`${this.max}보다 작거나 같아야 합니다.`);
        }
      }
    }
    else if (["datetime", "datetime-sec"].includes(this.type)) {
      if (!(this.value instanceof DateTime)) {
        errorMessages.push("날짜 및 시간을 입력하세요");
      }
    }
    else if (["time", "time-sec"].includes(this.type)) {
      if (!(this.value instanceof Time)) {
        errorMessages.push("시간을 입력하세요");
      }
    }
    else if (this.type === "text") {
      if (this.minlength !== undefined && this.minlength > (this.value as string).length) {
        errorMessages.push(`문자의 길이가 ${this.minlength}보다 길거나 같아야 합니다.`);
      }
      if (this.maxlength !== undefined && this.maxlength > (this.value as string).length) {
        errorMessages.push(`문자의 길이가 ${this.maxlength}보다 짧거나 같아야 합니다.`);
      }
    }

    if (this.validatorFn) {
      const message = this.validatorFn(this.value);
      if (message !== undefined) {
        errorMessages.push(message);
      }
    }

    const fullErrorMessage = errorMessages.join("\r\n");

    if (this.errorMessage !== fullErrorMessage) {
      this.errorMessage = fullErrorMessage;

      this._zone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
          const inputEl = this._elRef.nativeElement.findFirst("input");
          if (inputEl instanceof HTMLInputElement) {
            inputEl.setCustomValidity(fullErrorMessage);
          }
        });
      });
    }
  }

  public onInput(event: Event): void {
    this._zone.run(() => {
      const inputEl = event.target as HTMLInputElement;

      if (inputEl.value === "") {
        this._setValue(undefined);
      }
      else if (this.type === "number") {
        const inputValue = inputEl.value.replace(/[^0-9-.]/g, "");
        if (
          Number.isNaN(Number(inputValue))
          || inputValue.endsWith(".")
          || (
            inputValue.includes(".")
            && Number(inputValue) === 0
          )
        ) {
        }
        else {
          this._setValue(Number(inputValue));
        }
      }
      else if (this.type === "format") {
        const nonFormatChars = this.format?.match(/[^X]/g)?.distinct();
        if (nonFormatChars) {
          this._setValue(inputEl.value.replace(new RegExp(`[${nonFormatChars.map((item) => "\\" + item).join("")}]`, "g"), ""));
        }
        else {
          this._setValue(inputEl.value);
        }
      }
      else if (["year", "month", "date"].includes(this.type)) {
        try {
          this._setValue(DateOnly.parse(inputEl.value));
        }
        catch (err) {
        }
      }
      else if (["datetime", "datetime-sec"].includes(this.type)) {
        try {
          this._setValue(DateTime.parse(inputEl.value));
        }
        catch (err) {
        }
      }
      else if (["time", "time-sec"].includes(this.type)) {
        try {
          this._setValue(Time.parse(inputEl.value));
        }
        catch (err) {
        }
      }
      else {
        this._setValue(inputEl.value);
      }
    });
  }

  private _setValue(newValue: any): void {
    if (this.value !== newValue) {
      if (this.valueChange.observed) {
        this.valueChange.emit(newValue);
      }
      else {
        this.value = newValue;
      }
    }
  }
}
