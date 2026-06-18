import axiosInstance from "@/lib/axiosConfig";

/**
 * Fetch privilege for a given window/page and return it.
 *
 * @param {string} windowName - The name of the page/window (e.g. "Cost Center")
 * @param {number} userGroupId - Current user group id (default: 1)
 * @returns {Promise<object|null>} privilege object or null if not found
 */
export async function checkPageAccess(windowName, userGroupId) {
  try {
    const res = await axiosInstance.get(`get-privileges-byId/${userGroupId}`);
    const privilegeData = res.data.data || [];

    const privilege = privilegeData.find((p) => p.window_name === windowName);
    return privilege || null;
  } catch (error) {
    console.error(`Error fetching privileges for ${windowName}:`, error);
    return null;
  }
}
