/** Every time zone the browser knows (Africa/Nairobi, America/New_York...), for pickers. */
export const TIMEZONES: string[] = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? ["Africa/Nairobi", "UTC"];
  } catch {
    return ["Africa/Nairobi", "UTC"];
  }
})();

/** This device's time zone, e.g. America/New_York. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

/** "New York" from "America/New_York". */
export const zoneCity = (z: string) => (z.split("/").pop() ?? z).replace(/_/g, " ");
