/**
  Calendar code extracted from https://github.com/phensley/cldr-engine/

  Copyright 2018-present Patrick Hensley

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

 */

import { ZoneInfo } from '@phensley/timezone';
import { dateFields, DateField, DayOfWeek } from './fields';
import { CalendarConstants, ConstantsDesc } from './constants';
import { substituteZoneAlias, zoneInfoFromUTC } from './timezone';

// Indicates a null field to support computing on demand
const NULL = Number.MAX_SAFE_INTEGER;

const { floor } = Math;

export type CalendarFromUnixEpoch<T> = (epoch: number, zoneId: string, firstDay: number, minDays: number) => T;

/**
 * Base class for dates in supported calendars.
 *
 * @alpha
 */
export abstract class CalendarDate {
  protected _fields: number[] = dateFields();
  protected _zoneInfo!: ZoneInfo;

  /**
   * Minimal fields required to construct any calendar date.
   */
  protected constructor(protected readonly _firstDay: number, protected readonly _minDays: number) {
    // Compute week fields on demand.
    this._fields[DateField.WEEK_OF_YEAR] = NULL;
    this._fields[DateField.YEAR_WOY] = NULL;
  }

  /**
   * Unix epoch with no timezone offset.
   */
  unixEpoch(): number {
    return this._fields[DateField.LOCAL_MILLIS] - this._zoneInfo.offset;
  }

  firstDayOfWeek(): number {
    return this._firstDay;
  }

  minDaysInFirstWeek(): number {
    return this._minDays;
  }

  /**
   * Returns a floating point number representing the real Julian Day, UTC.
   */
  julianDay(): number {
    const ms = (this._fields[DateField.MILLIS_IN_DAY] - this._zoneInfo.offset) / CalendarConstants.ONE_DAY_MS;
    return this._fields[DateField.JULIAN_DAY] - 0.5 + ms;
  }

  /**
   * CLDR's modified Julian day used as the basis for all date calculations.
   */
  modifiedJulianDay(): number {
    return this._fields[DateField.JULIAN_DAY];
  }

  era(): number {
    return this._fields[DateField.ERA];
  }

  extendedYear(): number {
    return this._fields[DateField.EXTENDED_YEAR];
  }

  year(): number {
    return this._fields[DateField.YEAR];
  }

  relatedYear(): number {
    return this._fields[DateField.EXTENDED_YEAR];
  }

  yearOfWeekOfYear(): number {
    this.computeWeekFields();
    return this._fields[DateField.YEAR_WOY];
  }

  weekOfYear(): number {
    this.computeWeekFields();
    return this._fields[DateField.WEEK_OF_YEAR];
  }

  yearOfWeekOfYearISO(): number {
    this.computeWeekFields();
    return this._fields[DateField.ISO_YEAR_WOY];
  }

  weekOfYearISO(): number {
    this.computeWeekFields();
    return this._fields[DateField.ISO_WEEK_OF_YEAR];
  }

  /**
   * Ordinal month, one-based, e.g. Gregorian JANUARY = 1.
   */
  month(): number {
    return this._fields[DateField.MONTH];
  }

  /**
   * Returns the week of the month computed using the locale's 'first day
   * of week' and 'minimal days in first week' where applicable.
   *
   * For example, for the United States, weeks start on Sunday.
   * Saturday 9/1/2018 would be in week 1, and Sunday 9/2/2018 would
   * begin week 2.
   *
   *         September
   *   Su Mo Tu We Th Fr Sa
   *                      1
   *    2  3  4  5  6  7  8
   *    9 10 11 12 13 14 15
   *   16 17 18 19 20 21 22
   *   23 24 25 26 27 28 29
   *   30
   */
  weekOfMonth(): number {
    this.computeWeekFields();
    return this._fields[DateField.WEEK_OF_MONTH];
  }

  dayOfYear(): number {
    return this._fields[DateField.DAY_OF_YEAR];
  }

  /**
   * Day of the week. 1 = SUNDAY, 2 = MONDAY, ..., 7 = SATURDAY
   */
  dayOfWeek(): number {
    return this._fields[DateField.DAY_OF_WEEK];
  }

  /**
   * Ordinal day of the week. 1 if this is the 1st day of the week,
   * 2 if the 2nd, etc. Depends on the local starting day of the week.
   */
  ordinalDayOfWeek(): number {
    const weekday = this.dayOfWeek();
    const firstDay = this.firstDayOfWeek();
    return ((7 - firstDay + weekday) % 7) + 1;
  }

  /**
   * Ordinal number indicating the day of the week in the current month.
   * The result of this method can be used to format messages like
   * "2nd Sunday in August".
   */
  dayOfWeekInMonth(): number {
    this.computeWeekFields();
    return this._fields[DateField.DAY_OF_WEEK_IN_MONTH];
  }

  dayOfMonth(): number {
    return this._fields[DateField.DAY_OF_MONTH];
  }

  isAM(): boolean {
    return this._fields[DateField.AM_PM] === 0;
  }

  /**
   * Indicates the hour of the morning or afternoon, used for the 12-hour
   * clock (0 - 11). Noon and midnight are 0, not 12.
   */
  hour(): number {
    return this._fields[DateField.HOUR];
  }

  /**
   * Indicates the hour of the day, used for the 24-hour clock (0 - 23).
   * Noon is 12 and midnight is 0.
   */
  hourOfDay(): number {
    return this._fields[DateField.HOUR_OF_DAY];
  }

  /**
   * Indicates the minute of the hour (0 - 59).
   */
  minute(): number {
    return this._fields[DateField.MINUTE];
  }

  /**
   * Indicates the second of the minute (0 - 59).
   */
  second(): number {
    return this._fields[DateField.SECOND];
  }

  milliseconds(): number {
    return this._fields[DateField.MILLIS];
  }

  millisecondsInDay(): number {
    return this._fields[DateField.MILLIS_IN_DAY];
  }

  timeZoneId(): string {
    return this._zoneInfo.zoneid;
  }

  timeZoneAbbr(): string {
    return this._zoneInfo.abbr;
  }

  timeZoneOffset(): number {
    return this._zoneInfo.offset;
  }

  isLeapYear(): boolean {
    return this._fields[DateField.IS_LEAP] === 1;
  }

  isDaylightSavings(): boolean {
    return this._zoneInfo.dst === 1;
  }

  abstract withZone(zoneId: string): CalendarDate;

  protected abstract initFields(f: number[]): void;
  protected abstract monthCount(): number;
  protected abstract daysInMonth(y: number, m: number): number;
  protected abstract daysInYear(y: number): number;
  protected abstract monthStart(eyear: number, month: number, useMonth: boolean): number;

  protected initFromUnixEpoch(ms: number, zoneId: string): void {
    zoneId = substituteZoneAlias(zoneId);
    this._zoneInfo = zoneInfoFromUTC(zoneId, ms);
    jdFromUnixEpoch(ms + this._zoneInfo.offset, this._fields);
    computeBaseFields(this._fields);
  }

  protected initFromJD(jd: number, msDay: number, zoneId: string): void {
    const unixEpoch = unixEpochFromJD(jd, msDay);
    this.initFromUnixEpoch(unixEpoch, zoneId);
  }

  // protected _toString(type: string, year?: string): string {
  //   return `${type} ${year || this.year()}-${zeropad(this.month(), 2)}-${zeropad(this.dayOfMonth(), 2)} ` +
  //     `${zeropad(this.hourOfDay(), 2)}:${zeropad(this.minute(), 2)}:${zeropad(this.second(), 2)}` +
  //     `.${zeropad(this.milliseconds(), 3)} ${this._zoneInfo.zoneid}`;
  // }

  /**
   * Compute WEEK_OF_YEAR and YEAR_WOY on demand.
   */
  protected computeWeekFields(): void {
    const f = this._fields;
    if (f[DateField.YEAR_WOY] !== NULL) {
      return;
    }

    const dow = f[DateField.DAY_OF_WEEK];
    const dom = f[DateField.DAY_OF_MONTH];
    const doy = f[DateField.DAY_OF_YEAR];
    f[DateField.WEEK_OF_MONTH] = this.weekNumber(this._firstDay, this._minDays, dom, dom, dow);
    f[DateField.DAY_OF_WEEK_IN_MONTH] = (((dom - 1) / 7) | 0) + 1;

    // compute US
    this._computeWeekFields(DateField.WEEK_OF_YEAR, DateField.YEAR_WOY, this._firstDay, this._minDays, dow, dom, doy);

    // compute ISO
    this._computeWeekFields(DateField.ISO_WEEK_OF_YEAR, DateField.ISO_YEAR_WOY, 2, 4, dow, dom, doy);
  }

  protected _computeWeekFields(
    woyfield: number,
    ywoyfield: number,
    firstDay: number,
    minDays: number,
    dow: number,
    _dom: number,
    doy: number
  ): void {
    const f = this._fields;
    const eyear = f[DateField.EXTENDED_YEAR];

    let ywoy = eyear;
    const rdow = (dow + 7 - firstDay) % 7;
    const rdowJan1 = (dow - doy + 7001 - firstDay) % 7;
    let woy = floor((doy - 1 + rdowJan1) / 7);
    if (7 - rdowJan1 >= minDays) {
      woy++;
    }

    if (woy === 0) {
      const prevDay = doy + this.yearLength(eyear - 1);
      woy = this.weekNumber(firstDay, minDays, prevDay, prevDay, dow);
      ywoy--;
    } else {
      const lastDoy = this.yearLength(eyear);
      if (doy >= lastDoy - 5) {
        let lastRdow = (rdow + lastDoy - doy) % 7;
        if (lastRdow < 0) {
          lastRdow += 7;
        }
        if (6 - lastRdow >= minDays && doy + 7 - rdow > lastDoy) {
          woy = 1;
          ywoy++;
        }
      }
    }

    f[woyfield] = woy;
    f[ywoyfield] = ywoy;
  }

  protected yearLength(y: number): number {
    return this.monthStart(y + 1, 0, false) - this.monthStart(y, 0, false);
  }

  protected weekNumber(firstDay: number, minDays: number, desiredDay: number, dayOfPeriod: number, dayOfWeek: number): number {
    let psow = (dayOfWeek - firstDay - dayOfPeriod + 1) % 7;
    if (psow < 0) {
      psow += 7;
    }
    const weekNo = floor((desiredDay + psow - 1) / 7);
    return 7 - psow >= minDays ? weekNo + 1 : weekNo;
  }

  protected utcfields(): number[] {
    const u = this.unixEpoch();
    const f = this._fields.slice(0);
    jdFromUnixEpoch(u, f);
    computeBaseFields(f);
    this.initFields(f);
    return f;
  }
}

/**
 * Compute Julian day from timezone-adjusted Unix epoch milliseconds.
 */
const jdFromUnixEpoch = (ms: number, f: number[]): void => {
  const oneDayMS = CalendarConstants.ONE_DAY_MS;
  const days = floor(ms / oneDayMS);
  const jd = days + CalendarConstants.JD_UNIX_EPOCH;
  const msDay = ms - days * oneDayMS;

  f[DateField.JULIAN_DAY] = jd;
  f[DateField.MILLIS_IN_DAY] = msDay;
};

/**
 * Given a Julian day and local milliseconds (in UTC), return the Unix
 * epoch milliseconds UTC.
 */
const unixEpochFromJD = (jd: number, msDay: number): number => {
  const days = jd - CalendarConstants.JD_UNIX_EPOCH;
  return days * CalendarConstants.ONE_DAY_MS + msDay;
};

/**
 * Compute fields common to all calendars. Before calling this, we must
 * have the JULIAN_DAY and MILLIS_IN_DAY fields set. Every calculation
 * is relative to these.
 */
const computeBaseFields = (f: number[]): void => {
  const jd = f[DateField.JULIAN_DAY];
  checkJDRange(jd);

  let msDay = f[DateField.MILLIS_IN_DAY];
  const ms = msDay + (jd - CalendarConstants.JD_UNIX_EPOCH) * CalendarConstants.ONE_DAY_MS;

  f[DateField.LOCAL_MILLIS] = ms;
  f[DateField.JULIAN_DAY] = jd;
  f[DateField.MILLIS_IN_DAY] = msDay;
  f[DateField.MILLIS] = msDay % 1000;

  msDay = (msDay / 1000) | 0;
  f[DateField.SECOND] = msDay % 60;

  msDay = (msDay / 60) | 0;
  f[DateField.MINUTE] = msDay % 60;

  msDay = (msDay / 60) | 0;
  f[DateField.HOUR_OF_DAY] = msDay;
  f[DateField.AM_PM] = (msDay / 12) | 0;
  f[DateField.HOUR] = msDay % 12;

  let dow = (jd + DayOfWeek.MONDAY) % 7;
  if (dow < DayOfWeek.SUNDAY) {
    dow += 7;
  }
  f[DateField.DAY_OF_WEEK] = dow;
};

const checkJDRange = (jd: number): void => {
  if (jd < CalendarConstants.JD_MIN || jd > CalendarConstants.JD_MAX) {
    throw new Error(
      `Julian day ${jd} is outside the supported range of this library: ` + `${ConstantsDesc.JD_MIN} to ${ConstantsDesc.JD_MAX}`
    );
  }
};
