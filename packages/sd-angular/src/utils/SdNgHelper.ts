import {ObjectUtil} from "@simplysm/sd-core-common";
import {ChangeDetectorRef, Injector, NgZone} from "@angular/core";

export class SdNgHelper {
  private prevData: Record<string, any> = {};
  private reqNumRecord: Record<string, number> = {};

  #cdr: ChangeDetectorRef;
  #ngZone: NgZone;

  constructor(injector: Injector) {
    this.#cdr = injector.get(ChangeDetectorRef);
    this.#ngZone = injector.get(NgZone);
  }

  doCheck(fn: (run: <R extends void | Promise<void>>(checkData: Record<string, [any, ("one" | "all")?]>, cb: () => R) => R | void, changeData: Record<string, any>) => void | Promise<void>) {
    this.#doCheck(fn, false);
  }

  doCheckOutside(fn: (run: <R extends void | Promise<void>>(checkData: Record<string, [any, ("one" | "all")?]>, cb: () => R) => R | void, changeData: Record<string, any>) => void | Promise<void>) {
    this.#doCheck(fn, true);
  }

  #doCheck(fn: (run: <R extends void | Promise<void>>(checkData: Record<string, [any, ("one" | "all")?]>, cb: () => R) => R | void, changeData: Record<string, any>) => void | Promise<void>, outside: boolean) {
    const changeData: Record<string, any> = {};

    const runFn = <R extends void | Promise<void>>(checkData: Record<string, [any, ("one" | "all")?]>, cb: () => R): R | void => {
      let changed = false;
      for (const checkKey of Object.keys(checkData)) {
        const [checkVal, method] = checkData[checkKey];
        if (Object.keys(changeData).includes(checkKey)) {
          changed = true;
          continue;
        }

        if (method === "all") {
          if (!ObjectUtil.equal(this.prevData[checkKey], checkVal)) {
            changeData[checkKey] = ObjectUtil.clone(checkVal);
            changed = true;
          }
        }
        else if (method == "one") {
          if (!ObjectUtil.equal(this.prevData[checkKey], checkVal, {onlyOneDepth: true})) {
            changeData[checkKey] = ObjectUtil.clone(checkVal, {onlyOneDepth: true});
            changed = true;
          }
        }
        else {
          if (this.prevData[checkKey] !== checkVal) {
            changeData[checkKey] = checkVal;
            changed = true;
          }
        }
      }

      if (changed) {
        return cb();
      }
    };

    if (outside) {
      this.runOutsideOnce("__sdDoCheck__", async () => {
        await fn(runFn, changeData);
        if (Object.keys(changeData).length > 0) {
          Object.assign(this.prevData, changeData);
        }
      });
    }
    else {
      const promiseOrVoid = fn(runFn, changeData);

      if (promiseOrVoid instanceof Promise) {
        this.runOutsideOnce("__sdDoCheck__", async () => {
          await fn(runFn, changeData);
          if (Object.keys(changeData).length > 0) {
            Object.assign(this.prevData, changeData);

            this.#ngZone.run(() => {
              this.#cdr.markForCheck();
            });
          }
        });

        /*promiseOrVoid.then(() => {
          if (Object.keys(changeData).length > 0) {
            Object.assign(this.prevData, changeData);
            this.#cdr.markForCheck();
          }
        }).catch(err => {
          throw err;
        });*/
      }
      else {
        if (Object.keys(changeData).length > 0) {
          Object.assign(this.prevData, changeData);
          this.#cdr.markForCheck();
        }
      }
    }
  }

  runOutsideOnce(key: string, fn: () => void | Promise<void>): void {
    this.#ngZone.runOutsideAngular(() => {
      if (this.reqNumRecord[key] != null) {
        cancelAnimationFrame(this.reqNumRecord[key]);
      }
      this.reqNumRecord[key] = requestAnimationFrame(async () => {
        await fn();
      });
    });
  }
}