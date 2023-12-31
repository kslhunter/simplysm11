import {ApplicationRef, createComponent, inject, Injectable, Type} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdPrintProvider {
  #appRef = inject(ApplicationRef);

  public async printAsync<I>(printType: Type<SdPrintTemplateBase<I>>,
                             param: I,
                             options?: { margin?: string; size?: string }): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      try {
        const compRef = createComponent(printType, {
          environmentInjector: this.#appRef.injector
        });
        const compEl = compRef.location.nativeElement;
        compEl.classList.add("_sd-print-template");
        document.body.appendChild(compEl);

        const styleEl = document.createElement("style");
        styleEl.innerHTML = `   
  @page { size: ${options?.size ?? "auto"}; margin: ${options?.margin ?? "0"}; }
  @media print
  {
      html, body { -webkit-print-color-adjust: exact; background: white; }
      body > * { display: none !important; }
      body > ._sd-print-template { display: block !important; }
  }`;
        document.head.appendChild(styleEl);

        await compRef.instance.sdOnOpen(param);

        this.#appRef.attachView(compRef.hostView);
        setTimeout(() => {
          window.print();
          compEl.remove();
          styleEl.remove();
          resolve();
        }, 300);
      }
      catch (err) {
        reject(err);
      }
    });
  }
}

export abstract class SdPrintTemplateBase<I> {
  public abstract sdOnOpen(param: I): void | Promise<void>;
}
