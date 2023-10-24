import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DoCheck,
  EventEmitter,
  inject,
  Injector,
  Input,
  Output,
  TemplateRef,
  Type
} from "@angular/core";
import {ISharedDataBase} from "../../providers/SdSharedDataProvider";
import {SdModalBase, SdModalProvider} from "../../providers/SdModalProvider";
import {SdNgHelper} from "../../utils/SdNgHelper";
import {coercionBoolean, TSdFnInfo} from "../../utils/commons";
import {SdItemOfTemplateContext, SdItemOfTemplateDirective} from "../../directives/SdItemOfTemplateDirective";

@Component({
  selector: "sd-shared-data-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-select [value]="value"
               (valueChange)="onValueChange($event)"
               [disabled]="disabled"
               [required]="required"
               [inset]="inset"
               [inline]="inline"
               [size]="size"
               [items]="rootDisplayItems"
               [trackByFn]="trackByFn"
               [selectMode]="selectMode"
               [contentClass]="selectClass"
               [multiSelectionDisplayDirection]="multiSelectionDisplayDirection"
               [getChildrenFn]="parentKeyProp ? [getChildrenFn, [this.itemByParentKeyMap, 'all'], [this.displayOrderKeyProp]] : undefined">
      <ng-template #header>
        <sd-dock-container>
          <sd-dock class="bdb bdb-trans-default" *ngIf="getSearchTextFn">
            <sd-textfield type="text" [(value)]="searchText" placeholder="검색어" inset></sd-textfield>
          </sd-dock>

          <sd-pane class="p-xs-default bdb bdb-trans-default" *ngIf="modalType">
            <sd-anchor (click)="onDetailButtonClick()">자세히...</sd-anchor>
          </sd-pane>
        </sd-dock-container>
      </ng-template>

      <ng-template #before>
        <sd-select-item *ngIf="(!required && selectMode === 'single') || (useUndefined && selectMode === 'multi')">
          <span class="tx-theme-grey-default">미지정</span>
        </sd-select-item>
      </ng-template>

      <ng-template [itemOf]="items" let-item="item" let-index="index" let-depth="depth">
        <sd-select-item [value]="item.__valueKey"
                        *ngIf="getItemSelectable(index, item, depth)"
                        [style.display]="!getItemVisible(index, item, depth) ? 'none' : undefined">
          <span [style.text-decoration]="getIsHiddenFn[0](index, item) ? 'line-through' : undefined">
            <ng-template [ngTemplateOutlet]="itemTemplateRef"
                         [ngTemplateOutletContext]="{item: item, index: index, depth: depth}"></ng-template>
          </span>
        </sd-select-item>
      </ng-template>
    </sd-select>`
})
export class SdSharedDataSelectControl<T extends ISharedDataBase<string | number>> implements DoCheck {
  @Input({required: true})
  items: T[] = [];

  @Input()
  value?: T["__valueKey"] | T["__valueKey"][];

  @Output()
  valueChange = new EventEmitter<(this["selectMode"] extends "multi" ? (T["__valueKey"][]) : T["__valueKey"]) | undefined>();

  @Input({transform: coercionBoolean})
  disabled = false;

  @Input({transform: coercionBoolean})
  required = false;

  @Input({transform: coercionBoolean})
  useUndefined = false;

  @Input({transform: coercionBoolean})
  inset = false;

  @Input({transform: coercionBoolean})
  inline = false;

  @Input()
  size?: "sm" | "lg";

  @Input()
  selectMode: "single" | "multi" = "single";

  @Input()
  filterFn?: TSdFnInfo<(index: number, item: T) => boolean>;

  @ContentChild(SdItemOfTemplateDirective, {static: true, read: TemplateRef})
  itemTemplateRef: TemplateRef<SdItemOfTemplateContext<T>> | null = null;

  @Input()
  modalInputParam?: Record<string, ISharedDataModalInputParam>;

  @Input()
  modalType?: Type<SdModalBase<ISharedDataModalInputParam, ISharedDataModalOutputResult>>;

  @Input()
  modalHeader?: string;

  @Input()
  selectClass?: string;

  @Input()
  multiSelectionDisplayDirection?: "vertical" | "horizontal";

  @Input()
  trackByFn: TSdFnInfo<(index: number, item: T) => (string | number)> = [(index, item) => item.__valueKey];

  @Input()
  getIsHiddenFn: TSdFnInfo<(index: number, item: T) => boolean> = [(index, item) => item.__isHidden];

  @Input()
  getSearchTextFn: TSdFnInfo<(index: number, item: T) => string> = [(index, item) => item.__searchText];

  @Input()
  parentKeyProp?: string;

  @Input()
  displayOrderKeyProp?: string;

  searchText?: string;

  itemByParentKeyMap?: Map<T["__valueKey"] | undefined, any>;
  rootDisplayItems: T[] = [];

  #cdr = inject(ChangeDetectorRef);
  #sdModal = inject(SdModalProvider);

  // 선택될 수 있는것들 (검색어에 의해 숨겨진것도 포함)
  getItemSelectable(index: number, item: any, depth: number): boolean {
    return (this.parentKeyProp === undefined || depth !== 0 || item[this.parentKeyProp] === undefined);
  }

  // 화면 목록에서 뿌려질것 (검색어에 의해 숨겨진것 제외)
  getItemVisible(index: number, item: any, depth: number): boolean {
    return (
        this.#isIncludeSearchText(index, item, depth)
        && !this.getIsHiddenFn[0](index, item)
      )
      || this.value === this.trackByFn[0](index, item) as any
      || (
        this.value instanceof Array
        && this.value.includes(this.trackByFn[0](index, item) as any)
      );
  }

  #isIncludeSearchText(index: number, item: any, depth: number): boolean {
    if (this.getSearchTextFn[0](index, item).toLowerCase().includes(this.searchText?.toLowerCase() ?? "")) {
      return true;
    }

    if (this.parentKeyProp !== undefined) {
      const children = this.getChildrenFn(index, item, item.depth);
      for (let i = 0; i < children.length; i++) {
        if (this.#isIncludeSearchText(i, children[i], item.depth + 1)) {
          return true;
        }
      }
    }

    return false;
  }

  getChildrenFn = (index: number, item: ISharedDataBase<string | number>, depth: number): any[] => {
    let result = this.itemByParentKeyMap?.get(item.__valueKey) ?? [];

    if (this.displayOrderKeyProp !== undefined) {
      result = result.orderBy((item1) => item1[this.displayOrderKeyProp!]);
    }

    return result;
  };

  #sdNgHelper = new SdNgHelper(inject(Injector));

  ngDoCheck(): void {
    //-- rootDisplayItems
    this.#sdNgHelper.doCheck(run => {
      run({
        items: [this.items, "all"],
        filterFn: [this.filterFn],
        parentKeyProp: [this.parentKeyProp],
        displayOrderKeyProp: [this.displayOrderKeyProp]
      }, () => {
        let result = this.items.filter((item, index) => (
          (!this.filterFn?.[0] || this.filterFn[0](index, item))
          && (this.parentKeyProp === undefined || item[this.parentKeyProp] === undefined)
        ));

        if (this.displayOrderKeyProp !== undefined) {
          result = result.orderBy((item) => item[this.displayOrderKeyProp!]);
        }

        this.rootDisplayItems = result;
      });

      //-- itemByParentKeyMap
      run({
        items: [this.items, "all"],
        parentKeyProp: [this.parentKeyProp]
      }, () => {
        if (this.parentKeyProp !== undefined) {
          this.itemByParentKeyMap = this.items
            .groupBy((item) => item[this.parentKeyProp!])
            .toMap((item) => item.key, (item1) => item1.values);
        }
        else {
          this.itemByParentKeyMap = undefined;
        }
      });
    });
  }

  onValueChange(value: any | any[]): void {
    if (this.valueChange.observed) {
      this.valueChange.emit(value);
    }
    else {
      this.value = value;
    }
  }

  async onDetailButtonClick(): Promise<void> {
    if (this.modalType) {
      const result = await this.#sdModal.showAsync(this.modalType, this.modalHeader ?? "자세히...", {
        selectMode: this.selectMode,
        selectedItemKeys: (this.selectMode === "multi" ? (this.value as any[]) : [this.value]).filterExists(),
        ...this.modalInputParam
      }, {key: "sd-shared-data-select-detail-modal"});

      if (result) {
        const newValue = this.selectMode === "multi" ? result.selectedItemKeys : result.selectedItemKeys[0];

        if (this.valueChange.observed) {
          this.valueChange.emit(newValue);
        }
        else {
          this.value = newValue;
        }
      }
      this.#cdr.markForCheck();
    }
  }
}


export interface ISharedDataModalInputParam {
  selectMode?: "single" | "multi";
  selectedItemKeys?: any[];
}

export interface ISharedDataModalOutputResult {
  selectedItemKeys: any[];
}