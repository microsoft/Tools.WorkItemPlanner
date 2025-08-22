# Work Item Planner

Work Item Planner is a web application that allows users to generate Work Items that encompass all the action items while working on a feature.

![Screenshot](preview.jpeg)

## Getting Started

### Hosted Version

The application is hosted using a Linux based Azure App Service (Web App).

| Resource | Details |
| --- | --- |
| Azure App Service Web App | [WorkItemPlanner](https://ms.portal.azure.com/#@microsoft.onmicrosoft.com/resource/subscriptions/fd8ab19b-944d-40f1-b13b-e2036680bf7e/resourceGroups/rg-WorkItemPlanner/providers/Microsoft.Web/sites/WorkItemPlanner/appServices) |
| Subscription Name | AzDev-Agents&Tasks-Test |
| Subscription ID | fd8ab19b-944d-40f1-b13b-e2036680bf7e |
| Tenant | Corp |

Application URL: https://workitemplanner.codeapp.ms

Vanity URL: https://aka.ms/workitemplanner, https://aka.ms/featureplanner, https://aka.ms/scenarioplanner

### Deployment

#### Manual Deployment

1. Ensure to run the `npm install` locally before building using this approach.
1. Install the [App Service extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureappservice) for Visual Studio Code.
1. In the App Service explorer, select the mentioned App Service, right click on it and click deploy.

Refer to [this](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?tabs=linux&pivots=development-environment-vscode#configure-the-app-service-app-and-deploy-code) document for the detailed deployment steps. Ignore the steps which create the App Service itself.

#### Automated Deployment

A GitHub Action [Tools.WorkItemPlanner-deploy](https://github.com/microsoft/Tools.WorkItemPlanner/actions/workflows/azure-webapps-node.yml) has been created to build and deploy. Once a PR is merged to the 'main' branch the code is automatically deployed.

[![Tools.WorkItemPlanner-deploy](https://github.com/microsoft/Tools.WorkItemPlanner/actions/workflows/azure-webapps-node.yml/badge.svg?branch=main)](https://github.com/microsoft/Tools.WorkItemPlanner/actions/workflows/azure-webapps-node.yml)

### Running Locally

To run the application locally, you'll need to have Node.js and npm (Node Package Manager) installed on your machine. Here's how to set it up:

1. Clone the repository: `git clone https://github.com/microsoft/Tools.WorkItemPlanner.git`
1. Install the dependencies by running: `npm install`
1. Start the local development server: `npm start`
1. Open your web browser and visit: `http://localhost:3000`
1. Note that you may have to enable CORS on your browser when running locally. There are a good number of Edge plugins to help you with this.

## Usage

1. Fill out the required fields in the form, providing Organization, Project, Feature Id, Area Path, Iteration & Work Item(s).
1. Click the "Prefill Work Item(s)" button to create the ADO items under the mentioned Feature.
1. To add more Work Item(s), click the "+ Work Item" button.
1. To add tasks to a Work Item(s), click the "+ Task" button under the specific Feature/Scenario.
1. To reset the form, click the "Reset Form" link.
1. To prefill the form with the Work Item(s) from a template, click on "Prefill Work Item(s)".

## Updating Configuration

### Adding/Updating Organization/Project/Team/Area-Path/Iteration choices

Dropdowns are populated based on the user's access to Organizations, Projects, Teams, Area Paths & Iterations in Azure DevOps.

### Onboarding a Work Item template

Teams have the choice to onboard their own template i.e., customized choice of Work Item(s). To onboard a new template follow these steps.

1. Create a JSON file adhering to this schema. Here is a reference template [wpx_engineering_dcr_v1.0.0.json](https://github.com/microsoft/Tools.WorkItemPlanner.git?path=/public/work_item_templates/w%2Bd_engineering_dcr_v1.0.0.json);

```javascript
{
  "version": "1.0.0",
  "template": {
    "workitems": [
      {
        "title": "string",
        "tasks": [
          {
            "title": "string",
            "estimate": "number",
            "description": "string" // optional
          }
        ]
      }
    ]
  }
}
```

2. Ensure to name the template in strict adherence to the following pattern - teamname_category_release_version.

|  | |
| -------- | ------- |
| 'teamname'  | your team name |
| 'category' | 'engineering' or 'design' or 'product' |
| 'release' | 'moments' or 'dcr' |
| 'version' | numeric version with the letter 'v' as prefix |

` File name cannot contain any special characters other than underscore(_) or whitespace( ) `

Example: wpx_engineering_dcr_v1.json, wpx_product_moments_v1.json

3. Clone the repository: `git clone https://github.com/microsoft/Tools.WorkItemPlanner.git` and create a local branch.

4. Save the template at the this location `\Tools.WorkItemPlanner\public\work_item_templates`.

5. Add the template file name and the display name to the 'work_item_templates_index.js' file located in `\tools.WorkItemPlanner\public\work_item_templates`. Ensure adherence to the existing naming convention in the file.

6. Raise a pull request to the 'main' branch with the above additions.

71. Once your pull request is approved and completed, the new template is automatically deployed within 10 minutes.

## Infra - One Time Step

Below are the niche steps which were executed to get the application up and running.

### Custom entry to web.config

If you upload a .json file to the Windows Azure website and try to access it, it would give you a 404 File Not Found error, because the MIME Type of .json is not set by default. This also applies in general to any file that might need a specific MIME Type. To fix this issue, edit the web.config file located in the root directory of the application.

```xml
<!-- Mime type mapping -->
    <staticContent>
        <remove fileExtension=".json" />
        <mimeMap fileExtension=".json" mimeType="application/json" />
        <mimeMap fileExtension=".webp" mimeType="image/webp" />
    </staticContent>
```

> The effective web.config for any Azure App Service app can be accessed via the 'Kudu' service - https://workitemplanner.scm.azurewebsites.net/DebugConsole

### Azure Application Insights Configuration

1. Application Insights has been enabled to monitor both client-side and server-side telemetry. While separate Application Insights resources are recommended for the client and server, a single instance is being used since this is an internal tool. The configuration status of this instance can be accessed via this endpoint - https://workitemplanner.scm.azurewebsites.net/ApplicationInsights

1. Azure Application Insights Connection String is provided as an environment variable `APPLICATIONINSIGHTS_CONNECTION_STRING`.

## Deployment Setup and Certificate Management

### Code Deployment (GitHub → Azure Web App)

This project uses **GitHub Actions with OpenID Connect (OIDC)** to deploy code directly to Azure App Service.  
The flow looks like this:

1. **GitHub Actions Workflow** authenticates to Azure using `azure/login@v2`.
2. **Managed Identity (WorkItemPlanner-Identity)** in Azure AD has a **federated credential** that trusts the GitHub repo (`microsoft/Tools.WorkItemPlanner`).
3. The Managed Identity is granted `Contributor` (or equivalent) permissions on the Web App.
4. `azure/webapps-deploy@v3` publishes the build artifact to the App Service.

🔹 This flow does **not** use a publish profile or Key Vault.  
🔹 Authentication happens through Azure AD using OIDC, which is secure and does not require secret rotation.

### TLS/SSL Certificate Binding (Azure Web App → Key Vault)

The Web App also uses a **custom domain** secured with an SSL certificate stored in **Azure Key Vault**.

1. The **Web App itself** must fetch the certificate from Key Vault.  
   - This requires a **Managed Identity** assigned to the Web App.

2. That identity must be granted access to the Key Vault.  
   - Since the vault is configured for **Azure RBAC**, the required role is:
     - `Key Vault Secrets User` (minimum required)
   - Optionally, `Key Vault Certificates Officer` can be assigned for full certificate management.

3. When adding a binding in the Portal, the Portal currently defaults to **system-assigned identity**.  

4. Once imported, the certificate can be bound to the custom domain in TLS/SSL settings.

#### Important: Don't use Azure Managed Certificate

Azure Managed Certificates (the free App Service managed option) are **not** used for this application and should not be used.

Instead, obtain the certificate via an **Azure Key Vault** backed by **OneCert**, then bind it to the Web App using the Web App's System Assigned Managed Identity. This ensures:

- Centralized certificate governance (issuance, rotation, expiry alerts) via OneCert.
- Consistent auditing & RBAC through Key Vault.
- Decoupled lifecycle management enabling proactive rotation without web app restarts tied to portal automation windows.
### Managed Identity Setup

- System-assigned managed identity (Web App): enabled on the App Service and granted the minimal Key Vault RBAC permissions required to read the TLS certificate (Key Vault Secrets User). This identity is used by the Web App to fetch and bind the certificate at runtime.

- User-assigned managed identity (GitHub Actions): a separate user-assigned Managed Identity (WorkItemPlanner-Identity) was created and configured with a federated credential that trusts the repository/workflow. This identity has Contributor access on the Resource Group to allow OIDC-based deployments from GitHub Actions.

Security notes:
- Prefer least-privilege RBAC (scope to the Web App or specific resources instead of the whole resource group where possible).
- Restrict the federated credential to the specific repository and workflow.
- Use OIDC federation to avoid long-lived secrets and periodically review assigned permissions.

## Contributing

Contributions are welcome! If you find any bugs or have suggestions for improvements, please submit a pull request or reach out to <adityamankal@microsoft.com>.

## Future Roadmap

- Implement Single Sign on - COMPLETED
- Support for custom templates - COMPLETED
- Track Telemetry - COMPLETED
- Support Work Item Description (Rich Text) - COMPLETED

## SDL Assessment

[Work Item Planner - SDL Assessment (August 2025)](https://microsoft.visualstudio.com/Family/_compliance/product/4446c4d1-ce1b-1466-31a3-7d75a1baa0b5/assessments/31bcff24-d74b-9373-1701-5c586b35d8a7)

