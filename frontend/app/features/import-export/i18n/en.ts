export const translations = {
  importExport: {
    // General
    title: "Import & Export",
    description: "Manage data imports and exports",
    noData: "No data available",
    loading: "Loading...",
    error: "Error",

    // Tabs
    tabs: {
      overview: "Overview",
      imports: "Imports",
      exports: "Exports",
      templates: "Templates",
    },

    // Import Section
    import: {
      title: "Import Data",
      description: "Upload and import data into the system",
      selectFile: "Select file to import",
      dragDrop: "Drag and drop your file here",
      dragDropActive: "Drop the file here",
      selectFormat: "Select file format",
      chooseTemplate: "Choose template (optional)",
      uploadFile: "Upload File",
      uploading: "Uploading...",
      validating: "Validating...",
      processing: "Processing import...",
      uploadSuccess: "File uploaded successfully",
      uploadError: "Failed to upload file",
      validationError: "Validation failed",
    },

    // Export Section
    export: {
      title: "Export Data",
      description: "Export data from the system",
      selectFormat: "Select export format",
      selectFields: "Select fields to export",
      selectAll: "Select all fields",
      deselectAll: "Deselect all fields",
      selectModule: "Select module to export",
      chooseFormat: "Choose export format",
      csv: "CSV",
      excel: "Excel",
      pdf: "PDF",
      preparing: "Preparing export...",
      generating: "Generating file...",
      downloadReady: "Download is ready",
      download: "Download",
      downloading: "Downloading...",
      exportSuccess: "Export completed successfully",
      exportError: "Failed to export data",
    },

    // Status
    status: {
      pending: "Pending",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
    },

    // Job List
    jobs: {
      title: "Jobs",
      empty: {
        title: "No jobs yet",
        description: "Create your first import or export job to get started",
      },
      table: {
        id: "ID",
        type: "Type",
        module: "Module",
        status: "Status",
        progress: "Progress",
        fileName: "File Name",
        rows: "Rows",
        createdAt: "Created",
        completedAt: "Completed",
        createdBy: "Created By",
        actions: "Actions",
      },
      viewDetails: "View Details",
      cancel: "Cancel",
      retry: "Retry",
      download: "Download",
      delete: "Delete",
      confirmDelete: "Confirm delete this job?",
      deleteSuccess: "Job deleted successfully",
      deleteError: "Failed to delete job",
    },

    // Job Details
    jobDetails: {
      title: "Job Details",
      generalInfo: "General Information",
      progress: "Progress",
      results: "Results",
      errors: "Errors",
      warnings: "Warnings",
      summary: "Summary",
      totalRows: "Total Rows",
      processedRows: "Processed Rows",
      successfulRows: "Successful Rows",
      failedRows: "Failed Rows",
      successRate: "Success Rate",
    },

    // Error Reporting
    errors: {
      title: "Errors",
      noErrors: "No errors found",
      rowNumber: "Row",
      column: "Column",
      message: "Message",
      errorLog: "Error Log",
      downloadErrorReport: "Download Error Report",
      validationFailed: "Validation failed",
      invalidValue: "Invalid value",
      missingRequired: "Missing required field",
      formatError: "Format error",
      encoding: "Encoding error",
    },

    // Templates
    templates: {
      title: "Import Templates",
      description: "Manage reusable import templates",
      create: "Create Template",
      edit: "Edit Template",
      delete: "Delete Template",
      view: "View Template",
      empty: {
        title: "No templates yet",
        description: "Create your first template to streamline imports",
      },
      table: {
        name: "Name",
        module: "Module",
        description: "Description",
        fields: "Fields",
        created: "Created",
        actions: "Actions",
      },
      form: {
        name: "Template Name",
        namePlaceholder: "Enter template name",
        module: "Module",
        modulePlaceholder: "Select module",
        description: "Description",
        descriptionPlaceholder: "Enter template description",
        fieldMapping: "Field Mapping",
        addField: "Add Field",
        csvColumn: "CSV Column",
        csvColumnPlaceholder: "Column name in CSV",
        modelField: "Model Field",
        modelFieldPlaceholder: "Target model field",
        delimiter: "Delimiter",
        encoding: "Encoding",
        skipHeader: "Skip header row",
        saveTemplate: "Save Template",
        templateSaved: "Template saved successfully",
        templateSaveError: "Failed to save template",
      },
    },

    // Statistics
    stats: {
      title: "Statistics",
      totalImports: "Total Imports",
      totalExports: "Total Exports",
      successfulImports: "Successful Imports",
      failedImports: "Failed Imports",
      avgProcessingTime: "Avg Processing Time",
      recentActivity: "Recent Activity",
      moduleUsage: "Module Usage",
      lastImport: "Last Import",
      lastExport: "Last Export",
    },

    // Filters
    filters: {
      module: "Module",
      status: "Status",
      dateFrom: "From Date",
      dateTo: "To Date",
      createdBy: "Created By",
      fileType: "File Type",
      clearFilters: "Clear Filters",
      applyFilters: "Apply Filters",
    },

    // Messages
    messages: {
      processingInProgress: "Processing is in progress...",
      pleaseWait: "Please wait while we process your request",
      importQueued: "Import job has been queued for processing",
      exportQueued: "Export job has been queued for processing",
      jobCancelled: "Job has been cancelled",
      confirmCancel: "Are you sure you want to cancel this job?",
      confirmDeleteJob: "Are you sure you want to delete this job?",
      confirmDeleteTemplate: "Are you sure you want to delete this template?",
      noPermission: "You don't have permission to perform this action",
    },
  },
};
