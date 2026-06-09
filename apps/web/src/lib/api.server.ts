import "server-only";
import {
  getSpaceIngestReport,
  getSpaceProgramById,
  spaceSourceReviews
} from "@bidscout/shared";
import type { SpaceProgramDetail, SpaceSourceReviewItem } from "./types";

export const getProgramServer = async (id: string): Promise<SpaceProgramDetail | null> =>
  (getSpaceProgramById(id) as unknown as SpaceProgramDetail) ?? null;

export const getSourcesServer = async (): Promise<SpaceSourceReviewItem[]> =>
  spaceSourceReviews as unknown as SpaceSourceReviewItem[];

export const getIngestReportServer = async (): Promise<{ lastCheckedAt?: string; generatedCount?: number } | null> =>
  getSpaceIngestReport() ?? null;
