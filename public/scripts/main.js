const token_key_name = "wpx_feature_planner_user_auth_token";
let totalCalls = 0;
let userEmailId = "";
let userDisplayName = "";

// Regular expression to validate email addresses
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
* Note: The word 'Deliverable' could be any work-item under the Feature/Scenario.
* User decides what that work-item type can be. These work-items contain 'Tasks'
* Feature/Scenario -> Selected Work Item Type -> Tasks
*/

// Variable to store the selected work item type details for dynamic updates
let selectedWorkItemTypeName = "Work-Item";

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

  hideLoadingIndicator();
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
  const featureId = $("#feature-id").val();
  const project = $("#project-select").val();
  const team = $("#team-select").val();
  const assignedTo = $("#assigned-to-select").val();
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

  if (!team) {
    $("#team-select").addClass("is-invalid");
    isValid = false;
    showErrorPopup(
      "Please select a <b>Team</b>. If the choices are empty, it implies that you do not have access to any Team(s)."
    );
    return;
  }

  if (!assignedTo) {
    $("#assigned-to-select").addClass("is-invalid");
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

  if (!featureId) {
    $("#feature-id").addClass("is-invalid");
    isValid = false;
  }

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
    const selectedUserEmail = $("#assigned-to-select").val();

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
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: "System.LinkTypes.Hierarchy-Reverse",
            url: `${_azureDevOpsApiBaseUrl}/_apis/wit/workItems/${featureIdVal}` + "?api-version=7.0",
            attributes: {
              comment: "Linking child Work-Item to Parent Work-Item",
            },
          },
        },
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
  // organizationSelect.innerHTML = "";

  // Sort organizations in alphabetical order
  organizations.sort((a, b) => (a.accountName > b.accountName ? 1 : -1));

  // Add fetched organizations as options
  organizations.forEach((organization) => {
    const option = document.createElement("option");
    option.value = organization.accountName;
    option.textContent = organization.accountName;

    // // Set "microsoft" as selected if found
    // if (organization.accountName.toLowerCase() === "microsoft") {
    //   option.selected = true;
    // }

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

  // //Check if the OS project exists
  // const osProject = projects.find((project) => project.name === "OS");

  // Add fetched projects as options
  const projectSelect = document.getElementById("project-select");
  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.name;
    option.textContent = project.name;

    // Set "OS" project as selected if found
    // if (osProject && project.name === osProject.name) {
    //   option.selected = true;
    // }
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
    const $newDeliverable = $firstDeliverable.clone();

    $newDeliverable.attr("data-index", i + 1);
    updateDeliverable($newDeliverable, deliverable);

    // Clear any existing task items in the new deliverable
    $newDeliverable.find(".task-item").not(":first").remove();

    // Clone the first task item for each task in the deliverable
    for (let j = 1; j < deliverable.tasks.length; j++) {
      const task = deliverable.tasks[j];
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
    $descriptionEditor.text(data.description || "");
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
    $descriptionEditor.text(data.description || "");
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
    hideLoadingIndicator();
    showErrorPopup("You do not have access to any <b>Team</b> in the selected <b>Project</b>. Select your <b>Project</b> from the dropdown.");
  } else {
    clearTeamDropdown();
    const teamSelect = document.getElementById("team-select");

    teams.forEach((team) => {
      // Create option element using plain JavaScript
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
    const url = `https://dev.azure.com/${organization}/_apis/projects/${project}/teams/${team}/members?api-version=7.0`;
    const authHeaders = await generateAuthHeaders(usePAT);
    return $.ajax({
      url: url,
      method: "GET",
      headers: authHeaders,
    })
      .done((data) => {
        //hideLoadingIndicator();
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
  const assignedToSelect = document.getElementById("assigned-to-select");

  // Remove all options except the first one
  while (assignedToSelect.options.length > 1) {
    assignedToSelect.remove(1);
  }

  assignedToSelect.selectedIndex = 0;
  assignedToSelect.disabled = true;
}

// Function to populate the "Assigned To" dropdown
function populateAssignedToDropdown(users) {
  const $assignedToDropdown = $("#assigned-to-select");
  clearAssignedToDropdown();

  // Add the current user as the default option
  if (userDisplayName && userEmailId) {
    $assignedToDropdown.append(new Option(userDisplayName, userEmailId, true, true));
  }

  if (users && users.length > 0) {
    // Sort users by displayName
    users.sort((a, b) => a.identity.displayName.localeCompare(b.identity.displayName));

    // Populate dropdown with the sorted and valid users
    users.forEach((user) => {
      const displayName = user.identity.displayName;
      const emailAddress = user.identity.uniqueName;

      // Only add the option if displayName and emailAddress are valid and emailAddress is a valid email
      if (displayName && emailAddress && emailAddress !== userEmailId && emailRegex.test(emailAddress)) {
        $assignedToDropdown.append(new Option(displayName, emailAddress));
      }
    });
  }

  $assignedToDropdown.prop("disabled", false); // Enables the dropdown
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
