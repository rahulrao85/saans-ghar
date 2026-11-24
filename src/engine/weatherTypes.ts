/** Weather that explains smog: low mixing height and still air trap pollution. */
export interface WeatherHourData {
  /** Hours since today's midnight in India (24–47 = tomorrow). */
  readonly hour: number;
  readonly mixingHeightM: number;
  readonly windKmh: number;
}
