const token_key_name = "wpx_feature_planner_user_auth_token";
let totalCalls = 0;
let userEmailId = "";
let userDisplayName = "";
// Flag: user has no accessible teams in selected project (fallback mode)
let noTeamAccess = false;
// Tracks whether the currently entered feature-id corresponds to a valid, retrievable work item
let featureIdValid = false;

// All validation / popup / UI helper wrappers removed. Use underlying modules directly:
//  - Validation: window.validateForm / validateDeliverable / validateTask
//  - Progress bar & loading: DOMUtils.*, showLoadingIndicator/hideLoadingIndicator
//  - Popups: Popups.showErrorPopup / showSuccessPopup / showInfoPopup / showNonDismissibleErrorPopup
//  - User display: displayUserName (from ui/user.js)
//  - Delete button updates: UIUpdates.updateDeleteDeliverableButtons() (from ui/updates.js)

// getFeatureUrl now provided by ui/navigation.js

// createDeliverable handled in api/workItems.js (wrapper below retained)

// Work item API wrappers removed – call window.Api.* directly (createDeliverable, createTask, createDeliverablesAndTasks, getLinkedWorkItemsQuery)

// resetForm now provided by ui/forms.js

// clearForm now provided by ui/forms.js

// resetDeliverableItems now provided by ui/forms.js

// Progress bar / overlay / PAT wrappers removed – use DOMUtils.setProgressBar/stopProgressBar and Overlays.showPATPopup/closePatPopup directly.

// fetchFeatureDetails moved to api/lookup.js

// fetchUserPublicAlias moved to api/lookup.js

// fetchUserOrganizations moved to api/lookup.js

// populateOrganizationsDropdown moved to api/lookup.js


// fetchProjectsForOrganization moved to api/lookup.js

// clearProjectSelect moved to api/lookup.js

// populateProjectsDropdown moved to api/lookup.js

// Auth header helper now sourced from api/auth.js (kept for backward compatibility if referenced before load)
// generateAuthHeaders defined globally by api/auth.js

// Loading indicator helpers moved to utils/dom.js (DOMUtils)
// showLoadingIndicator & hideLoadingIndicator provided globally for legacy calls.

// Form population & update helpers moved to ui/forms.js
// populateFormWithPreconfiguredData, updateDeliverable, updateTask now provided globally.

// removeAllDeliverablesAndTasks now provided by ui/forms.js

// updateDeliverable & updateTask moved to ui/forms.js

// updateFeatureEstimate wrapper removed – call window.updateFeatureEstimate() directly.

// populateTeamProfile moved to api/lookup.js

// populateTeamDropdown moved to api/lookup.js

// clearTeamDropdown moved to api/lookup.js

// fetchIterationsForTeam moved to api/lookup.js

// fetchWorkItemTypes moved to api/lookup.js

// fetchUsersInTeam moved to api/lookup.js

// clearAssignedToDropdown moved to api/lookup.js

// enableAssigneeFallback moved to api/lookup.js

// populateAssignedToDropdown moved to api/lookup.js

// Select2 formatters & initialization wrappers removed – use window.UIInit.initializeSelect2Dropdowns(), window.formatUserOption, window.formatUserSelection.

// fetchAreaPathsForTeam moved to api/lookup.js

// populateIterationSuggestions moved to api/lookup.js

// populateAreaPathSuggestions moved to api/lookup.js

// fetchUserProfileImage moved to utils/avatar.js

// Function to generate avatar initials for users
// generateAvatarInitials moved to utils/avatar.js

// Function to generate a color based on the user's name
// generateAvatarColor moved to utils/avatar.js

// Function to create an avatar canvas element
// createAvatarCanvas moved to utils/avatar.js

// In-memory avatar cache (userId -> dataURL/URL)
// avatarCache provided by utils/avatar.js

// Function to fetch user avatar (direct identityImage with caching, then fallback to generated initials)
// fetchUserAvatar moved to utils/avatar.js

// Function to update avatars in the assignee dropdown after it's rendered
// updateAssigneeDropdownAvatars moved to utils/avatar.js

// Prefetch avatars after dropdown population to reduce first-open lag
// prefetchAssigneeAvatars moved to utils/avatar.js

// Function to clear PAT from local storage and reload the page
function logout() {
  if (usePAT) {
    clearTokenFromLocalStorage();
    window.location.reload();
  } else {
    signOut();
  }
}

// Template & file loader wrappers removed – call window.populatePrefilWorkItemsDropdown() and window.readJSONFileByNameFromPublicFolder(path) directly where needed.

// Assignee org-wide search enhancements moved to utils/assigneeSearch.js

// Clean up avatar cache (referenced in eventHandlers.js)
// cleanupAvatarCache moved to utils/avatar.js

// Wrap populateAssignedToDropdown to also snapshot team members once (only when called from team fetch)
// populateAssignedToDropdown wrapper for snapshot now handled in utils/assigneeSearch.js

// Build option elements for the assignee select from generic user objects
// rebuildAssigneeOptionsFromGenericUsers moved to utils/assigneeSearch.js

// Perform organization-wide search for users whose display name or email matches query
// searchOrganizationUsers moved to utils/assigneeSearch.js

// Show/hide spinner inside open Select2 results (assignee search)
// showAssigneeLoadingIndicator / hideAssigneeLoadingIndicator moved to utils/assigneeSearch.js

// Handle input changes in Select2 search field for assignee dropdown
// Track async search requests to avoid race conditions (out-of-order resolution overwriting newer input)
// debouncedAssigneeSearch & related handlers moved to utils/assigneeSearch.js
