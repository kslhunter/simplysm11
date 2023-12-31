import {PropertyValidate, TPropertyDecoratorReturn, TValidateDef} from "@simplysm/sd-core-common";

export function SdInputValidate(def: TValidateDef<any>): TPropertyDecoratorReturn<any> {
  const fn = (v: any): any => {
    const isForBoolean = (
      def === Boolean
      || (def instanceof Array && def.includes(Boolean))
      || def["type"] === Boolean
      || (def["type"] instanceof Array && def["type"].includes(Boolean))
    );

    if (isForBoolean && v === "") {
      return true;
    }

    const isForNumber = (
      def === Number
      || def["type"] === Number
    );

    if (isForNumber && !Number.isNaN(Number(v))) {
      return Number(v);
    }

    if (v == null) {
      return undefined;
    }

    return v;
  };
  return PropertyValidate(def, fn);
}
