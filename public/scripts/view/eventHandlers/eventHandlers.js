// Event handler document ready
$(document).ready(function () {
  showLoadingIndicator();
  console.log("Initiating AAD sign-in");
  signIn();
});

// Select2 specific event handlers for dropdown closing behavior
$(document).ready(function () {
  // Force close dropdown on selection for all dropdowns
  $('#organization-select, #project-select, #team-select, #assigned-to-select, #work-item-type-select').on('select2:select', function () {
    $(this).select2('close');
  });

  // Additional explicit close handlers for problematic dropdowns
  $('#project-select').on('select2:select', function (e) {
    e.preventDefault();
    $(this).select2('close');
  });

  $('#team-select').on('select2:select', function (e) {
    e.preventDefault();
    $(this).select2('close');
  });

  // Auto-focus search input when Select2 dropdowns are opened
  $('#organization-select, #project-select, #team-select, #assigned-to-select, #work-item-type-select').on('select2:open', function (e) {
    const dropdownId = $(this).attr('id');

    // Get the specific container for this select2 instance
    const containerId = $(this).data('select2').$container.attr('id');

    // Find and focus the search field
    const focusSearch = () => {
      // Find the search field in the opened dropdown
      const searchField = $('.select2-container--open .select2-dropdown .select2-search__field');

      if (searchField.length > 0) {
        try {
          searchField[0].focus();
          searchField[0].select(); // Select any existing text
        } catch (error) {
          console.log('Error focusing search field:', error);
        }
      }
    };

    // Single timeout should be sufficient since focus is working
    setTimeout(focusSearch, 100);

    // Special handling for assignee dropdown to load real avatars
    if (dropdownId === 'assigned-to-select') {
      setTimeout(() => {
        updateAssigneeDropdownAvatars();
      }, 200);

      // Attach input listener to the Select2 search field for assignee org-wide search
      setTimeout(() => {
        const $searchField = $('.select2-container--open .select2-search__field');
        if ($searchField.length) {
          // Remove previous handler to avoid duplicates
          $searchField.off('input.assigneeSearch keyup.assigneeSearch');
          $searchField.on('input.assigneeSearch keyup.assigneeSearch', function (ev) {
            const val = $(this).val();
            if (typeof debouncedAssigneeSearch === 'function') {
              debouncedAssigneeSearch(val);
            }
          });
        }
      }, 50);
    }
  });
});

// Event listener for description toggle buttons
$(document).on("click", ".description-toggle-btn", function (e) {
  e.preventDefault();
  const $button = $(this);
  const $caret = $button.find(".description-caret");
  const $descriptionSection = $button.closest(".form-group, .task-item").find(".description-section");

  if ($descriptionSection.is(":visible")) {
    $descriptionSection.slideUp(200);
    $caret.removeClass("rotated");
  } else {
    $descriptionSection.slideDown(200);
    $caret.addClass("rotated");
  }
});

// Event listener for add-deliverable button
$("#add-deliverable").on("click", function (e) {
  e.preventDefault();
  $(".form-control").removeClass("is-invalid"); // Remove is-invalid class from all form inputs
  if (validateDeliverable()) {
    const $lastDeliverable = $(".deliverable-item").last();
    const deliverableIndex = parseInt($lastDeliverable.attr("data-index"));
    const newDeliverableIndex = deliverableIndex + 1;
    const $newDeliverable = $lastDeliverable.clone();
    $newDeliverable.attr("data-index", newDeliverableIndex);
    $newDeliverable.find("input, textarea").val("");

    // Clear rich text editor content
    if (window.ENABLE_RICH_TEXT_EDITOR) {
      $newDeliverable.find(".deliverable-description").empty();
      $newDeliverable.find(".task-description").empty();
    } else {
      // For plain text mode, clear text content
      $newDeliverable.find(".deliverable-description").text("");
      $newDeliverable.find(".task-description").text("");
    }

    // Set the prefix value
    const prefixValue = $("#deliverable-prefix").val();
    $newDeliverable.find(".deliverable-prefix").val(prefixValue);

    // Set the placeholder for the new deliverable title
    $newDeliverable.find(".deliverable-title").attr("placeholder", selectedWorkItemTypeName + " Title");

    // Reset description sections to collapsed state
    $newDeliverable.find(".description-section").hide();
    $newDeliverable.find(".description-caret").removeClass("rotated");

    $newDeliverable.find(".delete-task-btn").attr("disabled", true);
    $newDeliverable.find(".task-item:not(:first)").remove();
    $newDeliverable.find(".form-control").each(function () {
      const id = $(this).attr("id");
      if (id) {
        $(this).attr("id", id.replace(deliverableIndex, newDeliverableIndex));
      }
    });
    $newDeliverable.find(".delete-deliverable-btn").removeAttr("disabled");

    $lastDeliverable.after($newDeliverable); // Add the new deliverable after the last deliverable

    // Slide down the new deliverable with a smooth transition
    $newDeliverable.hide().slideDown(200);

    // Initialize sortable for tasks in the new deliverable
    $newDeliverable.find(".task-list").sortable({
      handle: ".drag-handle",
      axis: "y", // Allow vertical dragging only
      containment: "parent", // Contain within the parent deliverable
      tolerance: "pointer", // Drag only when pointer is within the task item
    });

    updateDeleteDeliverableButtons();
    updateDeleteTaskButtons();
    updateDeliverableCount();
    updateDeliverableEstimates();
    updateFeatureEstimate();
    hideLoadingIndicator();
  }
});

// Event listener for delete-deliverable button
$(document).on("click", ".delete-deliverable-btn", function (e) {
  e.preventDefault();
  const $deliverable = $(this).closest(".deliverable-item");

  // Slide up the deliverable with a smooth transition
  $deliverable.slideUp(200, function () {
    $deliverable.remove();
    updateDeliverableCount();
    updateDeliverableEstimates();
    updateFeatureEstimate();
    updateDeleteDeliverableButtons();
    updateDeleteTaskButtons();
  });
});

// Event listener for add-task button
$(document).on("click", ".add-task-btn", function (e) {
  e.preventDefault();
  const $taskList = $(this).closest(".form-group").find(".task-list");
  const $taskTitleInputs = $taskList.find(".task-title");
  const $taskEstimateInputs = $taskList.find(".task-estimate");
  $(".form-control").removeClass("is-invalid");

  // Check if any task has an empty title
  let hasInvalidTask = false;
  $taskTitleInputs.each(function () {
    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      hasInvalidTask = true;
    }
  });

  // Check if any task has an empty title
  $taskEstimateInputs.each(function () {
    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      hasInvalidTask = true;
    }
  });

  // If any task has an empty title, don't add a new task
  if (hasInvalidTask) {
    return;
  }

  const $taskItem = $taskList.find(".task-item").first().clone();
  $taskItem.find("input, textarea").val("");

  // Clear rich text editor content
  if (window.ENABLE_RICH_TEXT_EDITOR) {
    $taskItem.find(".task-description").empty();
  } else {
    // For plain text mode, clear text content
    $taskItem.find(".task-description").text("");
  }

  // Reset description section to collapsed state for new task
  $taskItem.find(".description-section").hide();
  $taskItem.find(".description-caret").removeClass("rotated");

  $taskList.append($taskItem);

  // Smoothly show the new task item
  $taskItem.hide().slideDown(200);
  updateDeleteTaskButtons();
  updateTaskCount($taskList);
});

// Event listener for delete-task button
$(document).on("click", ".delete-task-btn", function (e) {
  e.preventDefault();
  const $taskItem = $(this).closest(".task-item");
  const $deliverable = $(this).closest(".deliverable-item");
  // Ensure each deliverable has at least one task
  if ($deliverable.find(".task-item").length === 1) {
    return;
  }

  $taskItem.slideUp(200, function () {
    $(this).closest(".task-item").remove();
    updateDeleteTaskButtons();
    updateTaskCount();
    hideLoadingIndicator();
  });
});

// Event listener for the on-submit action
$("#feature-form").on("submit", function (e) {
  e.preventDefault();
  if (validateForm()) {
    showLoadingIndicator("Preparing to create Work Items...");
    totalCalls = 0;
    const areaPath = $("#area-path").val();
    const iteration = $("#iteration").val();
    const featureIdVal = $("#feature-id").val();
    const prefix = $(this).find(".deliverable-prefix").val();
    let totalTasksCount = 0;
    const deliverables = [];

    $(".deliverable-item").each(function (index) {
      const deliverableTitle = $(this).find(".deliverable-title").val();

      // Get description for deliverable (supports rich text & plain modes)
      const $deliverableDescEditor = $(this).find(".deliverable-description");
      const deliverableDescription = getDescriptionContent($deliverableDescEditor);

      const tasks = [];

      $(this)
        .find(".task-item")
        .each(function () {
          const taskTitle = $(this).find(".task-title").val().trim();
          if (taskTitle) { // Only add task if title is not empty
            totalTasksCount++;

            // Get description for task (supports rich text & plain modes)
            const $taskDescEditor = $(this).find(".task-description");
            const taskDescription = getDescriptionContent($taskDescEditor);

            tasks.push({
              title: taskTitle,
              estimate: $(this).find(".task-estimate").val().trim(),
              description: taskDescription
            });
          }
        });

      const prefixedDeliverableTitle = (prefix + " " + deliverableTitle).trim();

      deliverables.push({
        title: prefixedDeliverableTitle,
        description: deliverableDescription,
        tasks: tasks,
      });
    });

    // Create nested JSON object
    const data = {
      featureId: featureIdVal,
      areaPath: areaPath,
      iteration: iteration,
      deliverables: deliverables,
    };

    // Calculate the total number of API calls needed
    totalCalls = deliverables.length + totalTasksCount;

    // Show the progress bar
    setProgressBar(0);

    // Call the API to create Work-Items
    createDeliverablesAndTasks(data)
      .then(() => {
        if (featureIdVal) {
          return getLinkedWorkItemsQuery(featureIdVal).then((queryUrl) => ({ queryUrl }));
        }
        return { queryUrl: null };
      })
      .then(({ queryUrl }) => {
        const feedbackLink = 'Got suggestions? I\'d love to hear them – <a href="https://forms.office.com/r/6QYanppNWa" target="_blank">Submit Feedback</a>';
        let message = 'Work Item(s) saved to Azure DevOps.';
        if (queryUrl) {
          message += `<br/><br/><a href="${queryUrl}" target="_blank">Click here</a> to view the Work Item(s).`;
        } else {
          message += '<br/><br/>No parent Work Item provided; items were created standalone.';
        }
        message += `<br/><br/>${feedbackLink}`;
        showSuccessPopup(message);
        stopProgressBar(false);
        resetForm();
        hideLoadingIndicator();
      })
      .catch((error) => {
        stopProgressBar(true);
        console.log(error);
        showErrorPopup("Error creating Work-Items. Check console log");
        hideLoadingIndicator();
      });
  }
});

// Event handler for the "OK" button in the confirmation modal
$("#load-preconfigured-items-confirmBtn").on("click", async function () {
  // Hide the confirmation modal after the operation is completed
  $("#load-preconfigured-items-confirmationModal").modal("hide");

  try {
    //Fetch the work-item-template JSON file  
    const jsonFilePath = "configuration/work_item_templates/" + prefilCategoryChoice;
    const workItemsJson = await readJSONFileByNameFromPublicFolder(jsonFilePath);

    await populateFormWithPreconfiguredData(workItemsJson).then(() => {
      // Update the counts, estimates & buttons
      updateDeliverableCount();
      updateTaskCount();
      updateDeleteDeliverableButtons();
      updateDeleteTaskButtons();
      updateDeliverableEstimates();
      updateFeatureEstimate();
    });
  } catch (error) {
    // Handle any errors that might occur during data loading
    console.error("Error loading preconfigured data:", error);
    showErrorPopup("An error occurred while loading preconfigured data. Please try again.");
  }
});

// Event handler for the "Reset Form" link
$("#reset-form-link").on("click", function (e) {
  e.preventDefault();
  resetForm();
});

// Event handler for input fields to clear validation errors on valid input
$(".form-control").on("input", function () {
  if ($(this).hasClass("is-invalid")) {
    if (this.checkValidity()) {
      $(this).removeClass("is-invalid");
    }
  }
});

// Event handler for estimate input fields to update Dev Days sum
$(document).on("input", ".task-estimate", function () {
  let sum = 0;
  const maxEstimate = 100;
  const estimate = parseFloat($(this).val()) || 0;

  if (estimate > maxEstimate) {
    $(this).val(maxEstimate);
  }

  const $deliverableItem = $(this).closest(".deliverable-item");
  const $taskEstimates = $deliverableItem.find(".task-estimate");

  $taskEstimates.each(function () {
    const taskEstimate = parseFloat($(this).val()) || 0;
    sum += taskEstimate;
  });

  const $deliverableEstimate = $deliverableItem.find(".deliverable-estimate");
  $deliverableEstimate.text("Dev Days: " + sum.toFixed(2));
  updateFeatureEstimate();
});

// Function to handle paste event for feature-id
$("#feature-id").on("paste", function (event) {
  const clipboardData = event.originalEvent.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData("text");

  // Allow only numbers in the pasted data
  if (!/^[\d]+$/.test(pastedData)) {
    event.preventDefault();
  }
});

// Function to handle paste event for task-estimate
$(document).on("paste", ".task-estimate", function (event) {
  const clipboardData = event.originalEvent.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData("text");

  // Allow only numbers in the pasted data
  if (!/^[\d]+$/.test(pastedData)) {
    event.preventDefault();
  }
});

// Update prefix in all deliverables
$("#deliverable-prefix").on("input", function () {
  const prefixValue = $(this).val();
  $(".deliverable-prefix").val(prefixValue);
});

$(document).on("blur", "#feature-id", function () {
  var featureIdText = $(this).val();
  if (!featureIdText) {
    //Clear the feature name
    $("#feature-name").text("");
    $("#feature-name").attr("href", "#");
    if (typeof featureIdValid !== 'undefined') { featureIdValid = false; }
  } else {
    //Indicates that the user has updated the field. Attempt to fetch the feature details
    $("#feature-id").removeClass("is-invalid");
    if (featureIdText) {
      // Get organization and project from dropdowns
      const organization = $("#organization-select").val();
      const project = $("#project-select").val();

      if (!organization || !project) {
        showErrorPopup("Please select organization and project.");
        return;
      }

      // Call the Azure DevOps API to get feature details
      showLoadingIndicator("Fetching Work-Item Details...");
      if (typeof featureIdValid !== 'undefined') { featureIdValid = false; } // pessimistically reset until validated
      fetchFeatureDetails(featureIdText, organization, project, true)
        .then((featureDetails) => {
          // Display the feature name in the feature ID field
          if (featureDetails && featureDetails.fields && featureDetails.fields["System.Title"]) {
            $("#feature-name").text(featureDetails.fields["System.Title"]);
            $("#feature-name").attr("href", getFeatureUrl());
          }
          hideLoadingIndicator();
        })
        .catch((error) => {
          hideLoadingIndicator();
          console.log(error);
          showErrorPopup("Error fetching feature details. Check console log.");
        });
    }
  }
});

// Event listener for when the Organization dropdown value changes
$("#organization-select").on("change", async function () {
  // Close dropdown explicitly after change
  $(this).select2('close');
  const selectedOrganization = $(this).val();

  if (selectedOrganization) {
    showLoadingIndicator("Fetching Projects...");
    clearProjectSelect();
    clearWorkItemTypesDropdown();
    clearTeamDropdown();
    clearAssignedToDropdown();

    // Clean up avatar cache when organization changes since user IDs may be different
    if (typeof cleanupAvatarCache === 'function') {
      cleanupAvatarCache();
    }

    // Refresh the projects dropdown
    await populateProjectsDropdown();

    const selectedProject = $("#project-select").val();
    if (selectedOrganization && selectedProject && selectedProject !== "") {
      // Clear existing values
      clearTeamDropdown();
      $("#iteration").empty();
      $("#area-path").empty();
      $("#feature-id").val("");
      $("#feature-name").text("");
      $("#feature-name").attr("href", "#");
      $("#area-path").val("");
      $("#iteration").val("");
      clearWorkItemTypesDropdown();
      clearAssignedToDropdown();

      // Clear iteration and area-path suggestions
      const suggestedIterationsList = document.getElementById("suggested-iterations-list");
      suggestedIterationsList.innerHTML = "";
      const suggestedAreaPathsList = document.getElementById("suggested-area-paths-list");
      suggestedAreaPathsList.innerHTML = "";

      //Set work-item types
      fetchWorkItemTypes(selectedOrganization, selectedProject);

      populateTeamProfile()
        .then(() => {
          hideLoadingIndicator();
        })
        .catch((error) => {
          console.error("Error fetching user's teams:", error);
          hideLoadingIndicator();
        });
    }
    else {
      hideLoadingIndicator();
    }
  }
});

// Event listener for when the Project dropdown value changes
$("#project-select").on("change", function () {
  // Close dropdown explicitly after change
  $(this).select2('close');
  const selectedOrganization = $("#organization-select").val();
  const selectedProject = $(this).val();
  if (selectedOrganization && selectedProject) {

    // Clear existing values
    showLoadingIndicator("Fetching Project Details...");
    clearTeamDropdown();
    $("#iteration").empty();
    $("#area-path").empty();
    $("#feature-id").val("");
    $("#feature-name").text("");
    $("#feature-name").attr("href", "#");
    $("#area-path").val("");
    $("#iteration").val("");
    clearWorkItemTypesDropdown();
    clearAssignedToDropdown();

    // Clear iteration and area-path suggestions
    const suggestedIterationsList = document.getElementById("suggested-iterations-list");
    suggestedIterationsList.innerHTML = "";
    const suggestedAreaPathsList = document.getElementById("suggested-area-paths-list");
    suggestedAreaPathsList.innerHTML = "";

    populateTeamProfile()
      .then(() => {
        hideLoadingIndicator();
      })
      .catch((error) => {
        console.error("Error fetching user's teams:", error);
        hideLoadingIndicator();
      });
  }
});

// Event listener for work item type selection
$(document).on("change", "#work-item-type-select", function () {
  selectedWorkItemTypeName = $(this).find("option:selected").text();
  // set icon from selected option data attribute (if present)
  const iconUrl = $(this).find("option:selected").data('icon-url');
  if (iconUrl) {
    $('#global-selected-wit-icon').attr('src', iconUrl);
    // update icons inside each deliverable template
    $('.deliverable-wit-icon').attr('src', iconUrl);
  // Persist current selected icon URL globally for future cloned deliverables
  window.selectedWitIconUrl = iconUrl;
  } else {
    $('#global-selected-wit-icon').attr('src', 'images/work-item.webp');
    $('.deliverable-wit-icon').attr('src', 'images/work-item.webp');
  window.selectedWitIconUrl = 'images/work-item.webp';
  }

  // Update the placeholder for each .deliverable-title in the first #deliverables-container
  $("#deliverables-container .deliverable-prefix").attr("placeholder", selectedWorkItemTypeName + " Title Prefix");
  $("#deliverables-container .deliverable-title").attr("placeholder", selectedWorkItemTypeName + " Title");

  // Update the hierarchy display
  $("#selected-work-item-name").text(selectedWorkItemTypeName);
  $("#work-item-hierarchy").show();

  // Update other fields
  $('#work-items-header').contents().first().replaceWith(selectedWorkItemTypeName + " ");
});

// When a new deliverable is cloned via the add-deliverable handler, ensure its icon matches current selection
$(document).on('DOMNodeInserted', '#deliverables-container', function (e) {
  try {
    const $node = $(e.target);
    // If a deliverable-item was added, set its icon
    if ($node && $node.hasClass && $node.hasClass('deliverable-item')) {
  const currentIcon = window.selectedWitIconUrl || $('.deliverable-wit-icon:first').attr('src') || 'images/work-item.webp';
  $node.find('.deliverable-wit-icon').attr('src', currentIcon);
    }
  } catch (err) {
    // ignore
  }
});

// Event listener for when the Team dropdown value changes
$("#team-select").on("change", function () {
  // Close dropdown explicitly after change
  $(this).select2('close');
  const selectedTeam = $(this).val();
  if (selectedTeam) {
    showLoadingIndicator("Fetching Team Configuration...");
    $("#iteration").val("");
    $("#area-path").val("");
    clearAssignedToDropdown();

    fetchIterationsForTeam()
      .then(() => {
        return fetchAreaPathsForTeam();
      })
      .then(() => {
        showLoadingIndicator("Fetching Team Members...");
        return fetchUsersInTeam();
      })
      .catch((error) => {
        console.error("Error fetching team data:", error);
      })
      .finally(() => {
        hideLoadingIndicator();
      });
  }
});

// Event listener for the profile-dropdown link
$("#profile-dropdown").on("click", function (e) {
  e.preventDefault();
  $(".floating-menu").toggleClass("show");
});

// Hide the dropdown menu when clicking outside of it
$(document).on("click", function (e) {
  if (
    !$("#profile-dropdown").is(e.target) && // Check if the clicked target is not the profile dropdown
    $("#profile-dropdown").has(e.target).length === 0 && // Check if the clicked target is not a child of the profile dropdown
    !$(".floating-menu").is(e.target) && // Check if the clicked target is not part of the user menu
    $(".floating-menu").has(e.target).length === 0 // Check if the clicked target is not a child of the user menu
  ) {
    $(".floating-menu").removeClass("show"); // Remove the "show" class from elements with the class "floating-menu"
  }
});

// Event listener for the logout link
$(".logout-link").on("click", function (event) {
  event.preventDefault(); // Prevent the link from navigating to the href
  logout();
});

// Help / Guided Tour relaunch
$(document).on('click', '#help-tour-btn', function (e) {
  e.preventDefault();
  try {
    if (window.FirstRunGuide) {
      if (typeof window.FirstRunGuide.reset === 'function') window.FirstRunGuide.reset();
      if (typeof window.FirstRunGuide.maybeStart === 'function') window.FirstRunGuide.maybeStart({ delay: 0 });
    }
  } catch (err) {
    console.warn('Failed to launch guided tour', err);
  }
});
