const token_key_name = "wpx_feature_planner_user_auth_token";
let totalCalls = 0;
let userEmailId = "";
let userDisplayName = "";
// Flag: user has no accessible teams in selected project (fallback mode)
let noTeamAccess = false;

// Regular expression to validate email addresses
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
* Note: The word 'Deliverable' could be any work-item under the Feature/Scenario.
* User decides what that work-item type can be. These work-items contain 'Tasks'
* Feature/Scenario -> Selected Work Item Type -> Tasks
*/

// Variable to store the selected work item type details for dynamic updates
let selectedWorkItemTypeName = "Work-Item";

// Helper function to get the assigned-to select element
function getAssignedToSelect() {
  return $("#assigned-to-select");
}

const trackProgress = async (message, fn) => {
  showLoadingIndicator(message);
  return fn();
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function onSuccessLogin() {
  if (usePAT) {
    // Attempt to read PAT
    const token = getTokenFromLocalStorage();
    if (!token) {
      // Popup to read PAT
      hideLoadingIndicator();
      showPATPopup(false);
      return;
    }
  }

  console.log("Login Complete");
  showLoadingIndicator();

  // Reveal app UI now that auth is complete
  $('#app-root').removeClass('app-root-hidden');

  await Promise.allSettled([
    (async () => {
      await delay(0);
      return trackProgress("Fetching User Profile...", fetchUserProfileImage);
    })(),
    (async () => {
      await delay(2000);
      return trackProgress("Fetching Work Item Templates...", populatePrefilWorkItemsDropdown);
    })(),
    (async () => {
      await delay(4000);
      return trackProgress("Fetching Organizations...", populateOrganizationsDropdown);
    })(),
    updateDeleteTaskButtons(),
    updateDeleteDeliverableButtons(),
    updateDeliverableCount(),
  ]);

  // App Insights SDK would have initialized by now
  setAppInsightsUserContext();

  // Initialize sortable for each task list
  $(".task-list").sortable({
    handle: ".drag-handle",
    axis: "y", // Allow vertical dragging only
    containment: "parent", // Contain within the parent element (deliverable)
    tolerance: "pointer", // Drag only when pointer is within the task item
  });

  // Initialize sortable for deliverable container
  $("#deliverables-container").sortable({
    handle: ".drag-handle",
    axis: "y", // Allow vertical dragging only
    containment: "parent", // Contain within the parent element
    tolerance: "pointer", // Drag only when pointer is inside the deliverable
  });

  // Initialize Select2 dropdowns
  initializeSelect2Dropdowns();

  hideLoadingIndicator();
  // Trigger first run guide (if not completed before)
  if (window.FirstRunGuide && typeof window.FirstRunGuide.maybeStart === 'function') {
    window.FirstRunGuide.maybeStart();
  }
}

// Update deliverable count
async function updateDeliverableCount() {
  const deliverableCount = $(".deliverable-item").length;
  const $deliverableCountSpan = $("#deliverable-count");
  $deliverableCountSpan.text("(" + deliverableCount + ")");
}

// Calculate and update the sum of task estimates for each deliverable
function updateDeliverableEstimates() {
  $(".deliverable-item").each(function () {
    const $deliverableItem = $(this);
    const $taskEstimates = $deliverableItem.find(".task-estimate");
    let totalEstimate = 0;

    $taskEstimates.each(function () {
      const estimate = parseFloat($(this).val());
      if (!isNaN(estimate)) {
        totalEstimate += estimate;
      }
    });

    const $deliverableEstimate = $deliverableItem.find(".deliverable-estimate");
    $deliverableEstimate.text("Dev Days: " + totalEstimate.toFixed(2));
  });
}

// Update task count
function updateTaskCount() {
  $(".deliverable-item").each(function () {
    const $deliverableItem = $(this);
    const $taskList = $deliverableItem.find(".task-list");
    const taskCount = $taskList.find(".task-item").length;
    const $taskCountSpan = $taskList.siblings("h3").find("span");
    $taskCountSpan.text("(" + taskCount + ")");
  });
  updateDeliverableEstimates();
  updateFeatureEstimate();
}

// Initial update of task counts
$(".task-list").each(function () {
  updateTaskCount();
});

// Update delete task buttons
async function updateDeleteTaskButtons() {
  $(".deliverable-item").each(function () {
    const $taskItems = $(this).find(".task-item");
    if ($taskItems.length === 1) {
      $taskItems.find(".delete-task-btn").attr("disabled", true);
    } else {
      $taskItems.find(".delete-task-btn").removeAttr("disabled");
    }
  });
}

// Update delete deliverable buttons
async function updateDeleteDeliverableButtons() {
  const $deliverableItems = $(".deliverable-item");
  if ($deliverableItems.length > 1) {
    $deliverableItems.find(".delete-deliverable-btn").removeAttr("disabled");
  } else {
    $deliverableItems.find(".delete-deliverable-btn").attr("disabled", true);
  }
}

// Validate feature ID, area path, and iteration
function validateForm() {
  const featureId = $("#feature-id").val(); // optional
  const project = $("#project-select").val();
  const team = $("#team-select").val();
  const $assignedToSelect = getAssignedToSelect();
  const assignedTo = $assignedToSelect.val();
  const workitemSelect = $("#work-item-type-select").val();

  const areaPath = $("#area-path").val();
  const iteration = $("#iteration").val();
  let isValid = true;

  $(".form-control").removeClass("is-invalid");

  if (!project) {
    $("#project-select").addClass("is-invalid");
    isValid = false;
    showErrorPopup(
      "Please select a <b>Project</b>. If the choices are empty, it implies that you do not have access to any Project(s)."
    );
    return;
  }

  if (!team && !noTeamAccess) {
    $("#team-select").addClass("is-invalid");
    isValid = false;
    showErrorPopup(
      "Please select a <b>Team</b>. If the choices are empty, it implies that you do not have access to any Team(s)."
    );
    return;
  }

  if (!assignedTo) {
    $assignedToSelect.addClass("is-invalid");
    isValid = false;
    showErrorPopup(
      "Please select a user to assign the work items. If the choices are empty, it implies that you do not access to assign Work Item(s)."
    );
    return;
  }

  if (!workitemSelect) {
    $("#workitem-select").addClass("is-invalid");
    isValid = false;
    showErrorPopup(
      "Please select a work item type."
    );
    return;
  }

  // featureId optional – no validation error if absent

  if (!areaPath) {
    $("#area-path").addClass("is-invalid");
    isValid = false;
  }

  if (!iteration) {
    $("#iteration").addClass("is-invalid");
    isValid = false;
  }

  $(".deliverable-item").each(function () {
    const deliverableTitle = $(this).find(".deliverable-title").val();
    const $taskItems = $(this).find(".task-item");

    if (!deliverableTitle) {
      $(this).find(".deliverable-title").addClass("is-invalid");
      isValid = false;
    }

    // Validation on Tasks has been removed as some teams do not create Tasks at all. This is inline with their process.
    // $taskItems.each(function () {
    //   const taskTitle = $(this).find(".task-title").val();
    //   const taskEstimate = $(this).find(".task-estimate").val();

    //   if (!taskTitle) {
    //     $(this).find(".task-title").addClass("is-invalid");
    //     isValid = false;
    //   }

    //   if (!taskEstimate || isNaN(taskEstimate)) {
    //     $(this).find(".task-estimate").addClass("is-invalid");
    //     isValid = false;
    //   }
    // });
  });

  return isValid;
}

// Validate deliverable title
function validateDeliverable() {
  const $deliverableTitleInput = $(".deliverable-item:last").find(".deliverable-title");
  const deliverableTitle = $deliverableTitleInput.val();
  const isValid = !!deliverableTitle;

  $(".form-control").removeClass("is-invalid");

  if (!isValid) {
    $deliverableTitleInput.addClass("is-invalid");
  }

  return isValid;
}

// Validate task title and estimate
function validateTask($taskTitleInput, $taskEstimateInput) {
  const taskTitle = $taskTitleInput.val();
  const taskEstimate = $taskEstimateInput.val();
  const isValidTitle = !!taskTitle;
  const isValidEstimate = taskEstimate !== "" && !isNaN(taskEstimate);
  $(".form-control").removeClass("is-invalid");

  if (!isValidTitle) {
    $taskTitleInput.addClass("is-invalid");
  }

  if (!isValidEstimate) {
    $taskEstimateInput.addClass("is-invalid");
  }

  return isValidTitle && isValidEstimate;
}

/**
 * @deprecated Since version 1.3.1. Not in use. Switched to better approach of fetching profile and other data.
 */
async function loadUserProfile() {
  const organization = $("#organization-select").val();
  const apiEndpoint = "https://dev.azure.com/" + organization + "/_apis/ConnectionData?api-version=1.0";
  const authHeaders = await generateAuthHeaders(usePAT);
  $.ajax({
    url: apiEndpoint,
    method: "GET",
    headers: authHeaders,
    success: function (data) {
      if (data.authenticatedUser) {
        if (usePAT) {
          userDisplayName = data.authenticatedUser.providerDisplayName || "User";
          userEmailId = authenticatedUser.properties.Account.$value;
          displayUserName(userDisplayName);
        } else {
          // Display the profile picture instead

          fetchUserProfileImage()
            //.then(() => populateOrganizationsDropdown())
            //.then(() => populateProjectsDropdown())
            //.then(() => populateTeamProfile())
            .then(() => hideLoadingIndicator())
            .catch((error) => {
              console.error("Error:", error);
              hideLoadingIndicator();
            });
        }
      } else {
        if (usePAT) {
          //Use PAT
          showPATPopup(true);
        } else {
          //Use Access Token
          console.log("User not authenticated");
          showErrorPopup("User not authenticated. Reloading this page may fix the issue.");
        }
      }
      return data;
    },
    error: function (jqXHR, textStatus, errorThrown) {
      if (jqXHR.status === 401) {
        console.error("Unauthorized. Please check your authentication. Logging out the user");
        logout();
      } else {
        console.log(errorThrown);
        showErrorPopup("Error fetching user profile. Check console log.");
      }
    },
  });
}

// Function to display progress bar
function displayProgressBar() {
  $(".progress-bar-container").show();
}

// Function to hide progress bar
function hideProgressBar() {
  $(".progress-bar-container").hide();
}

// Function to show a non-dismissible popup
function showNonDismissibleErrorPopup(message) {
  const modalId = `nonDismissibleModal-${Date.now()}`;

  const popupHTML = `
      <div class="modal fade non-dismissible" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static">
          <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                  <div class="modal-header">
                      <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-exclamation-circle"></i> Error</h5>
                  </div>
                  <div class="modal-body">
                      ${message}
                  </div>
              </div>
          </div>
      </div>
  `;

  $("body").append(popupHTML);
  $(`#${modalId}`).modal("show");

  // Remove the modal from the DOM once it is hidden to avoid duplication on subsequent calls
  $(`#${modalId}`).on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

// Function to show a error popup
function showErrorPopup(message) {
  const modalId = `errorModal-${Date.now()}`;

  const popupHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${modalId}Label"><i class="fas fa-exclamation-circle"></i> Error</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${message}
            </div>
          </div>
        </div>
      </div>
    `;

  $("body").append(popupHTML);
  $(`#${modalId}`).modal("show");

  // Remove the modal from the DOM once it is hidden to avoid duplication on subsequent calls
  $(`#${modalId}`).on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

// Function to show a success popup
function showSuccessPopup(message) {
  const popupHTML = `
      <div class="modal fade" id="successModal" tabindex="-1" aria-labelledby="successModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="successModalLabel"><i class="fas fa-check-circle"></i> Success</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${message}
            </div>
          </div>
        </div>
      </div>
    `;

  $("body").append(popupHTML);
  $("#successModal").modal("show");

  // Remove the modal from the DOM once it is hidden to avoid duplication on subsequent calls
  $("#successModal").on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

// Function to show an information popup (similar to success popup)
function showInfoPopup(message) {
  const modalId = `infoModal-${Date.now()}`;
  const labelId = `${modalId}Label`;

  const popupHTML = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${labelId}" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${labelId}"><i class="fas fa-info-circle"></i> Information</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${message}
            </div>
          </div>
        </div>
      </div>
    `;

  $("body").append(popupHTML);
  $(`#${modalId}`).modal("show");

  // Remove the modal from the DOM once it is hidden to avoid duplication on subsequent calls
  $(`#${modalId}`).on("hidden.bs.modal", function () {
    $(this).remove();
  });
}

// Function to close the error popup
function closeErrorPopup() {
  $("#errorModal").modal("hide");
}

// Function to display the user's name on the page
function displayUserName(name) {
  var profileDropdown = document.getElementById("profile-dropdown");
  profileDropdown.innerHTML = name;
}

// Function to get the feature URL
function getFeatureUrl() {
  const featureIdVal = $("#feature-id").val();
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  return `https://dev.azure.com/${organization}/${project}/_workitems/edit/${featureIdVal}`;
}

// Function to create a new work item in Azure DevOps
async function createDeliverable(workItemData) {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  try {
    let requestHeaders = await generateAuthHeaders(usePAT);
    requestHeaders["Content-Type"] = "application/json-patch+json";

    const response = await fetch(
      "https://dev.azure.com/" + organization + "/" + project + "/_apis/wit/workitems/$" + encodeURIComponent(selectedWorkItemTypeName) + "?api-version=7.0",
      {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(workItemData),
      }
    );

    const responseData = await response.json();
    return responseData.id;
  } catch (error) {
    console.log(error);
    showErrorPopup("Error creating work item. Check Console log.");
    return null;
  }
}

// Function to create a new work item in Azure DevOps
async function createTask(workItemData) {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  try {
    let requestHeaders = await generateAuthHeaders(usePAT);
    requestHeaders["Content-Type"] = "application/json-patch+json";

    const response = await fetch(
      "https://dev.azure.com/" + organization + "/" + project + "/_apis/wit/workitems/$Task?api-version=7.0",
      {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(workItemData),
      }
    );

    const responseData = await response.json();
    return responseData.id;
  } catch (error) {
    console.log(error);
    showErrorPopup("Error creating work item. Check Console log.");
    return null;
  }
}

// Function to create work-items and their associated tasks
async function createDeliverablesAndTasks(data) {
  try {
    const createdDeliverables = [];
    const organization = $("#organization-select").val();
    const project = $("#project-select").val();
    const areaPath = $("#area-path").val();
    const iteration = $("#iteration").val();
    const featureIdVal = $("#feature-id").val();
    const selectedUserEmail = getAssignedToSelect().val();

    const _azureDevOpsApiBaseUrl = "https://dev.azure.com/" + organization + "/" + project;
    let currentCall = 0;
    let currentDeliverableTaskCount = 0;
    let currentDeliverableCount = 0;
    //Create Deliverables
  for (const deliverable of data.deliverables) {
      const deliverableData = [
        {
          op: "add",
          path: "/fields/System.AreaPath",
          value: areaPath,
        },
        {
          op: "add",
          path: "/fields/System.Title",
          value: deliverable.title,
        },
        {
          op: "add",
          path: "/fields/System.IterationPath",
          value: iteration,
        },
        {
          op: "add",
          path: "/fields/System.AssignedTo",
          value: selectedUserEmail,
        },
        // Parent linkage only if a feature/parent id is provided
        ...(featureIdVal ? [{
          op: "add",
          path: "/relations/-",
          value: {
            rel: "System.LinkTypes.Hierarchy-Reverse",
            url: `${_azureDevOpsApiBaseUrl}/_apis/wit/workItems/${featureIdVal}` + "?api-version=7.0",
            attributes: { comment: "Linking child Work-Item to Parent Work-Item" },
          },
        }] : []),
      ];

      // Add description if provided
      if (deliverable.description && deliverable.description.trim()) {
        deliverableData.push({
          op: "add",
          path: "/fields/System.Description",
          value: deliverable.description,
        });
      }

      currentDeliverableCount++;
      showLoadingIndicator(`Creating ${selectedWorkItemTypeName} : ${currentDeliverableCount} of ${data.deliverables.length}`);
      const createdDeliverableId = await createDeliverable(deliverableData);
      if (createdDeliverableId) {
        // Update the progress bar after each Deliverable is created
        currentCall++;
        setProgressBar((currentCall / totalCalls) * 100);
        createdDeliverables.push(createdDeliverableId);
        currentDeliverableTaskCount = 0;
        //Create Tasks
        for (const task of deliverable.tasks) {
          if (!task.title) continue; // Skip empty task titles
          currentDeliverableTaskCount++;
          const taskData = [
            {
              op: "add",
              path: "/fields/System.AreaPath",
              value: areaPath,
            },
            {
              op: "add",
              path: "/fields/System.Title",
              value: task.title,
            },
            {
              op: "add",
              path: "/fields/System.IterationPath",
              value: iteration,
            },
            {
              op: "add",
              path: "/relations/-",
              value: {
                rel: "System.LinkTypes.Hierarchy-Reverse",
                url: `${_azureDevOpsApiBaseUrl}/_apis/wit/workItems/${createdDeliverableId}` + "?api-version=7.0",
                attributes: {
                  comment: "Linking child Work-Item to parent Work-Item",
                },
              },
            },
            {
              op: "add",
              from: null,
              path: "/fields/Microsoft.VSTS.Scheduling.OriginalEstimate",
              value: task.estimate,
            },
            {
              op: "add",
              path: "/fields/System.AssignedTo",
              value: selectedUserEmail,
            },
          ];

          // Add task description if provided
          if (task.description && task.description.trim()) {
            taskData.push({
              op: "add",
              path: "/fields/System.Description",
              value: task.description,
            });
          }

          // Conditionally add the RemainingWork field if the selected project is not "OS"
          if (project !== "OS") {
            taskData.push({
              op: "add",
              path: "/fields/Microsoft.VSTS.Scheduling.RemainingWork",
              value: task.estimate,
            });
          }

          showLoadingIndicator(`Creating Task(s) under current ${selectedWorkItemTypeName} : ${currentDeliverableTaskCount} of ${deliverable.tasks.length}`);
          const createdTaskId = await createTask(taskData);
          if (createdTaskId) {
            // Update the progress bar after each Task is created
            currentCall++;
            setProgressBar((currentCall / totalCalls) * 100);
          }
        }
      }
    }

    return createdDeliverables;
  } catch (error) {
    console.log(error);
    hideLoadingIndicator();
    showErrorPopup("Error creating ADO Items. Check console log");
    return [];
  }
}

// Function to create a temporary query for linked work items
async function getLinkedWorkItemsQuery(featureId) {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  const authHeaders = await generateAuthHeaders(usePAT);
  showLoadingIndicator("Almost done...");

  const queryData = {
    name: `Linked Work Items for Feature ${featureId}`,
    wiql: `
      SELECT
        [System.Id],
        [System.WorkItemType],
        [System.Title],
        [System.AssignedTo],
        [System.State],
        [System.Tags],
        [Microsoft.VSTS.Scheduling.OriginalEstimate]
      FROM workitemLinks
      WHERE
        (
          [Source].[System.TeamProject] = '${project}'
          AND [Source].[System.WorkItemType] <> ''
          AND [Source].[System.Id] = ${featureId}
        )
        AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
        AND (
          [Target].[System.TeamProject] = '${project}'
          AND [Target].[System.WorkItemType] <> ''
        )
      MODE (Recursive)
    `
  };

  try {
    const response = await $.ajax({
      url: `https://dev.azure.com/${organization}/${project}/_apis/wit/tempqueries?api-version=7.1`,
      method: "POST",
      headers: authHeaders,
      contentType: "application/json",
      data: JSON.stringify(queryData),
    });

    hideLoadingIndicator();

    if (!response || !response.id) {
      throw new Error("Temporary query ID not found in response.");
    }

    const queryUrl = `https://dev.azure.com/${organization}/${project}/_queries/query/?tempQueryId=${response.id}`;
    return queryUrl;
  } catch (error) {
    hideLoadingIndicator();
    console.error("Error creating temporary query", error);
    throw error;
  }
}

// Function to reset the form
function resetForm() {
  clearForm();
  resetDeliverableItems();
  stopProgressBar(false);
  setProgressBar(0);
  hideProgressBar();
  $("#preconfigured-data-btn").prop("disabled", false);

  // Clear the Area Path dropdown
  $("#suggested-area-paths-list").empty();

  // Clear the iterations suggestions
  $("#suggested-iterations-list").empty();

  // Clear the work-item type dropdown
  clearWorkItemTypesDropdown();

  // Clear the assigned-to dropdown
  clearAssignedToDropdown();

  // Remove error indicators
  $(".form-control").removeClass("is-invalid");

  // Clear feature name
  $("#feature-name").text("");
  $("#feature-name").attr("href", "#");

  // Fetch the user's teams and iterations
  const selectedOrganization = $("#organization-select").val();
  const selectedProject = $("#project-select").val();
  if (selectedOrganization && selectedProject) {
    $("#iteration").val("");
    populateTeamProfile()
      .then(() => {
        hideLoadingIndicator();
      })
      .catch((error) => {
        console.error("Error fetching iterations for team:", error);
        hideLoadingIndicator();
      });
  }

  totalCalls = 0;
}

// Function to clear the form inputs
function clearForm() {
  $("#feature-id").val("");
  $("#area-path").val("");
  $("#iteration").val("");
  $("#deliverable-prefix").val("");
  $("#estimates-sum").val("");
}

// Function to reset the deliverable items
function resetDeliverableItems() {
  const $deliverableItems = $(".deliverable-item");
  $deliverableItems.find(".deliverable-title").val("");
  // Clear rich text editor content
  $deliverableItems.find(".deliverable-description").empty();

  const prefixValue = "";
  $(".deliverable-item").each(function () {
    const $prefixField = $(this).find(".deliverable-prefix");
    $prefixField.val(prefixValue);
    $prefixField.trigger("input"); // Trigger input event to update the deliverable titles
  });

  $deliverableItems.each(function (index) {
    if (index > 0) {
      $(this).remove();
    } else {
      const $taskItems = $(this).find(".task-item");
      $taskItems.not(":first").remove();
      $taskItems.find(".task-title").val("");
      $taskItems.find(".task-estimate").val("");
      // Clear rich text editor content
      $taskItems.find(".task-description").empty();
    }
  });

  // Collapse all description sections and reset caret icons
  $deliverableItems.find(".description-section").hide();
  $deliverableItems.find(".description-caret").removeClass("rotated");

  updateDeliverableCount();
  updateTaskCount();
  updateDeleteDeliverableButtons();
  updateDeleteTaskButtons();
  updateDeliverableEstimates();
  updateFeatureEstimate();
}

// Function to set the progress bar percentage
function setProgressBar(percentage) {
  displayProgressBar();
  const progressBar = document.getElementById("progress-bar");
  if (percentage >= 0 && percentage <= 100) {
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute("aria-valuenow", percentage);
  } else {
    console.error("Invalid percentage. Percentage must be between 0 and 100.");
  }
}

// Function to stop the progress bar animation
function stopProgressBar(isError) {
  const progressBar = document.getElementById("progress-bar");

  if (isError == true) {
    progressBar.classList.add("bg-danger");
  }

  progressBar.classList.remove("progress-bar-animated");
}

// Function to display PAT popup
function showPATPopup(isRetryAttempt) {
  if (isRetryAttempt == false) {
    $("#pat-popup-invalid-p").hide();
    $("#pat-popup-modal").modal("show");
  } else {
    $("#pat-popup-invalid-p").show();
    $("#pat-popup-modal").modal("show");
  }
}

// Function to close the PAT input popup
function closePatPopup() {
  $("#pat-popup-modal").modal("hide");
}

// Function to get feature details
async function fetchFeatureDetails() {
  const featureId = $("#feature-id").val();
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  const headers = await generateAuthHeaders(usePAT);

  if (featureId && organization && project) {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/${featureId}?api-version=7.0`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: headers,
      });

      if (response.ok) {
        return await response.json();
      } else {
        if (response.status == 404) {
          hideLoadingIndicator();
          showErrorPopup(
            "Feature with Id '" + featureId + "' not found. Verify the Feature Id, selected Organization & Project"
          );
          $("#feature-id").addClass("is-invalid");
          $("#feature-name").text("");
          $("#feature-name").attr("href", "#");
        } else {
          console.error("Error:", response.statusText);
          throw new Error("Network response was not ok");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
}

// Function to fetch the user's public alias
async function fetchUserPublicAlias() {
  const url = `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0`;
  const authHeaders = await generateAuthHeaders(usePAT);

  try {
    const response = await $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    });

    return response.publicAlias;
  } catch (error) {
    console.error("Error fetching public alias:", error);
  }
}

// Function to fetch organizations the user has access to
async function fetchUserOrganizations(publicAlias) {
  const url = `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${publicAlias}&api-version=7.1`;
  const authHeaders = await generateAuthHeaders(usePAT);

  try {
    const response = await $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    });

    return response.value;
  } catch (error) {
    console.error("Error fetching organizations:", error);
  }
}

// Function to populate organizations into organization-select
async function populateOrganizationsDropdown() {

  //Fetch user's public alias
  const publicAlias = await fetchUserPublicAlias();
  if (!publicAlias) {
    hideLoadingIndicator();
    console.error("No public alias found.");
    showNonDismissibleErrorPopup("You do not have access to Azure DevOps. Ensure that you are able to access atleast one <b>Organization</b> - 'https://dev.azure.com/'");
    return;
  }

  //Fetch user's organization based on the public alias
  const organizations = await fetchUserOrganizations(publicAlias);
  if (!organizations || organizations.length === 0) {
    hideLoadingIndicator();
    showNonDismissibleErrorPopup("You do not have access to any <b>Organization</b> in Azure DevOps. Ensure that you are able to access atleast one <b>Organization</b> - 'https://dev.azure.com/'");
    return;
  }

  //Populate the dropdown with fetched organizations
  const organizationSelect = document.getElementById("organization-select");

  // Clear existing options
  while (organizationSelect.options.length > 1) {
    organizationSelect.remove(1);
  }

  // Sort organizations in alphabetical order
  organizations.sort((a, b) => (a.accountName > b.accountName ? 1 : -1));

  // Add fetched organizations as options
  organizations.forEach((organization) => {
    const option = document.createElement("option");
    option.value = organization.accountName;
    option.textContent = organization.accountName;
    organizationSelect.appendChild(option);
  });
}


// Function to fetch projects from a given organization
async function fetchProjectsForOrganization(organization) {
  const url = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.0`;
  const authHeaders = await generateAuthHeaders(usePAT);

  try {
    const response = await $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    });

    return response.value;
  } catch (error) {
    if (error.status === 404) {
      console.warn("Projects not found:", error);
      return []; // Return an empty array in case of 404
    } else {
      console.error("Error fetching projects:", error);
    }
  }
}

// Function to clear project-select dropdown
function clearProjectSelect() {
  const projectSelect = document.getElementById("project-select");

  // Remove all options except the first one
  while (projectSelect.options.length > 1) {
    projectSelect.remove(1);
  }

  projectSelect.selectedIndex = 0;
  projectSelect.disabled = true;
}

// Function to populate projects into project-select
async function populateProjectsDropdown() {
  const organization = $("#organization-select").val();
  const projects = await fetchProjectsForOrganization(organization);

  // Show error alert if no projects are accessible
  if (projects.length === 0) {
    hideLoadingIndicator();
    showErrorPopup("You do not have access to any <b>Project</b> in the selected <b>Organization</b>. Use the dropdowns to select your <b>Organization</b>");
    return;
  }

  // Clear existing options
  clearProjectSelect();

  //sort projects in alphabetical order
  projects.sort((a, b) => (a.name > b.name ? 1 : -1));

  // Add fetched projects as options
  const projectSelect = document.getElementById("project-select");
  
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.name;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });

  projectSelect.disabled = false;
}

// Function to construct Auth Headers for Azure DevOps
async function generateAuthHeaders(usePAT) {
  const headers = {};

  if (usePAT) {
    authToken = getTokenFromLocalStorage();
    const base64PAT = btoa(`:${authToken}`);
    headers["Authorization"] = `Basic ${base64PAT}`;
  } else {
    try {
      let accessToken = await getAccessToken();
      headers["Authorization"] = `Bearer ${accessToken}`;
    } catch (error) {
      console.error("Error getting access token:", error);
      throw error;
    }
  }

  return headers;
}

// Show loading indicator
function showLoadingIndicator(message) {
  $(".loading-indicator").show();
  $(".loading-overlay").show();

  if (message) {
    $(".loading-text").text(message).addClass("show");
  } else {
    $(".loading-text").removeClass("show"); // Hide text if no message
  }
}

// Hide loading indicator
function hideLoadingIndicator() {
  $(".loading-indicator").hide();
  $(".loading-overlay").hide();
  $(".loading-text").removeClass("show");
}

// Function to populate the form with preconfigured data
async function populateFormWithPreconfiguredData(data) {
  // Track whether any deliverable or task includes a description (non-empty after trim)
  let hasAnyDescription = false;
  const $firstDeliverable = $(".deliverable-item:first");
  const $firstTaskItem = $firstDeliverable.find(".task-item:first");
  $firstDeliverable.removeClass("is-invalid");
  $firstTaskItem.removeClass("is-invalid");
  $firstTaskItem.find(".task-title").removeClass("is-invalid");
  $firstTaskItem.find(".task-estimate").removeClass("is-invalid");

  // Remove existing deliverable items except the first one with a smooth transition
  $(".deliverable-item")
    .not(":first")
    .slideUp(200, function () {
      $(this).remove();
    });

  // Remove all tasks
  $(".task-item").not(":first").remove();

  // Clone the first task item for subsequent tasks
  const $taskItemTemplate = $firstTaskItem.clone();

  // Loop through each additional deliverable in the preconfigured data
  for (let i = 0; i < data.template.workitems.length; i++) {
    const deliverable = data.template.workitems[i];
    if (deliverable.description && deliverable.description.trim()) {
      hasAnyDescription = true;
    }
    const $newDeliverable = $firstDeliverable.clone();

    $newDeliverable.attr("data-index", i + 1);
    updateDeliverable($newDeliverable, deliverable);

    // Clear any existing task items in the new deliverable
    $newDeliverable.find(".task-item").not(":first").remove();

    // Clone the first task item for each task in the deliverable
    for (let j = 1; j < deliverable.tasks.length; j++) {
      const task = deliverable.tasks[j];
      if (task.description && task.description.trim()) {
        hasAnyDescription = true;
      }
      const $newTaskItem = $taskItemTemplate.clone();
      updateTask($newTaskItem, task);
      $newDeliverable.find(".task-list").append($newTaskItem);

      // Remove is-invalid class from both task title and task estimate inputs
      $newTaskItem.find(".task-title").removeClass("is-invalid");
      $newTaskItem.find(".task-estimate").removeClass("is-invalid");
    }

    // Append the new deliverable with a smooth transition
    $newDeliverable.hide().appendTo("#deliverables-container").slideDown(200);

    // Initialize sortable for tasks in the new deliverable
    $newDeliverable.find(".task-list").sortable({
      handle: ".drag-handle",
      axis: "y", // Allow vertical dragging only
      containment: "parent", // Contain within the parent deliverable
      tolerance: "pointer", // Drag only when pointer is within the task item
    });
  }

  // If no descriptions present anywhere, ensure all description sections remain collapsed
  if (!hasAnyDescription) {
    $("#deliverables-container .description-section").each(function() {
      $(this).hide();
    });
    $("#deliverables-container .description-caret").removeClass("rotated");
  }

  $firstDeliverable.remove();
}

// Function to remove all deliverables and tasks
async function removeAllDeliverablesAndTasks() {
  // Remove existing deliverables with a smooth transition
  $(".deliverable-item").slideUp(200, function () {
    $(this).remove();
  });
}

// Function to update a deliverable item with the given data
function updateDeliverable($deliverableItem, data) {
  $deliverableItem.find(".deliverable-title").val(data.title);
  $deliverableItem.find(".deliverable-title").removeClass("is-invalid");
  
  // Set rich text content
  const $descriptionEditor = $deliverableItem.find(".deliverable-description");
  if (window.RichTextEditor && window.ENABLE_RICH_TEXT_EDITOR) {
    window.RichTextEditor.setRichTextContent($descriptionEditor, window.RichTextEditor.convertPlainTextToHtml(data.description || ""));
  } else {
    if ($descriptionEditor.is('textarea')) {
      $descriptionEditor.val(data.description || "");
      // Trigger autoresize if available
      $descriptionEditor.trigger('input');
    } else {
      $descriptionEditor.text(data.description || "");
    }
  }

  // Expand description section if there's content
  if (data.description && data.description.trim()) {
    const $descriptionSection = $deliverableItem.find(".description-section");
    const $caret = $deliverableItem.find(".description-caret");
    $descriptionSection.show();
    $caret.addClass("rotated");
  }

  // Update the first task item with the task data
  const $firstTaskItem = $deliverableItem.find(".task-item:first");
  $firstTaskItem.removeClass("is-invalid");
  updateTask($firstTaskItem, data.tasks[0]);
}

// Function to update a task item with the given data
function updateTask($taskItem, data) {
  $taskItem.find(".task-title").val(data.title);
  $taskItem.find(".task-estimate").val(data.estimate);
  
  // Set rich text content
  const $descriptionEditor = $taskItem.find(".task-description");
  if (window.RichTextEditor && window.ENABLE_RICH_TEXT_EDITOR) {
    window.RichTextEditor.setRichTextContent($descriptionEditor, window.RichTextEditor.convertPlainTextToHtml(data.description || ""));
  } else {
    if ($descriptionEditor.is('textarea')) {
      $descriptionEditor.val(data.description || "");
      $descriptionEditor.trigger('input');
    } else {
      $descriptionEditor.text(data.description || "");
    }
  }

  // Expand description section if there's content
  if (data.description && data.description.trim()) {
    const $descriptionSection = $taskItem.find(".description-section");
    const $caret = $taskItem.find(".description-caret");
    $descriptionSection.show();
    $caret.addClass("rotated");
  }
}

// Function to calculate and display the total estimate
function updateFeatureEstimate() {
  let totalEstimate = 0;
  const taskEstimates = document.querySelectorAll(".task-estimate");

  // Loop through all task estimates and sum their values
  taskEstimates.forEach((taskEstimate) => {
    if (!isNaN(taskEstimate.value) && taskEstimate.value != "") {
      totalEstimate += parseFloat(taskEstimate.value);
    }
  });

  if (isNaN(totalEstimate)) {
    totalEstimate = 0;
  }

  // Update the content of the total-estimate div with the calculated sum
  const totalEstimateElement = document.getElementById("estimates-sum");
  totalEstimateElement.textContent = `${totalEstimate}`;
}

// Function to fetch teams from Azure DevOps
async function populateTeamProfile() {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  if (organization && project) {
    const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams?api-version=7.0&$mine=true`;
    const authHeaders = await generateAuthHeaders(usePAT);
    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        const teams = data.value.sort((a, b) => a.name.localeCompare(b.name));
        populateTeamDropdown(teams);

        if (teams.length >= 1) {
          fetchWorkItemTypes().then(() => fetchAreaPathsForTeam()).then(() => fetchIterationsForTeam()).then(() => fetchUsersInTeam()).then(() => hideLoadingIndicator());
        }
      })
      .fail((xhr, textStatus, errorThrown) => {
        if (xhr.status === 401) {
          // Handle 401 (Unauthorized) response status
          console.error("Unauthorized. Please check your authentication. Logging out the user");
          logout();
        } else {
          console.log(errorThrown);
          hideLoadingIndicator();
          showErrorPopup("Error fetching teams. Check console log.");
        }
      });
  } else {
    return Promise.reject("Please select both Organization and Project.");
  }
}

// Function to populate the "Team" dropdown
function populateTeamDropdown(teams) {
  if (teams.length === 0) {
    // Enter fallback mode: allow proceeding without team membership
    noTeamAccess = true;
    clearTeamDropdown();
    const teamSelect = document.getElementById("team-select");
    // Keep control disabled (no selectable team) but visually indicate fallback
    const placeholder = teamSelect.options[0];
    if (placeholder) {
      placeholder.textContent = "No Teams (Proceed Without Team)";
    }
    // Immediately inform the user (don't block on Work Item Types fetch)
    hideLoadingIndicator();
    showInfoPopup("You are not a member of any <b>Team</b> in the selected <b>Project</b>. Automatic <b>Area Path</b> and <b>Iteration</b> suggestions are unavailable. Work Item Types are loading in the background. You can proceed now by: <ul><li>Manually entering the Area Path and Iteration</li><li>Selecting a Work Item Type (once loaded)</li><li>Choosing an Assignee (type 4+ characters to search the organization)</li></ul>");
    // Kick off background fetch of work item types & enable assignee fallback immediately
    enableAssigneeFallback();
    fetchWorkItemTypes()
      .catch(err => {
        console.warn('Failed to fetch Work Item Types in no-team fallback', err);
        showErrorPopup('Failed to load Work Item Types. Retry after selecting project again.');
      });
  } else {
    noTeamAccess = false;
    clearTeamDropdown();
    const teamSelect = document.getElementById("team-select");
    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      teamSelect.appendChild(option);
    });
    teamSelect.disabled = false;
  }
}

// Function to clear team-select dropdown
function clearTeamDropdown() {
  const teamSelect = document.getElementById("team-select");

  // Remove all options except the first one
  while (teamSelect.options.length > 1) {
    teamSelect.remove(1);
  }

  teamSelect.selectedIndex = 0;
  teamSelect.disabled = true;
}

// Function to fetch iterations for the selected team from Azure DevOps using AJAX
async function fetchIterationsForTeam() {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  const team = $("#team-select").val();
  if (organization && project && team) {
    const url = `https://dev.azure.com/${organization}/${project}/${team}/_apis/work/teamsettings/iterations?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        const iterations = data.value;
        populateIterationSuggestions(iterations);
      })
      .fail((xhr, textStatus, errorThrown) => {
        if (xhr.status === 401) {
          console.error("Unauthorized. Please check your authentication. Logging out the user");
          logout();
        } else {
          console.log(errorThrown);
          hideLoadingIndicator();
          showErrorPopup("Error fetching iterations. Check console log.");
        }
      });
  } else {
    return Promise.reject("Please select organization, project & team.");
  }
}

// Function to fetch work-item types
async function fetchWorkItemTypes() {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();

  if (organization && project) {
    const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);

    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        const workItemTypes = data.value.sort((a, b) => a.name.localeCompare(b.name));
        populateWorkItemTypesDropdown(workItemTypes);
      })
      .fail((xhr, textStatus, errorThrown) => {
        if (xhr.status === 401) {
          // Handle 401 (Unauthorized) response status
          console.error("Unauthorized. Please check your authentication. Logging out the user");
          logout();
        } else {
          console.log(errorThrown);
          hideLoadingIndicator();
          showErrorPopup("Error fetching Work Item Types. Check console log.");
        }
      });
  } else {
    return Promise.reject("Please select both Organization and Project.");
  }
}

// Function to fetch users in the selected team and populate the "Assigned To" dropdown
async function fetchUsersInTeam() {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  const team = $("#team-select").val();

  if (organization && project && team) {
    // Use expandMembership=true to get all nested group members (Entra Groups, nested teams, etc.)
    const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams/${team}/members?$expandMembership=true&api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        //hideLoadingIndicator();
        console.log("Fetched expanded team members:", data.value.length, "members");
        populateAssignedToDropdown(data.value); // Populate the dropdown on success
      })
      .fail((xhr, textStatus, errorThrown) => {
        //hideLoadingIndicator();
        if (xhr.status === 401) {
          // Handle 401 (Unauthorized) response status
          console.error("Unauthorized. Please check your authentication. Logging out the user.");
          logout(); // Assuming a logout function is defined
        } else {
          console.error("Error fetching team users:", errorThrown);
          hideLoadingIndicator();
          showErrorPopup("Error fetching Team Users. Check console log.");
        }
      });
  } else {
    return Promise.reject("Please select organization, project, and team.");
  }
}

// Function to clear assigned-to-select dropdown
function clearAssignedToDropdown() {
  const $assignedToSelect = $("#assigned-to-select");
  
  if ($assignedToSelect.length > 0) {
    // Clear all options except the first one (placeholder)
    $assignedToSelect.find('option:not(:first)').remove();
    
    // Reset to placeholder option
    $assignedToSelect.val('').trigger('change');
    
    // Disable the dropdown
    $assignedToSelect.prop('disabled', true);
    
    // Remove validation styling
    $assignedToSelect.removeClass('is-invalid');
  }
}

// Fallback: enable assignee dropdown even without team membership (org-wide search only)
function enableAssigneeFallback() {
  const $assignedToSelect = $("#assigned-to-select");
  if (!$assignedToSelect.length) return;
  // If already enabled & populated, skip
  if (!$assignedToSelect.prop('disabled')) return;
  // Ensure at least current user (if known) is available for quick selection
  $assignedToSelect.find('option:not(:first)').remove();
  if (userDisplayName && userEmailId) {
    const opt = new Option(userDisplayName + ' (You)', userEmailId, true, true);
    $(opt).attr('data-user-id','current-user').attr('data-display-name', userDisplayName).attr('data-email', userEmailId);
    $assignedToSelect.append(opt);
  }
  $assignedToSelect.prop('disabled', false).trigger('change');
}

// Function to populate the "Assigned To" dropdown
function populateAssignedToDropdown(users) {
  clearAssignedToDropdown();
  
  const $assignedToSelect = $("#assigned-to-select");
  
  if (!$assignedToSelect.length) {
    console.error("Assigned to dropdown element not found");
    return;
  }

  // Add the current user as the default option
  if (userDisplayName && userEmailId) {
    const currentUserOption = new Option(userDisplayName, userEmailId, true, true);
    $(currentUserOption).attr('data-user-id', 'current-user');
    $(currentUserOption).attr('data-display-name', userDisplayName);
    $(currentUserOption).attr('data-email', userEmailId);
    $assignedToSelect.append(currentUserOption);
  }

  if (users && users.length > 0) {
    // Filter out invalid users and sort by displayName
    const validUsers = users.filter((user) => {
      const identity = user.identity;
      return identity && 
             identity.displayName && 
             identity.uniqueName && 
             identity.uniqueName !== userEmailId && 
             emailRegex.test(identity.uniqueName) &&
             // Filter out service accounts and inactive users
             !identity.displayName.toLowerCase().includes('[service]') &&
             !identity.displayName.toLowerCase().includes('[inactive]') &&
             // Only include users, not groups
             (!user.isContainer || user.isContainer === false);
    });

    // Sort users by displayName
    validUsers.sort((a, b) => a.identity.displayName.localeCompare(b.identity.displayName));

    // Populate dropdown with the sorted and valid users
    for (const user of validUsers) {
      const displayName = user.identity.displayName;
      const emailAddress = user.identity.uniqueName;
      const userId = user.identity.id;
      
      // Add to select with data attributes for avatar rendering
      const option = new Option(displayName, emailAddress);
      $(option).attr('data-user-id', userId);
      $(option).attr('data-display-name', displayName);
      $(option).attr('data-email', emailAddress);
      $assignedToSelect.append(option);
    }

    console.log(`Populated dropdown with ${validUsers.length} valid users out of ${users.length} total members`);
  }

  // Enable the dropdown and trigger Select2 update
  $assignedToSelect.prop("disabled", false);
  $assignedToSelect.trigger('change');

  // Prefetch avatars in background to eliminate lag on first dropdown open
  prefetchAssigneeAvatars();
}

// Function to initialize Select2 dropdowns
function initializeSelect2Dropdowns() {
  // Initialize organization dropdown
  $('#organization-select').select2({
    placeholder: 'Select an Organization',
    allowClear: false,
    width: '100%',
    dropdownAutoWidth: true,
    closeOnSelect: true,
    minimumResultsForSearch: 0, // Always show search box
    dropdownCssClass: 'select2-dropdown-large'
  });
  
  // Initialize project dropdown
  $('#project-select').select2({
    placeholder: 'Select a Project',
    allowClear: false,
    width: '100%',
    dropdownAutoWidth: true,
    closeOnSelect: true,
    minimumResultsForSearch: 0, // Always show search box
    dropdownCssClass: 'select2-dropdown-large'
  });
  
  // Initialize team dropdown
  $('#team-select').select2({
    placeholder: 'Select a Team',
    allowClear: false,
    width: '100%',
    dropdownAutoWidth: true,
    closeOnSelect: true,
    minimumResultsForSearch: 0, // Always show search box
    dropdownCssClass: 'select2-dropdown-large'
  });
  
  // Initialize assignee dropdown with avatar support
  $('#assigned-to-select').select2({
    placeholder: 'Select an Assignee',
    allowClear: false,
    width: '100%',
    closeOnSelect: true,
    templateResult: formatUserOption,
    templateSelection: formatUserSelection,
    escapeMarkup: function(markup) { return markup; },
    minimumResultsForSearch: 0, // Always show search box
    dropdownCssClass: 'select2-dropdown-large'
  });
}

// Format user options with avatars
function formatUserOption(user) {
  if (!user.id) {
    return user.text;
  }
  const $user = $(user.element);
  const userId = $user.data('user-id');
  const displayName = $user.data('display-name') || user.text;
  const email = $user.data('email') || $user.val() || '';
  const avatarUrl = avatarCache.get(userId) || createAvatarCanvas(displayName);
  return $(
    `<div class="select2-user-option" data-user-id="${userId || ''}" data-display-name="${displayName}">
      <img class="select2-user-image" src="${avatarUrl}" alt="${displayName}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;">
      <div class="select2-user-text">
        <div class="select2-user-name">${displayName}</div>
        ${email ? `<div class=\"select2-user-email\">${email}</div>` : ''}
      </div>
    </div>`
  );
}

// Format selected user with avatar
function formatUserSelection(user) {
  if (!user.id) {
    return user.text;
  }
  
  const $user = $(user.element);
  const userId = $user.data('user-id');
  const displayName = $user.data('display-name') || user.text;
  
  let avatarUrl = avatarCache.get(userId) || createAvatarCanvas(displayName);
  // Kick off fetch only if not cached (will update all rendered instances once loaded)
  if (!avatarCache.has(userId) && userId && userId !== 'current-user') {
    fetchUserAvatar(userId, displayName).then(real => {
      avatarCache.set(userId, real);
      // Update any rendered selection image
      $('.select2-user-image').filter(`[data-user-id="${userId}"]`).attr('src', real);
      $('.select2-selection__rendered .select2-user-image').attr('src', real);
    }).catch(()=>{});
  }
  
  return $(`
    <div class="select2-user-selection">
      <img class="select2-user-image" src="${avatarUrl}" alt="${displayName}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 6px;">
      <span>${displayName}</span>
    </div>
  `);
}

// Function to fetch area paths for the selected team
async function fetchAreaPathsForTeam() {
  const organization = $("#organization-select").val();
  const project = $("#project-select").val();
  const team = $("#team-select").val();
  if (organization && project && team) {
    const url = `https://dev.azure.com/${organization}/${project}/${team}/_apis/work/teamsettings/teamfieldvalues?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        const areaPaths = data.values;
        populateAreaPathSuggestions(areaPaths);
      })
      .fail((xhr, textStatus, errorThrown) => {
        if (xhr.status === 401) {
          console.error("Unauthorized. Please check your authentication. Logging out the user");
          logout();
        } else {
          console.log(errorThrown);
          hideLoadingIndicator();
          showErrorPopup("Error fetching area paths. Check console log.");
        }
        return []; // Return an empty array in case of an error
      });
  } else {
    return Promise.reject("Please select organization, project & team.");
  }
}

// Function to populate the "Iteration" suggestions in reverse order
function populateIterationSuggestions(iterations) {
  const suggestionsList = document.getElementById("suggested-iterations-list");
  suggestionsList.innerHTML = "";

  for (let i = iterations.length - 1; i >= 0; i--) {
    const iteration = iterations[i];
    const option = document.createElement("option");
    option.value = iteration.path;

    // Check if the iteration's timeFrame is "current"
    if (iteration.attributes.timeFrame === "current") {
      option.textContent = `${iteration.path} (current)`;
    } else {
      option.textContent = iteration.path;
    }

    suggestionsList.appendChild(option);
  }
}

// Function to populate the "Suggested Area Paths" suggestions
function populateAreaPathSuggestions(areaPaths) {
  const suggestionsList = document.getElementById("suggested-area-paths-list");
  suggestionsList.innerHTML = "";

  areaPaths.forEach((areaPath) => {
    const option = document.createElement("option");
    option.value = areaPath.value;
    suggestionsList.appendChild(option);
  });
}

async function fetchUserProfileImage() {
  const accessToken_ = await getAccessToken_NoScopes();

  // Initialize MS Graph client using the access token
  const graphClient = MicrosoftGraph.Client.init({
    authProvider: (done) => {
      // Provide the access token to the authProvider
      done(null, accessToken_);
    },
  });

  // Fetch user profile picture
  graphClient
    .api("/me/photo/$value")
    .responseType("blob")
    .get()
    .then((imageBlob) => {
      // Create a Blob URL from the image blob
      const imageURL = URL.createObjectURL(imageBlob);

      // Set the image URL as the src attribute of the user profile image
      const userProfileImage = document.querySelector(".user-profile-image");
      userProfileImage.src = imageURL;
    })
    .catch((error) => {
      console.error("Error fetching profile picture:", error);
    });
}

// Function to generate avatar initials for users
function generateAvatarInitials(displayName) {
  if (!displayName) return 'U';
  
  const names = displayName.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  } else {
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }
}

// Function to generate a color based on the user's name
function generateAvatarColor(displayName) {
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
  ];
  
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Function to create an avatar canvas element
function createAvatarCanvas(displayName, size = 24) {
  // Use higher DPI for sharper rendering
  const devicePixelRatio = window.devicePixelRatio || 1;
  const scaledSize = size * devicePixelRatio;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set actual canvas size (scaled for high DPI)
  canvas.width = scaledSize;
  canvas.height = scaledSize;
  
  // Set display size (what the browser will show)
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  
  // Scale the context to match device pixel ratio
  ctx.scale(devicePixelRatio, devicePixelRatio);
  
  // Enable anti-aliasing and better text rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.textRenderingOptimization = 'optimizeQuality';
  
  // Fill background with rounded corners for better appearance
  const radius = size * 0.1; // 10% radius for slight rounding
  ctx.fillStyle = generateAvatarColor(displayName);
  ctx.beginPath();
  
  // Use roundRect if available, otherwise fall back to regular rect
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, size, size, radius);
  } else {
    // Fallback: create rounded rectangle manually
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
  }
  ctx.fill();
  
  // Add text with improved font rendering
  ctx.fillStyle = '#ffffff';
  // Use a slightly larger font size for better clarity
  const fontSize = Math.max(Math.floor(size * 0.45), 10); // Minimum 10px font
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add subtle text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 1;
  
  const initials = generateAvatarInitials(displayName);
  ctx.fillText(initials, size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
}

// In-memory avatar cache (userId -> dataURL/URL)
const avatarCache = new Map();

// Function to fetch user avatar (direct identityImage with caching, then fallback to generated initials)
async function fetchUserAvatar(userId, displayName) {
  const organization = $('#organization-select').val();
  if (!organization || !userId) {
    return createAvatarCanvas(displayName);
  }

  // Return from cache if present
  if (avatarCache.has(userId)) {
    return avatarCache.get(userId);
  }

  // 1. Attempt direct identity image endpoint (works for interactive auth/cookie sessions)
  //    This mirrors the "working reference" provided.
  const identityImageUrl = `https://dev.azure.com/${organization}/_api/_common/identityImage?id=${userId}&size=2`;

  const tryDirectIdentityImage = () => new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    img.onload = () => { if (!settled) { settled = true; resolve(identityImageUrl); } };
    img.onerror = () => { if (!settled) { settled = true; resolve(null); } };
    img.src = identityImageUrl;
    // Safety timeout
    setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, 2000);
  });

  const directResult = await tryDirectIdentityImage();
  if (directResult) {
  avatarCache.set(userId, directResult);
  return directResult;
  }

  // 2. Final fallback: generated initials avatar (and cache)
  const generated = createAvatarCanvas(displayName);
  avatarCache.set(userId, generated);
  return generated;
}

// Function to update avatars in the assignee dropdown after it's rendered
function updateAssigneeDropdownAvatars() {
  const $userOptions = $('.select2-container--open .select2-user-option');
  $userOptions.each(function() {
    const $option = $(this);
    const userId = $option.attr('data-user-id');
    const displayName = $option.attr('data-display-name');
    const $img = $option.find('.select2-user-image');
    if (userId && userId !== 'current-user' && $img.length > 0 && !avatarCache.has(userId)) {
      fetchUserAvatar(userId, displayName).then(url => {
        avatarCache.set(userId, url);
        $img.attr('src', url);
      }).catch(() => {});
    } else if (avatarCache.has(userId)) {
      $img.attr('src', avatarCache.get(userId));
    }
  });
}

// Prefetch avatars after dropdown population to reduce first-open lag
function prefetchAssigneeAvatars(max = 40) {
  if (typeof usePAT !== 'undefined' && usePAT) {
    // Direct identity image likely won't work with PAT-only auth (no browser cookie); skip to avoid wasted requests
    return;
  }
  const $options = $('#assigned-to-select option');
  let count = 0;
  $options.each(function() {
    if (count >= max) return false; // break
    const userId = $(this).data('user-id');
    const displayName = $(this).data('display-name');
    if (userId && userId !== 'current-user' && !avatarCache.has(userId)) {
      // Stagger requests slightly
      setTimeout(() => {
        fetchUserAvatar(userId, displayName).catch(()=>{});
      }, count * 50); // 50ms spacing
      count++;
    }
  });
}

// Function to clear PAT from local storage and reload the page
function logout() {
  if (usePAT) {
    clearTokenFromLocalStorage();
    window.location.reload();
  } else {
    signOut();
  }
}

let prefilCategoryChoice = "";
// Function to populate the prefil work items dropdown and attach the event handler
async function populatePrefilWorkItemsDropdown() {
  const dropdownMenu = $(".preconfigured-templates-dropdown");

  // Loop through the JSON data and create dropdown options
  $.each(workItemTemplatesList, function (index, item) {
    const option = $("<a>", {
      class: "dropdown-item preconfigured-choice",
      href: "#",
      "data-choice": item.fileName,
      html: `${item.displayName}`,
    });

    // Attach the click event handler to the option element
    option.on("click", function (event) {
      event.preventDefault();
      prefilCategoryChoice = $(this).data("choice");
      $("#load-preconfigured-items-confirmationModal").modal("show");
    });

    // Append the option to the dropdown menu
    dropdownMenu.append(option);
  });
}

// Function to read a file from the public folder
async function readJSONFileByNameFromPublicFolder(jsonFilePath) {
  // Define the path to the public folder
  const publicFolderPath = ""; //empty as of now

  // Construct the full URL to the file
  var url = new URL(window.location.href);
  var currentURL = url.origin + "/" + publicFolderPath + "/" + jsonFilePath;
  try {
    // Use a Promise with async/await to load the file content
    const data = await new Promise((resolve, reject) => {
      $.ajax({
        url: currentURL,
        dataType: "json",
        success: function (data) {
          // Resolve the Promise with the file content
          resolve(data);
        },
        error: function (xhr, status, error) {
          if (xhr.status === 401) {
            console.error("Unauthorized. Please check your authentication. Logging out the user");
            logout();
          } else if (xhr.status === 404) {
            var message = "File with the given name wasn't found:" + fileName;
            console.error(message);
            hideLoadingIndicator();
            showErrorPopup(message);
          } else {
            console.log(errorThrown);
            hideLoadingIndicator();
            showErrorPopup("Error fetching the file. Check console log.");
          }
          reject(error);
        },
      });
    });

    // Return the file content
    return data;
  } catch (error) {
    throw error; // Re-throw the error to propagate it
  }
}

// ================= Assignee (Org-wide search) Enhancements =================
// Cache of original team members to allow reverting when query is short
let teamMembersSnapshot = [];
// Simple in-memory cache for org-wide search results (query -> users array)
const orgUserSearchCache = new Map();
// Debounce timer id
let assigneeSearchDebounce = null;
// Track last applied query to avoid redundant DOM work
let lastAssigneeAppliedQuery = '';

// Clean up avatar cache (referenced in eventHandlers.js)
function cleanupAvatarCache() {
  try { avatarCache.clear(); } catch (_) {}
}

// Wrap populateAssignedToDropdown to also snapshot team members once (only when called from team fetch)
const _origPopulateAssignedToDropdown = populateAssignedToDropdown;
populateAssignedToDropdown = function(users) { // eslint-disable-line no-global-assign
  _origPopulateAssignedToDropdown(users);
  // Build snapshot of valid users (exclude placeholder & current user duplication rules mirror original filtering)
  if (Array.isArray(users)) {
    const filtered = users.filter(u => {
      const identity = u.identity;
      return identity && identity.displayName && identity.uniqueName && emailRegex.test(identity.uniqueName) && (!u.isContainer || u.isContainer === false) && !identity.displayName.toLowerCase().includes('[service]') && !identity.displayName.toLowerCase().includes('[inactive]');
    }).map(u => ({
      id: u.identity.id,
      displayName: u.identity.displayName,
      email: u.identity.uniqueName
    }));
    teamMembersSnapshot = filtered;
  }
};

// Build option elements for the assignee select from generic user objects
function rebuildAssigneeOptionsFromGenericUsers(users, { preserveSelection = true, isOrgSearch = false, silent = false } = {}) {
  const $assignedToSelect = getAssignedToSelect();
  if (!$assignedToSelect.length) return;
  const currentVal = $assignedToSelect.val();
  // Remove all except placeholder
  $assignedToSelect.find('option:not(:first)').remove();

  // Always add current user first if available (so they can quickly pick themselves)
  if (userDisplayName && userEmailId) {
    const currentUserOption = new Option(userDisplayName + ' (You)', userEmailId, false, false);
    $(currentUserOption).attr('data-user-id', 'current-user');
    $(currentUserOption).attr('data-display-name', userDisplayName);
    $assignedToSelect.append(currentUserOption);
  }

  // Sort users by display name
  const deduped = [];
  const seenEmails = new Set();
  for (const u of users) {
    if (!u || !u.email || seenEmails.has(u.email) || u.email === userEmailId) continue;
    seenEmails.add(u.email);
    deduped.push(u);
  }
  deduped.sort((a,b)=> a.displayName.localeCompare(b.displayName));
  for (const u of deduped) {
    const opt = new Option(u.displayName, u.email, false, false);
    $(opt).attr('data-user-id', u.id || '');
    $(opt).attr('data-display-name', u.displayName);
  $(opt).attr('data-email', u.email);
    if (isOrgSearch) { $(opt).attr('data-source', 'org'); } else { $(opt).attr('data-source', 'team'); }
    $assignedToSelect.append(opt);
  }

  // Restore selection if still present
  if (preserveSelection && currentVal && seenEmails.has(currentVal)) {
    $assignedToSelect.val(currentVal);
  } else if (preserveSelection && currentVal && currentVal === userEmailId) {
    $assignedToSelect.val(currentVal);
  } else {
    // leave unselected (placeholder) if selection disappeared
    $assignedToSelect.val($assignedToSelect.val());
  }
  if (!silent) {
    $assignedToSelect.trigger('change.select2');
  }
  // Update avatars (some may be new) after slight delay
  setTimeout(()=> updateAssigneeDropdownAvatars(), 50);
}

// Perform organization-wide search for users whose display name or email matches query
async function searchOrganizationUsers(query) {
  const organization = $('#organization-select').val();
  if (!organization || !query) return [];
  const normalized = query.trim().toLowerCase();
  if (orgUserSearchCache.has(normalized)) {
    return orgUserSearchCache.get(normalized);
  }
  try {
    const authHeaders = await generateAuthHeaders(usePAT);
    authHeaders['Content-Type'] = 'application/json';
    // Prefer subjectquery (Graph) API
    const response = await fetch(`https://vssps.dev.azure.com/${organization}/_apis/graph/subjectquery?api-version=7.1-preview.1`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ query, subjectKind: ['User'] })
    });
    let users = [];
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.value)) {
        users = data.value.map(u => ({
          id: u.descriptor || u.originId || u.id,
          displayName: u.displayName || u.principalName || u.mailAddress || 'Unknown User',
          email: u.mailAddress || u.principalName || ''
        })).filter(u => u.email && emailRegex.test(u.email));
      }
    } else {
      // Fallback to identity picker (GET) if subjectquery not permitted
      const fallbackResp = await fetch(`https://vssps.dev.azure.com/${organization}/_apis/IdentityPicker/Identities?searchFilter=General&filterValue=${encodeURIComponent(query)}&queryMembership=None&api-version=7.1-preview.1`, { headers: authHeaders });
      if (fallbackResp.ok) {
        const fData = await fallbackResp.json();
        if (Array.isArray(fData.results)) {
          users = fData.results.flatMap(r => r.identities || []).map(i => ({
            id: i.localId || i.originId || i.subjectDescriptor,
            displayName: i.displayName,
            email: i.signInAddress || i.mail || i.upn || ''
          })).filter(u => u.email && emailRegex.test(u.email));
        }
      }
    }
    // Cache under normalized query
    orgUserSearchCache.set(normalized, users);
    return users;
  } catch (e) {
    console.warn('Org user search failed', e);
    return [];
  }
}

// Show/hide spinner inside open Select2 results (assignee search)
function showAssigneeLoadingIndicator() {
  const $results = $('.select2-container--open .select2-results__options');
  if (!$results.length) return;
  if ($('#assignee-loading-indicator').length) return;
  $results.prepend('<li class="select2-results__option select2-assignee-loading" id="assignee-loading-indicator" aria-disabled="true"><span class="spinner"></span><span> Searching directory...</span></li>');
}
function hideAssigneeLoadingIndicator() { $('#assignee-loading-indicator').remove(); }

// Handle input changes in Select2 search field for assignee dropdown
// Track async search requests to avoid race conditions (out-of-order resolution overwriting newer input)
let lastAssigneeSearchRequestId = 0;
async function handleAssigneeSearchInput(rawQuery) {
  const q = (rawQuery || '').trim();
  const originalRaw = rawQuery || '';
  // Capture current caret & value BEFORE we mutate DOM/options
  const $preSearchField = $('.select2-container--open .select2-search__field');
  let caretStart = null, caretEnd = null, preValue = null;
  if ($preSearchField.length) {
    preValue = $preSearchField.val();
    if ($preSearchField[0].selectionStart != null) {
      caretStart = $preSearchField[0].selectionStart;
      caretEnd = $preSearchField[0].selectionEnd;
    }
  }
  // Thresholds: <2 chars -> revert to team members; >=4 -> org search; 2-3 -> no-op (keep current list)
  if (q.length < 4) {
    // For 0-1 chars: show full team list; for 2-3 chars: also revert to team list (previously left stale org results)
    if (lastAssigneeAppliedQuery !== '__team__') {
      rebuildAssigneeOptionsFromGenericUsers(teamMembersSnapshot, { preserveSelection: true, isOrgSearch: false, silent: true });
      lastAssigneeAppliedQuery = '__team__';
    }
    // Re-run local filtering so Select2 narrows on current query (q may be 0-3 chars)
    const $selectLocal = $('#assigned-to-select');
    const instLocal = $selectLocal.data('select2');
    if (instLocal && instLocal.isOpen && instLocal.isOpen()) {
      try {
        // Let Select2 internal filter handle current term without forcing value resets
        instLocal.trigger('query', { term: originalRaw });
      } catch (_) {
        $selectLocal.trigger('change.select2');
      }
    }
    // Restore caret if we captured it (DOM may have rebuilt)
    setTimeout(()=> {
      const $sf2 = $('.select2-container--open .select2-search__field');
      if ($sf2.length && preValue !== null) {
        // Only restore if user hasn't typed more meanwhile
        if ($sf2.val() === preValue || $sf2.val() === originalRaw) {
          if ($sf2[0].setSelectionRange && caretStart != null) {
            try { $sf2[0].setSelectionRange(caretStart, caretEnd); } catch(_) {}
          }
        }
      }
    }, 0);
    return; // Done for <4 characters
  }
  if (q === lastAssigneeAppliedQuery) return; // Already applied

  // Show inline spinner (list item)
  showAssigneeLoadingIndicator();
  const requestId = ++lastAssigneeSearchRequestId;

  const $assignedToSelect = getAssignedToSelect();

  const users = await searchOrganizationUsers(q);
  hideAssigneeLoadingIndicator();
  // If another newer request started since we kicked this off, abort applying stale results
  if (requestId !== lastAssigneeSearchRequestId) {
    return;
  }
  rebuildAssigneeOptionsFromGenericUsers(users, { preserveSelection: true, isOrgSearch: true, silent: true });
  lastAssigneeAppliedQuery = q;
  // Smoothly refresh results without closing the dropdown (avoids focus glitch)
  const $select = $('#assigned-to-select');
  const select2Instance = $select.data('select2');
  if (select2Instance && select2Instance.isOpen && select2Instance.isOpen()) {
    try {
      // Re-run query pipeline so Select2 re-filters against newly injected <option>s, preserving raw input
      select2Instance.trigger('query', { term: originalRaw });
    } catch (e) {
      // Fallback: minimal change trigger (should not steal focus)
      $select.trigger('change.select2');
    }
  }
  // Restore caret & input value (avoid overriding if user typed more during async call)
  setTimeout(()=> {
    const $sf = $('.select2-container--open .select2-search__field');
    if ($sf.length) {
      // If user hasn't changed the value (still matches original), keep it; otherwise don't touch
      if ($sf.val() === preValue || $sf.val() === originalRaw) {
        $sf.val(originalRaw);
        if ($sf[0].setSelectionRange && caretStart != null) {
          try { $sf[0].setSelectionRange(caretStart, caretEnd); } catch(_) {}
        }
      }
    }
  }, 0);
}

// Debounced wrapper exposed globally for eventHandlers to call
function debouncedAssigneeSearch(rawQuery) {
  clearTimeout(assigneeSearchDebounce);
  assigneeSearchDebounce = setTimeout(() => {
    handleAssigneeSearchInput(rawQuery);
  }, 350); // 350ms debounce
}
