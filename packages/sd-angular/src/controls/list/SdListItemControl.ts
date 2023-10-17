import {
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  EventEmitter,
  forwardRef,
  HostBinding,
  Input,
  Output,
  QueryList
} from "@angular/core";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {SdInputValidate} from "../../utils/SdInputValidate";
import {SdListControl} from "./SdListControl";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {faChevronDown} from "@fortawesome/pro-light-svg-icons/faChevronDown";

@Component({
  selector: "sd-list-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [attr.class]="'_content ' + contentClass"
         [attr.style]="safeHtml(contentStyle)"
         (click)="onContentClick()">
      <div class="flex-row flex-gap-xs">
        <fa-icon class="_selected-icon" *ngIf="selectedIcon && !hasChildren" [icon]="selectedIcon"
                 [fixedWidth]="true"></fa-icon>
        <div style="flex-grow: 1">
          <ng-content></ng-content>
        </div>

        <sd-collapse-icon [open]="open" *ngIf="hasChildren && layout==='accordion'"
                          [icon]="icons.falChevronDown"
                          style="float: right"></sd-collapse-icon>
      </div>
    </div>
    <sd-collapse *ngIf="hasChildren"
                 class="_child"
                 [open]="layout === 'flat' || open">
      <ng-content select="sd-list"></ng-content>
    </sd-collapse>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    
    :host {
      > ._content {
        padding: var(--gap-sm) var(--gap-default);
        cursor: pointer;

        @media all and (hover: none) and (pointer: coarse) {
          @include mobile-active-effect(true);
        }

        > .flex-row > ._selected-icon {
          color: var(--text-trans-lightest);
        }
      }

      &[sd-layout=accordion] {
        > ._content {
          &:hover {
            background: var(--trans-light);
          }

          &:active {
            background: var(--trans-dark);
          }
        }

        ::ng-deep ._child > ._content > sd-list {
          padding: var(--gap-sm) 0;
          background: var(--trans-dark);
        }
      }

      &[sd-layout=flat] {
        > ._content {
          display: none;
        }

        &[sd-has-children=true] {
          @media all and (hover: none) and (pointer: coarse) {
            @include mobile-active-effect(false);
          }
          
          > ._content {
            display: block;
            background: transparent;
            cursor: default;
            font-size: var(--font-size-sm);
            opacity: .7;
            margin-top: var(--gap-sm);
          }
        }
      }

      &[sd-selected=true] {
        > ._content {
          color: var(--theme-primary-default);
          font-weight: bold;

          &:hover,
          &:active {
            color: var(--theme-primary-default);
            font-weight: bold;
          }
        }
      }

      &[sd-has-selected-icon=true][sd-selected=true] {
        > ._content {
          background: transparent;
          color: var(--text-trans-default);

          > .flex-row > ._selected-icon {
            color: var(--theme-primary-default);
          }

          &:hover {
            background: var(--trans-light);
          }

          &:active {
            background: var(--trans-dark);
          }
        }
      }
    }
  `]
})
export class SdListItemControl {
  public icons = {
    falChevronDown: faChevronDown
  };

  @Input()
  @SdInputValidate(String)
  public contentStyle?: string;

  @Input()
  @SdInputValidate(String)
  public contentClass?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["accordion", "flat"],
    notnull: true
  })
  @HostBinding("attr.sd-layout")
  public layout: "accordion" | "flat" = "accordion";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Output()
  public readonly openChange = new EventEmitter<boolean | undefined>();

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-selected")
  public selected?: boolean;

  @Input()
  public selectedIcon?: IconProp;

  @HostBinding("attr.sd-has-selected-icon")
  public get hasSelectedIcon(): boolean {
    return Boolean(this.selectedIcon);
  }

  @HostBinding("attr.sd-has-children")
  public get hasChildren(): boolean {
    return this.listControls !== undefined && this.listControls.length > 0;
  }

  @ContentChildren(forwardRef(() => SdListControl))
  public listControls?: QueryList<SdListControl>;


  public constructor(private readonly _sanitization: DomSanitizer) {
  }

  public safeHtml(value?: string): SafeHtml | undefined {
    return value !== undefined ? this._sanitization.bypassSecurityTrustStyle(value) : undefined;
  }

  public onContentClick(): void {
    if (this.openChange.observed) {
      this.openChange.emit(!this.open);
    }
    else {
      this.open = !this.open;
    }
  }
}