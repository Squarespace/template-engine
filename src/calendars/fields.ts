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

export const enum DayOfWeek {
  SUNDAY = 1,
  MONDAY = 2,
  TUESDAY = 3,
  WEDNESDAY = 4,
  THURSDAY = 5,
  FRIDAY = 6,
  SATURDAY = 7
}

export const enum DateField {
  // Milliseconds from Unix epoch, adjusted by local timezone offset
  LOCAL_MILLIS = 0,
  // Date in Julian days
  JULIAN_DAY,
  ERA,
  EXTENDED_YEAR,
  YEAR,
  YEAR_WOY,
  WEEK_OF_YEAR,
  MONTH,
  WEEK_OF_MONTH,
  DAY_OF_YEAR,
  DAY_OF_MONTH,
  DAY_OF_WEEK,
  DAY_OF_WEEK_IN_MONTH,
  MILLIS_IN_DAY,
  AM_PM,
  HOUR_OF_DAY,
  HOUR,
  MINUTE,
  SECOND,
  MILLIS,
  TZ_OFFSET,
  IS_LEAP,
  IS_DST,
  ISO_YEAR_WOY,
  ISO_WEEK_OF_YEAR // 24
}

// 24 fields
export const dateFields = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
