"use client";

import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import myanmarGeoJson from "./myanmar_state_region.json";
import { scaleLinear } from "d3-scale";

interface MapComponentProps {
    data: any;
}

export default function MapComponent({ data }: MapComponentProps) {
    const [tooltipContent, setTooltipContent] = useState("");
    const [tooltipStyles, setTooltipStyles] = useState<{ x: number, y: number, show: boolean }>({ x: 0, y: 0, show: false });

    const maxVisitors = useMemo(() => {
        if (!data?.domesticVisitors) return 1;
        return Math.max(...data.domesticVisitors.map((d: any) => d.visitors || 0), 1);
    }, [data]);

    // Color scale according to dashboard theme. 
    const colorScale = scaleLinear<string>()
        .domain([0, maxVisitors])
        .range(["#0f172a", "#06b6d4"]); // slate-900 to cyan-500

    const getRegionData = (geoData: any) => {
        let name = geoData.properties.NAME_1 || geoData.properties.ST || geoData.properties.name || geoData.properties.Name || geoData.properties.SR_NAME || "Unknown";

        let searchName = name.replace(/ Region| State| Territory/gi, "").trim();

        // Normalization for known variations
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
        const sNorm = norm(searchName);

        const visitors = data.domesticVisitors?.find((d: any) => {
            const dbNorm = norm(d.region);
            return dbNorm.includes(sNorm) || sNorm.includes(dbNorm) ||
                (sNorm === 'naypyitaw' && dbNorm === 'naypyitaw') ||
                (sNorm.includes('ayeya') && dbNorm.includes('ayeya')) ||
                (sNorm === 'bago' && dbNorm === 'bago');
        });

        const hotelInfo = data.hotelCapacity?.find((d: any) => {
            const dbNorm = norm(d.region); // region here is actually 'place' from db
            return dbNorm.includes(sNorm) || sNorm.includes(dbNorm);
        });

        const seasonInfo = data.seasonality?.find((d: any) => {
            const dbNorm = norm(d.destination);
            return dbNorm.includes(sNorm) || sNorm.includes(dbNorm);
        });

        return {
            name,
            visitors: visitors?.visitors || 0,
            hotels: hotelInfo?.hotels || 0,
            rooms: hotelInfo?.rooms || 0,
            peak: seasonInfo?.peakMonths?.join(", ") || "Unknown",
            dailyCost: seasonInfo?.dailyCost || null,
            safetyScore: seasonInfo?.safetyScore || null,
            safetyNotes: seasonInfo?.safetyNotes || null
        };
    };

    return (
        <div className="w-full h-full relative group">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 1500,
                    center: [96.5, 18.5]
                }}
                className="w-full h-full object-contain"
            >
                <Geographies geography={myanmarGeoJson}>
                    {({ geographies }: any) =>
                        geographies.map((geo: any) => {
                            const regionStats = getRegionData(geo);
                            const fill = regionStats.visitors > 0 ? colorScale(regionStats.visitors) : "#1e293b";

                            return (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill={fill}
                                    stroke="#334155"
                                    strokeWidth={1}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#10b981", outline: "none", cursor: "pointer" },
                                        pressed: { fill: "#059669", outline: "none" }
                                    }}
                                    onMouseEnter={(e: any) => {
                                        let extended = '';
                                        if (regionStats.dailyCost) {
                                            extended = `
                                                <div class="mt-2 pt-2 border-t border-slate-700/50 text-xs">
                                                    <div class="font-bold text-emerald-400 mb-1 tracking-wider uppercase">Travel Guide</div>
                                                    <span class="text-slate-400">Est. Daily Cost:</span> <span class="font-medium">$${regionStats.dailyCost}</span><br/>
                                                    <span class="text-slate-400">Safety Score:</span> <span class="font-medium ${regionStats.safetyScore > 60 ? 'text-emerald-400' : 'text-rose-400'}">${regionStats.safetyScore}/100</span><br/>
                                                    <div class="mt-1 text-slate-300 italic max-w-[220px] whitespace-normal leading-tight">"${regionStats.safetyNotes}"</div>
                                                </div>
                                            `;
                                        }

                                        setTooltipContent(`
                                            <div class="font-bold text-base mb-1 border-b border-slate-700 pb-1">${regionStats.name}</div>
                                            <div class="text-sm">
                                                <span class="text-slate-400">Visitors:</span> <span class="font-medium">${new Intl.NumberFormat().format(regionStats.visitors)}</span><br/>
                                                <span class="text-slate-400">Hotels:</span> <span class="font-medium">${regionStats.hotels} (${regionStats.rooms} rooms)</span><br/>
                                                <span class="text-slate-400">Peak Season:</span> <span class="font-medium text-amber-200">${regionStats.peak}</span>
                                            </div>
                                            ${extended}
                                        `);
                                        setTooltipStyles({ x: e.clientX, y: e.clientY, show: true });
                                    }}
                                    onMouseMove={(e: any) => {
                                        setTooltipStyles({ x: e.clientX, y: e.clientY, show: true });
                                    }}
                                    onMouseLeave={() => {
                                        setTooltipStyles({ ...tooltipStyles, show: false });
                                    }}
                                />
                            );
                        })
                    }
                </Geographies>
            </ComposableMap>

            {tooltipStyles.show && (
                <div
                    className="fixed z-50 pointer-events-none bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-slate-200"
                    style={{
                        left: tooltipStyles.x + 15,
                        top: Math.max(10, tooltipStyles.y - 40)
                    }}
                    dangerouslySetInnerHTML={{ __html: tooltipContent }}
                />
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 p-4 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Visitor Density</span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm bg-slate-800 border border-slate-700/50" />
                    <span className="text-xs text-slate-400">0</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-4 rounded-sm flex" style={{ background: "linear-gradient(to right, #0f172a, #06b6d4)" }}></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                    <span>Low</span>
                    <span>High</span>
                </div>
            </div>
        </div>
    );
}
