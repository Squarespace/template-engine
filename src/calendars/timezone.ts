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

 import { TZ, ZoneInfo } from '@phensley/timezone';

/* tslint:disable:max-line-length */
const zoneAlias = {
  'SystemV/AST4': 'America/Puerto_Rico',
  'SystemV/AST4ADT': 'America/Halifax',
  'SystemV/CST6': 'America/Regina',
  'SystemV/CST6CDT': 'America/Chicago',
  'SystemV/EST5': 'America/Indianapolis',
  'SystemV/EST5EDT': 'America/New_York',
  'SystemV/HST10': 'Pacific/Honolulu',
  'SystemV/MST7': 'America/Phoenix',
  'SystemV/MST7MDT': 'America/Denver',
  'SystemV/PST8': 'Pacific/Pitcairn',
  'SystemV/PST8PDT': 'America/Los_Angeles',
  'SystemV/YST9': 'Pacific/Gambier',
  'SystemV/YST9YDT': 'America/Anchorage'
};

const timeZoneAliases: { [x: string]: string } = {
  // Import generated zone aliases from CLDR
  ...zoneAlias,

  'Canada/East-Saskatchewan': 'America/Regina',
  'Etc/Unknown': 'Factory'
};

/**
 * Maps a possible timezone alias to the correct id.
 */
export const substituteZoneAlias = (id: string): string => timeZoneAliases[id] || id;

export const zoneInfoFromUTC = (zoneid: string, utc: number): ZoneInfo => {

  let tzinfo = TZ.fromUTC(zoneid, utc);
  if (tzinfo === undefined) {
    tzinfo = TZ.utcZone();
  }

  return tzinfo;

};
