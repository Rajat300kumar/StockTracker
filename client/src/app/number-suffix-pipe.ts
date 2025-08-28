import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberSuffix'
})
export class NumberSuffixPipe implements PipeTransform {

  transform(value: number): string | null {
    if (value === null || value === undefined) return null;

    const abs = Math.abs(value);
    if (abs >= 1.0e+9) {
      return (value / 1.0e+9).toFixed(2) + "B";
    } else if (abs >= 1.0e+6) {
      return (value / 1.0e+6).toFixed(2) + "M";
    } else if (abs >= 1.0e+3) {
      return (value / 1.0e+3).toFixed(2) + "K";
    } else {
      return value.toString();
    }

  }
}
