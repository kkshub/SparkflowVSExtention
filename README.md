# Sparkflows VS Code Extension

The **Sparkflows VS Code extension** dramatically enhances data engineering and machine learning productivity by tightly integrating your VS Code IDE directly into your [Sparkflows](https://www.sparkflows.io/) platform.

## Features

- **Unified Infrastructure:** Seamlessly orchestrate both spark-based _Workflows_ and _Pipelines_.
- **Interactive Tree View:** Provides lazy loading and logical categorization of your Sparkflows Projects neatly in a dedicated sidebar layout.
- **Diagnostics & Operations:** 
  - Execute any pipeline or workflow with real-time polling.
  - Review historical execution data across your workspace via clean, persistent exported tabs.
  - Effortlessly trace errors and state changes dynamically inside VS Code Webview Log Panels.
- **Secure Credentials Management:**
  - Token caching uses native VS Code Secret Storage logic perfectly decoupled from your IDE settings JSON, allowing profile switching without ever putting strict Bearer secrets at risk.
  - Automatically manages isolated configurations via Profiles. 

## Getting Started

1. **Test the Connection:** Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and trigger `Sparkflows: Set Server URL` to map the extension to your infrastructure (default `http://localhost:8080`).
2. **Authorize the Extension:** Fire the `Sparkflows: Set Profile Token` command to cleanly ingest your JWT security barrier. *Notice your credentials are never directly logged or dumped inside workspaces.*
3. **Trigger Pipelines!**
  - Switch to the "Sparkflows" activity bar panel.
  - Unveil your projects.
  - Right-click any flow to launch it, or natively copy its `ID`.

## Extension Settings

This extension contributes the following settings:

* `sparkflows.serverUrl`: Specifies your primary backend Sparkflows location.
* `sparkflows.profile`: The current deployment state mapping to isolated JWT cache strings.
* `sparkflows.defaultProjectId`: ID pointing directly to an immediate subset root tree.
* `sparkflows.pollingIntervalMs`: Frequency parameter measuring exactly how strongly the backend accepts polling requests before falling back gracefully.

---
*Built tightly adhering to modern secure architecture and standard typescript principles.*
