"use client";

import dynamic from "next/dynamic";
import { Bone } from "./skeleton";

// The chart library is the heaviest client code in the app; load it after the page shows.
const fallback = () => <Bone className="h-64 rounded-xl" />;

export const StatusDonut = dynamic(() => import("./charts").then((m) => m.StatusDonut), { ssr: false, loading: fallback });
export const WorkloadBars = dynamic(() => import("./charts").then((m) => m.WorkloadBars), { ssr: false, loading: fallback });
export const CompletedArea = dynamic(() => import("./charts").then((m) => m.CompletedArea), { ssr: false, loading: fallback });
