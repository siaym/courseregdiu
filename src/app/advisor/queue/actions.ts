"use server";

import { requireAdvisor } from "@/lib/auth/roles";
import {
  getAdvisorApplicationCenterData,
  type AdvisorQueueData,
} from "@/lib/advisor/queue-service";

/**
 * Server action to refresh or query the Application Center by semester.
 */
export async function fetchAdvisorQueueAction(
  semesterId?: string
): Promise<{ success: boolean; data?: AdvisorQueueData; error?: string }> {
  try {
    const { profile } = await requireAdvisor("/advisor/queue");

    const data = await getAdvisorApplicationCenterData({
      advisorProfileId: profile.id,
      selectedSemesterId: semesterId,
    });

    return {
      success: true,
      data,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load application queue.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
