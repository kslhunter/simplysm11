import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output,
  TemplateRef, ViewEncapsulation
} from "@angular/core";
import {StringUtil} from "@simplysm/sd-core-common";
import {IconProp} from "@fortawesome/fontawesome-svg-core";
import {ISharedDataBase} from "../providers/SdSharedDataProvider";
import {coercionBoolean, getSdFnCheckData, TSdFnInfo} from "../utils/commons";
import {SdItemOfTemplateContext, SdItemOfTemplateDirective} from "../directives/SdItemOfTemplateDirective";
import {SdNgHelper} from "../utils/SdNgHelper";
import {SdBusyContainerControl} from "./SdBusyContainerControl";
import {SdDockContainerControl} from "./SdDockContainerControl";
import {SdDockControl} from "./SdDockControl";
import {NgTemplateOutlet} from "@angular/common";
import {SdTextfieldControl} from "./SdTextfieldControl";
import {SdListControl} from "./SdListControl";
import {SdPaneControl} from "./SdPaneControl";
import {SdListItemControl} from "./SdListItemControl";
import {SdSelectItemControl} from "./SdSelectItemControl";

@Component({
  selector: "sd-shared-data-select-view",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdBusyContainerControl,
    SdDockContainerControl,
    SdDockControl,
    NgTemplateOutlet,
    SdTextfieldControl,
    SdListControl,
    SdPaneControl,
    SdListItemControl,
    SdSelectItemControl
  ],
  template: `
    <sd-busy-container [busy]="busyCount > 0">
      <sd-dock-container>
        @if (headerTemplateRef) {
          <sd-dock class="pb-default">
            <ng-template [ngTemplateOutlet]="headerTemplateRef"></ng-template>
          </sd-dock>
        }

        <sd-dock class="pb-default">
          @if (!filterTemplateRef) {
            <sd-textfield type="text" placeholder="검색어" [(value)]="searchText"/>
          } @else {
            <ng-template [ngTemplateOutlet]="filterTemplateRef"/>
          }
        </sd-dock>

        <sd-pane>
          <sd-list inset>
            @if (useUndefined) {
              <sd-list-item [selected]="selectedItem === undefined"
                            (click)="onSelectedItemChange(undefined)"
                            [selectedIcon]="selectedIcon">
                @if (undefinedTemplateRef) {
                  <ng-template [ngTemplateOutlet]="undefinedTemplateRef"/>
                } @else {
                  <span class="tx-theme-grey-default">미지정</span>
                }
              </sd-list-item>
            }
            @for (item of filteredItems; let index = $index; track trackByFn(index, item)) {
              <sd-list-item [selected]="item === selectedItem"
                            (click)="selectedItem === item ? onSelectedItemChange(undefined) : onSelectedItemChange(item)"
                            [selectedIcon]="selectedIcon">
                <ng-template [ngTemplateOutlet]="itemTemplateRef ?? null"
                             [ngTemplateOutletContext]="{$implicit: item, item: item, index: index, depth: 0}"></ng-template>
              </sd-list-item>
            }
          </sd-list>
        </sd-pane>
      </sd-dock-container>
    </sd-busy-container>`
})
export class SdSharedDataSelectViewControl<T extends ISharedDataBase<string | number>> implements DoCheck {
  @Input() selectedItem?: T;
  @Output() selectedItemChange = new EventEmitter<T>();

  @Input({required: true}) items: T[] = [];
  @Input() selectedIcon?: IconProp;
  @Input({transform: coercionBoolean}) useUndefined = false;
  @Input() filterFn?: TSdFnInfo<(index: number, item: T) => boolean>;

  @ContentChild("headerTemplate", {static: true}) headerTemplateRef?: TemplateRef<void>;
  @ContentChild("filterTemplate", {static: true}) filterTemplateRef?: TemplateRef<void>;

  @ContentChild(SdItemOfTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef?: TemplateRef<SdItemOfTemplateContext<T>>;

  @ContentChild("undefinedTemplate", {static: true, read: TemplateRef}) undefinedTemplateRef?: TemplateRef<void>;

  trackByFn = (index: number, item: T): (string | number) => item.__valueKey;

  busyCount = 0;
  searchText?: string;
  filteredItems: any[] = [];

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    this.#sdNgHelper.doCheck(run => {

      run({
        items: [this.items, "all"]
      }, () => {
        this.selectedItem = this.items.single((item) => item.__valueKey === this.selectedItem?.__valueKey);
      });

      run({
        items: [this.items, "all"],
        searchText: [this.searchText],
        ...getSdFnCheckData("filterFn", this.filterFn)
      }, () => {
        let result = this.items.filter((item) => !item.__isHidden);

        if (!StringUtil.isNullOrEmpty(this.searchText)) {
          result = result.filter((item) => item.__searchText.includes(this.searchText!));
        }

        if (this.filterFn?.[0]) {
          result = result.filter((item, i) => this.filterFn![0](i, item));
        }

        this.filteredItems = result;
      });
    });
  }

  onSelectedItemChange(item: T | undefined) {
    if (this.selectedItemChange.observed) {
      this.selectedItemChange.emit(item);
    }
    else {
      this.selectedItem = item;
    }
  }
}

