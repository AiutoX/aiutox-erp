export const translations = {
  importExport: {
    // General
    title: "Importar y Exportar",
    description: "Gestiona importaciones y exportaciones de datos",
    noData: "No hay datos disponibles",
    loading: "Cargando...",
    error: "Error",

    // Tabs
    tabs: {
      overview: "Resumen",
      imports: "Importaciones",
      exports: "Exportaciones",
      templates: "Plantillas",
    },

    // Import Section
    import: {
      title: "Importar Datos",
      description: "Carga e importa datos al sistema",
      selectFile: "Selecciona archivo para importar",
      dragDrop: "Arrastra y suelta tu archivo aquí",
      dragDropActive: "Suelta el archivo aquí",
      selectFormat: "Selecciona formato de archivo",
      chooseTemplate: "Elige plantilla (opcional)",
      uploadFile: "Cargar Archivo",
      uploading: "Cargando...",
      validating: "Validando...",
      processing: "Procesando importación...",
      uploadSuccess: "Archivo cargado correctamente",
      uploadError: "Fallo al cargar el archivo",
      validationError: "Validación fallida",
    },

    // Export Section
    export: {
      title: "Exportar Datos",
      description: "Exporta datos del sistema",
      selectFormat: "Selecciona formato de exportación",
      selectFields: "Selecciona campos a exportar",
      selectAll: "Seleccionar todo",
      deselectAll: "Deseleccionar todo",
      selectModule: "Selecciona módulo para exportar",
      chooseFormat: "Elige formato de exportación",
      csv: "CSV",
      excel: "Excel",
      pdf: "PDF",
      preparing: "Preparando exportación...",
      generating: "Generando archivo...",
      downloadReady: "Descarga lista",
      download: "Descargar",
      downloading: "Descargando...",
      exportSuccess: "Exportación completada correctamente",
      exportError: "Fallo al exportar datos",
    },

    // Status
    status: {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      failed: "Fallo",
      cancelled: "Cancelado",
    },

    // Job List
    jobs: {
      title: "Trabajos",
      empty: {
        title: "Sin trabajos aún",
        description:
          "Crea tu primer trabajo de importación o exportación para comenzar",
      },
      table: {
        id: "ID",
        type: "Tipo",
        module: "Módulo",
        status: "Estado",
        progress: "Progreso",
        fileName: "Nombre de Archivo",
        rows: "Filas",
        createdAt: "Creado",
        completedAt: "Completado",
        createdBy: "Creado por",
        actions: "Acciones",
      },
      viewDetails: "Ver Detalles",
      cancel: "Cancelar",
      retry: "Reintentar",
      download: "Descargar",
      delete: "Eliminar",
      confirmDelete: "¿Confirmar eliminación de este trabajo?",
      deleteSuccess: "Trabajo eliminado correctamente",
      deleteError: "Fallo al eliminar el trabajo",
    },

    // Job Details
    jobDetails: {
      title: "Detalles del Trabajo",
      generalInfo: "Información General",
      progress: "Progreso",
      results: "Resultados",
      errors: "Errores",
      warnings: "Advertencias",
      summary: "Resumen",
      totalRows: "Total de Filas",
      processedRows: "Filas Procesadas",
      successfulRows: "Filas Exitosas",
      failedRows: "Filas Fallidas",
      successRate: "Tasa de Éxito",
    },

    // Error Reporting
    errors: {
      title: "Errores",
      noErrors: "No hay errores",
      rowNumber: "Fila",
      column: "Columna",
      message: "Mensaje",
      errorLog: "Registro de Errores",
      downloadErrorReport: "Descargar Reporte de Errores",
      validationFailed: "Validación fallida",
      invalidValue: "Valor inválido",
      missingRequired: "Campo requerido faltante",
      formatError: "Error de formato",
      encoding: "Error de codificación",
    },

    // Templates
    templates: {
      title: "Plantillas de Importación",
      description: "Gestiona plantillas de importación reutilizables",
      create: "Crear Plantilla",
      edit: "Editar Plantilla",
      delete: "Eliminar Plantilla",
      view: "Ver Plantilla",
      empty: {
        title: "Sin plantillas aún",
        description: "Crea tu primera plantilla para simplificar importaciones",
      },
      table: {
        name: "Nombre",
        module: "Módulo",
        description: "Descripción",
        fields: "Campos",
        created: "Creado",
        actions: "Acciones",
      },
      form: {
        name: "Nombre de Plantilla",
        namePlaceholder: "Ingresa nombre de plantilla",
        module: "Módulo",
        modulePlaceholder: "Selecciona módulo",
        description: "Descripción",
        descriptionPlaceholder: "Ingresa descripción de plantilla",
        fieldMapping: "Mapeo de Campos",
        addField: "Agregar Campo",
        csvColumn: "Columna CSV",
        csvColumnPlaceholder: "Nombre de columna en CSV",
        modelField: "Campo de Modelo",
        modelFieldPlaceholder: "Campo de modelo destino",
        delimiter: "Delimitador",
        encoding: "Codificación",
        skipHeader: "Saltar fila de encabezado",
        saveTemplate: "Guardar Plantilla",
        templateSaved: "Plantilla guardada correctamente",
        templateSaveError: "Fallo al guardar plantilla",
      },
    },

    // Statistics
    stats: {
      title: "Estadísticas",
      totalImports: "Total de Importaciones",
      totalExports: "Total de Exportaciones",
      successfulImports: "Importaciones Exitosas",
      failedImports: "Importaciones Fallidas",
      avgProcessingTime: "Tiempo Promedio de Procesamiento",
      recentActivity: "Actividad Reciente",
      moduleUsage: "Uso de Módulos",
      lastImport: "Última Importación",
      lastExport: "Última Exportación",
    },

    // Filters
    filters: {
      module: "Módulo",
      status: "Estado",
      dateFrom: "Desde",
      dateTo: "Hasta",
      createdBy: "Creado por",
      fileType: "Tipo de Archivo",
      clearFilters: "Limpiar Filtros",
      applyFilters: "Aplicar Filtros",
    },

    // Messages
    messages: {
      processingInProgress: "El procesamiento está en curso...",
      pleaseWait: "Por favor espera mientras procesamos tu solicitud",
      importQueued: "El trabajo de importación ha sido puesto en cola",
      exportQueued: "El trabajo de exportación ha sido puesto en cola",
      jobCancelled: "El trabajo ha sido cancelado",
      confirmCancel: "¿Estás seguro de que deseas cancelar este trabajo?",
      confirmDeleteJob: "¿Estás seguro de que deseas eliminar este trabajo?",
      confirmDeleteTemplate:
        "¿Estás seguro de que deseas eliminar esta plantilla?",
      noPermission: "No tienes permiso para realizar esta acción",
    },
  },
};
