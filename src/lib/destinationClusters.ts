// Destination clustering for the Decision Center: groups active destinations into
// data-driven segments using k-means (see kMeans2D in statistics.ts) over two normalized
// features -- daily cost and safety score -- rather than a hand-authored bucket list.
// Recomputed on every call rather than cached at module scope: destinations are a real
// admin-editable entity now (see actions/manageDestinations.ts), so a cached-forever cluster
// set would keep showing a destination's old cost/safety category after an edit until the
// server next restarted. 18-ish points is cheap enough that recomputing costs nothing real.

import { getAllDestinations, type DestinationProfile } from "@/lib/documentStore";
import { kMeans2D } from "@/lib/statistics";

export type DestinationCluster = {
    destination: string;
    cluster: number;
    label: string;
    labelMm: string;
};

function normalize(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max === min) return values.map(() => 0.5);
    return values.map((v) => (v - min) / (max - min));
}

export async function getDestinationClusters(): Promise<DestinationCluster[]> {
    const profiles: DestinationProfile[] = await getAllDestinations();
    if (profiles.length === 0) return [];

    const costs = normalize(profiles.map((p) => p.dailyCost));
    const safeties = normalize(profiles.map((p) => p.safetyScore));
    const points = profiles.map((_, i) => ({ x: costs[i], y: safeties[i] }));
    const k = Math.min(3, profiles.length);
    const assignments = kMeans2D(points, k);

    // Per-cluster averages (raw, unnormalized) drive the labels below -- a label like
    // "Remote & Higher-Risk" is only ever assigned because that cluster's actual average
    // safety score is the lowest of the three, not from a fixed list of place names.
    const clusterStats = Array.from({ length: k }, (_, c) => {
        const members = profiles.filter((_, i) => assignments[i] === c);
        const avgCost = members.reduce((sum, p) => sum + p.dailyCost, 0) / members.length;
        const avgSafety = members.reduce((sum, p) => sum + p.safetyScore, 0) / members.length;
        return { cluster: c, avgCost, avgSafety };
    });

    const bySafetyDesc = [...clusterStats].sort((a, b) => b.avgSafety - a.avgSafety);
    const safestCluster = bySafetyDesc[0].cluster;
    const leastSafeCluster = bySafetyDesc[bySafetyDesc.length - 1].cluster;
    const overallAvgCost = clusterStats.reduce((sum, c) => sum + c.avgCost, 0) / clusterStats.length;

    const labelFor = (cluster: number): { label: string; labelMm: string } => {
        const stats = clusterStats.find((c) => c.cluster === cluster)!;
        if (cluster === leastSafeCluster && leastSafeCluster !== safestCluster) {
            return { label: 'Remote & Higher-Risk', labelMm: 'ဝေးလံသော နှင့် အန္တရာယ်ပိုများသော' };
        }
        if (stats.avgCost > overallAvgCost * 1.3) {
            return { label: 'Premium & Higher-Cost', labelMm: 'ပရီမီယံ နှင့် စျေးနှုန်းမြင့်' };
        }
        if (cluster === safestCluster) {
            return { label: 'Popular & Well-Established', labelMm: 'လူကြိုက်များ နှင့် ကောင်းစွာတည်ထောင်ပြီး' };
        }
        return { label: 'Budget & Practical', labelMm: 'ချွေတာသော နှင့် လက်တွေ့ကျသော' };
    };

    return profiles.map((p, i) => {
        const { label, labelMm } = labelFor(assignments[i]);
        return { destination: p.destination, cluster: assignments[i], label, labelMm };
    });
}

export async function getClusterForDestination(destination: string): Promise<DestinationCluster | null> {
    const clusters = await getDestinationClusters();
    return clusters.find((c) => c.destination === destination) || null;
}
