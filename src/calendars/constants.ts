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

export const enum CalendarConstants {
  ISO8601_MIN_DAYS = 4,

  // TODO: revisit to expand range of julian days

  // Min and max Julian day form a range of full years whose midpoint is the
  // UNIX epoch Jan 1 1970
  MIN_YEAR = 4713,
  JD_MIN = 0, // Mon Jan  1 4713 BC
  JD_UNIX_EPOCH = 2440588, // Thu Jan  1 1970 AD
  JD_MAX = 4881503, // Fri Dec 31 8652 AD

  // Date of cutover to the Gregorian calendar, Oct 15, 1582
  JD_GREGORIAN_CUTOVER = 2299161,
  JD_GREGORIAN_CUTOVER_YEAR = 1582,

  // Julian day for Jan 1, 1 first day of the Gregorian calendar common era
  JD_GREGORIAN_EPOCH = 1721426,

  // Julian day for Mar 21, 622 first day of the Persian calendar
  JD_PERSIAN_EPOCH = 1948320,

  BUDDHIST_ERA_START = -543,

  ONE_SECOND_MS = 1000,
  ONE_MINUTE_MS = CalendarConstants.ONE_SECOND_MS * 60,
  ONE_HOUR_MS = CalendarConstants.ONE_MINUTE_MS * 60,
  ONE_DAY_MS = CalendarConstants.ONE_HOUR_MS * 24,
  ONE_WEEK_MS = CalendarConstants.ONE_DAY_MS * 7,
}

export const enum ConstantsDesc {
  JD_MIN = 'Mon Jan  1 4713 B.C.',
  JD_UNIX_EPOCH = 'Thu Jan  1 1970 A.D.',
  JD_MAX = 'Fri Dec 31 8652 A.D.',
}
