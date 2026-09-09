"use server";

import { defaultFilters } from "@/lib/FilterContext";
import { getTrendsData } from "@/actions/trends";
import { getHotelsData } from "@/actions/hotels";
import { getExpenditureData } from "@/actions/expenditure";
import { getCrowdMonitoring } from "@/actions/crowd";

export type Severity = "INFO" | "WARNING" | "CRITICAL";

export type Alert = {
  id: string;
  severity: Severity;
  title: string;
  titleMm: string;
  detail: string;
  detailMm: string;
  sourcePage: string;
};

// Every alert below is derived from a statistical signal already computed elsewhere in the
// app (z-score anomalies on Trends/Hotels/Expenditure, the Crowd Monitoring pressure proxy)
// rather than a new detection method invented for this page. The point of an Alert Center
// isn't a new algorithm -- it's not making a reader visit four separate pages to notice four
// separate things already being computed.
export async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  const [trends, hotels, expenditure, crowd] = await Promise.all([
    getTrendsData(defaultFilters),
    getHotelsData(defaultFilters),
    getExpenditureData(defaultFilters),
    getCrowdMonitoring(),
  ]);

  trends.yearly.filter((y) => y.isAnomaly).forEach((y) => {
    const severity: Severity = Math.abs(y.zScore) >= 2 ? "CRITICAL" : "WARNING";
    alerts.push({
      id: `arrivals-${y.year}`,
      severity,
      title: `Unusual international arrivals in ${y.year}`,
      titleMm: `${y.year} တွင် ထူးခြားသော နိုင်ငံတကာ လာရောက်မှု`,
      detail: `${y.year}'s total is a statistical outlier (z-score ${y.zScore}) against the 2015-2025 series.`,
      detailMm: `${y.year} ၏ စုစုပေါင်းသည် ၂၀၁၅-၂၀၂၅ စီးရီးနှင့်နှိုင်းယှဉ်လျှင် စာရင်းအင်းအရ ထူးခြားချက်တစ်ခုဖြစ်သည် (z-score ${y.zScore})။`,
      sourcePage: "/trends",
    });
  });

  hotels.yearlyTrends.filter((y) => y.isAnomaly).forEach((y) => {
    alerts.push({
      id: `hotels-${y.year}`,
      severity: "WARNING",
      title: `Unusual hotel room supply change in ${y.year}`,
      titleMm: `${y.year} တွင် ဟိုတယ်အခန်း ထောက်ပံ့မှု ထူးခြားစွာ ပြောင်းလဲမှု`,
      detail: `Total room count for ${y.year} is a statistical outlier (z-score ${y.zScore}) against the full history.`,
      detailMm: `${y.year} ၏ အခန်းရေ စုစုပေါင်းသည် သမိုင်းကြောင်းတစ်ခုလုံးနှင့်နှိုင်းယှဉ်လျှင် စာရင်းအင်းအရ ထူးခြားချက်တစ်ခုဖြစ်သည် (z-score ${y.zScore})။`,
      sourcePage: "/hotels",
    });
  });

  // yearlyTrends is a dynamically-keyed pivot (category names as object keys, e.g. "Total
  // Expenditure (US$)"), so TypeScript can't carry `year`'s type through the spread that
  // built it -- read it via the same Record<string, unknown> pattern the rest of this
  // codebase already uses for these pivot shapes, rather than widening this function's
  // return type just to satisfy one alert.
  (expenditure.yearlyTrends as Record<string, unknown>[])
    .filter((y) => Boolean(y.isExpenditureAnomaly))
    .forEach((y) => {
      const year = Number(y.year);
      const zScore = Number(y.expenditureZScore);
      alerts.push({
        id: `expenditure-${year}`,
        severity: "WARNING",
        title: `Unusual tourism expenditure in ${year}`,
        titleMm: `${year} တွင် ခရီးသွားလုပ်ငန်း အသုံးစရိတ် ထူးခြားမှု`,
        detail: `Total expenditure for ${year} is a statistical outlier (z-score ${zScore}) against the full history.`,
        detailMm: `${year} ၏ စုစုပေါင်း အသုံးစရိတ်သည် သမိုင်းကြောင်းတစ်ခုလုံးနှင့်နှိုင်းယှဉ်လျှင် စာရင်းအင်းအရ ထူးခြားချက်တစ်ခုဖြစ်သည် (z-score ${zScore})။`,
        sourcePage: "/expenditure",
      });
    });

  crowd.signals.filter((s) => s.pressureLevel === "OVERCROWDED").forEach((s) => {
    alerts.push({
      id: `crowd-${s.destination}`,
      severity: "WARNING",
      title: `${s.destination} is showing an overcrowding signal`,
      titleMm: `${s.destination} တွင် လူပိုလျှံနေမှု အချက်ပြနေသည်`,
      detail: `Accommodation supply relative to domestic-visitor volume is well below the national median (${s.roomsPer1000Visitors} vs ${crowd.nationalMedianRoomsPer1000} rooms/1,000 visitors).`,
      detailMm: `ပြည်တွင်းဧည့်သည်ပမာဏနှင့် နှိုင်းယှဉ်လျှင် တည်းခိုခန်းထောက်ပံ့မှုသည် တစ်နိုင်ငံလုံး အလယ်တန်းတန်ဖိုးထက် များစွာနိမ့်ကျနေသည် (${s.roomsPer1000Visitors} နှင့် ${crowd.nationalMedianRoomsPer1000} အခန်း/ဧည့်သည် ၁၀၀၀)။`,
      sourcePage: "/crowd",
    });
  });

  // Severity first (CRITICAL surfaces before WARNING/INFO), then id for stable ordering.
  const order: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
}
