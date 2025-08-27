// Work Item creation & related Azure DevOps API interactions (extracted from main.js)
(function(){
  async function createDeliverable(workItemData){
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    try {
      let requestHeaders = await generateAuthHeaders(usePAT);
      requestHeaders['Content-Type'] = 'application/json-patch+json';
      const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$${encodeURIComponent(selectedWorkItemTypeName)}?api-version=7.0`, {
        method: 'POST', headers: requestHeaders, body: JSON.stringify(workItemData)
      });
      const responseData = await response.json();
      return responseData.id;
    } catch (error){
      console.log(error);
      showErrorPopup('Error creating work item. Check Console log.');
      return null;
    }
  }

  async function createTask(workItemData){
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    try {
      let requestHeaders = await generateAuthHeaders(usePAT);
      requestHeaders['Content-Type'] = 'application/json-patch+json';
      const response = await fetch(`https://dev.azure.com/${organization}/${project}/_apis/wit/workitems/$Task?api-version=7.0`, {
        method: 'POST', headers: requestHeaders, body: JSON.stringify(workItemData)
      });
      const responseData = await response.json();
      return responseData.id;
    } catch (error){
      console.log(error);
      showErrorPopup('Error creating work item. Check Console log.');
      return null;
    }
  }

  async function createDeliverablesAndTasks(data){
    try {
      const createdDeliverables = [];
      const organization = $('#organization-select').val();
      const project = $('#project-select').val();
      const areaPath = $('#area-path').val();
      const iteration = $('#iteration').val();
      const featureIdVal = $('#feature-id').val();
      const selectedUserEmail = $('#assigned-to-select').val();
      const _azureDevOpsApiBaseUrl = `https://dev.azure.com/${organization}/${project}`;
      let currentCall = 0; let currentDeliverableTaskCount = 0; let currentDeliverableCount = 0;
      for (const deliverable of data.deliverables){
        const deliverableData = [
          { op:'add', path:'/fields/System.AreaPath', value: areaPath },
          { op:'add', path:'/fields/System.Title', value: deliverable.title },
          { op:'add', path:'/fields/System.IterationPath', value: iteration },
          { op:'add', path:'/fields/System.AssignedTo', value: selectedUserEmail },
          ...(featureIdVal && featureIdValid ? [{
            op:'add', path:'/relations/-', value:{ rel:'System.LinkTypes.Hierarchy-Reverse', url:`${_azureDevOpsApiBaseUrl}/_apis/wit/workItems/${featureIdVal}?api-version=7.0`, attributes:{ comment:'Linking child Work-Item to Parent Work-Item'}}
          }] : [])
        ];
        if (deliverable.description && deliverable.description.trim()) {
          deliverableData.push({ op:'add', path:'/fields/System.Description', value: deliverable.description });
        }
        currentDeliverableCount++;
        showLoadingIndicator(`Creating ${selectedWorkItemTypeName} : ${currentDeliverableCount} of ${data.deliverables.length}`);
        const createdDeliverableId = await createDeliverable(deliverableData);
        if (createdDeliverableId){
          currentCall++; setProgressBar((currentCall / totalCalls) * 100); createdDeliverables.push(createdDeliverableId); currentDeliverableTaskCount = 0;
          for (const task of deliverable.tasks){
            if (!task.title) continue;
            currentDeliverableTaskCount++;
            const taskData = [
              { op:'add', path:'/fields/System.AreaPath', value: areaPath },
              { op:'add', path:'/fields/System.Title', value: task.title },
              { op:'add', path:'/fields/System.IterationPath', value: iteration },
              { op:'add', path:'/relations/-', value:{ rel:'System.LinkTypes.Hierarchy-Reverse', url:`${_azureDevOpsApiBaseUrl}/_apis/wit/workItems/${createdDeliverableId}?api-version=7.0`, attributes:{ comment:'Linking child Work-Item to parent Work-Item' } } },
              { op:'add', from:null, path:'/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: task.estimate },
              { op:'add', path:'/fields/System.AssignedTo', value: selectedUserEmail }
            ];
            if (task.description && task.description.trim()) { taskData.push({ op:'add', path:'/fields/System.Description', value: task.description }); }
            if (project !== 'OS') { taskData.push({ op:'add', path:'/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: task.estimate }); }
            showLoadingIndicator(`Creating Task(s) under current ${selectedWorkItemTypeName} : ${currentDeliverableTaskCount} of ${deliverable.tasks.length}`);
            const createdTaskId = await createTask(taskData);
            if (createdTaskId){ currentCall++; setProgressBar((currentCall / totalCalls) * 100); }
          }
        }
      }
      return createdDeliverables;
    } catch (error){
      console.log(error); hideLoadingIndicator(); showErrorPopup('Error creating ADO Items. Check console log'); return [];
    }
  }

  async function getLinkedWorkItemsQuery(featureId){
    const organization = $('#organization-select').val();
    const project = $('#project-select').val();
    const authHeaders = await generateAuthHeaders(usePAT);
    showLoadingIndicator('Almost done...');
    const queryData = { name: `Linked Work Items for Feature ${featureId}`, wiql: `\n      SELECT\n        [System.Id],\n        [System.WorkItemType],\n        [System.Title],\n        [System.AssignedTo],\n        [System.State],\n        [System.Tags],\n        [Microsoft.VSTS.Scheduling.OriginalEstimate]\n      FROM workitemLinks\n      WHERE\n        (\n          [Source].[System.TeamProject] = '${project}'\n          AND [Source].[System.WorkItemType] <> ''\n          AND [Source].[System.Id] = ${featureId}\n        )\n        AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')\n        AND (\n          [Target].[System.TeamProject] = '${project}'\n          AND [Target].[System.WorkItemType] <> ''\n        )\n      MODE (Recursive)\n    ` };
    try {
      const response = await $.ajax({ url:`https://dev.azure.com/${organization}/${project}/_apis/wit/tempqueries?api-version=7.1`, method:'POST', headers: authHeaders, contentType:'application/json', data: JSON.stringify(queryData) });
      hideLoadingIndicator();
      if (!response || !response.id) throw new Error('Temporary query ID not found in response.');
      return `https://dev.azure.com/${organization}/${project}/_queries/query/?tempQueryId=${response.id}`;
    } catch (error){ hideLoadingIndicator(); console.error('Error creating temporary query', error); throw error; }
  }

  // Expose
  window.Api = { createDeliverable, createTask, createDeliverablesAndTasks, getLinkedWorkItemsQuery };
})();
