export const translations = {
  catalogs: {
    select: {
      placeholder: "Selecciona una opción",
      loading: "Cargando…",
      error: "No se pudo cargar",
      retry: "Reintentar",
      searchPlaceholder: "Buscar…",
      empty: "Sin resultados",
      inactive: "inactivo",
      // CountrySelect groups (ISSUE-029, AC-LIB-07)
      frequentGroup: "Frecuentes",
      allGroup: "Todos",
      // DivisionSelect (ISSUE-030, AC-LIB-08)
      selectParentFirst: "Selecciona primero el departamento",
    },
    admin: {
      title: "Catálogos",
      unknownListToast:
        "El catálogo «{key}» no está disponible. Se muestra el primero.",
      unknownListToastGeneric:
        "El catálogo solicitado no está disponible. Se muestra el primero.",
      subtitle: "Adapta las listas de opciones de tu organización.",
      breadcrumbConfig: "Configuración",
      searchPlaceholder: "Buscar catálogo…",
      noSearchMatch: "Ningún catálogo coincide con la búsqueda.",
      listNavLabel: "Lista de catálogos",
      lockedTooltip:
        "La plataforma no permite que tu organización modifique este catálogo.",
      backToList: "Catálogos",
      loadError: {
        title: "No se pudieron cargar los catálogos",
        message: "Revisa tu conexión e inténtalo de nuevo.",
        retry: "Reintentar",
      },
      empty: {
        title: "Aún no hay catálogos disponibles.",
      },
      groups: {
        users: "Usuarios y organizaciones",
      },
      detail: {
        historyButton: "Historial",
      },
      governance: {
        title: "Permisos del catálogo",
        manageSwitch: "Las organizaciones pueden gestionar este catálogo",
        manageHelper: "Cambiar etiquetas, ordenar y ocultar elementos.",
        extensibleSwitch: "Las organizaciones pueden agregar elementos",
        extensibleHelper:
          "Crear elementos propios, visibles solo para cada organización.",
        tenantHelper: "Configurado por la plataforma.",
        platformChip: "Plataforma",
        superadminSubtitle:
          "Los cambios aplican a todas las organizaciones de inmediato.",
        lockedIndicator: "Bloqueado por el módulo {owner}",
        lockedTooltip:
          "Este catálogo está bloqueado por el módulo {owner}: los códigos nuevos rompen su validación.",
        confirmTitle: "Cambiar permisos para todas las organizaciones",
        confirmEffect: "Esto aplica a todas las organizaciones de inmediato.",
        confirmNarrowing:
          "Los cambios existentes de las organizaciones se conservan pero dejan de aplicarse.",
        confirmRule006:
          "Agregar elementos requiere gestionar el catálogo, así que también se activará “Las organizaciones pueden gestionar este catálogo”.",
        confirmRule006Narrowing:
          "Agregar elementos requiere gestionar el catálogo, así que también se desactivará “Las organizaciones pueden agregar elementos”.",
        reasonLabel: "Motivo del cambio",
        reasonHint: "Mínimo 10 caracteres.",
        confirmButton: "Confirmar cambio",
        cancelButton: "Cancelar",
        successToast: "Permisos actualizados para todas las organizaciones",
        staleToast:
          "Otro administrador cambió este catálogo. Se recargaron los datos.",
        errorToast: "No se pudieron actualizar los permisos.",
      },
      addDisabled: {
        locked: "Este catálogo está bloqueado por el módulo.",
        notManaged: "La plataforma gestiona este catálogo.",
        notExtensible:
          "La plataforma no permite agregar elementos a este catálogo.",
      },
      items: {
        // ISSUE-034 items card (AC-UI-13/15/16/17/18)
        title: "Elementos",
        summary: "{visible} visibles de {total}",
        searchPlaceholder: "Buscar elemento…",
        showDeprecated: "Mostrar retirados",
        addItem: "Agregar elemento",
        reorderColumn: "Orden",
        codeColumn: "Código",
        spanishColumn: "Español",
        englishColumn: "English",
        originColumn: "Origen",
        stateColumn: "Estado",
        actionsColumn: "Acciones",
        systemBadge: "Sistema",
        customBadge: "Personalizado",
        retiredBadge: "Retirado",
        modifiedBadge: "Modificado",
        modifiedTooltip: "Tu organización cambió este elemento.",
        codeCopied: "Código copiado",
        readOnlyBanner:
          "La plataforma gestiona este catálogo. Los cambios no están disponibles para tu organización.",
        visibleText: "Visible",
        hiddenText: "Oculto",
        noSearchMatch: "Ningún elemento coincide con la búsqueda.",
        empty: "Este catálogo no tiene elementos.",
        loadError: "No se pudieron cargar los elementos.",
        visibilitySwitch: "Visibilidad de {code}",
        dragHandle: "Reordenar {code}",
        rowMenu: "Acciones de {code}",
        menu: {
          edit: "Editar",
          history: "Ver historial",
          restore: "Restaurar predeterminado",
          // ISSUE-035 mobile reorder entries (AC-UI-22/27)
          moveUp: "Mover arriba",
          moveDown: "Mover abajo",
        },
        // ISSUE-035 visibility switch and restore default (AC-UI-19/22)
        hideSuccessToast: "Elemento ocultado",
        restoreVisibilityToast: "Elemento restaurado",
        lastVisibleErrorToast: "No puedes ocultar el último elemento visible.",
        updateErrorToast: "No se pudo actualizar el elemento.",
        restoreSuccessToast:
          "Elemento restaurado a sus valores predeterminados",
        restoreErrorToast: "No se pudo restaurar el elemento.",
        // ISSUE-036 reorder (AC-UI-20/21/22)
        reorderSuccessToast: "Orden guardado",
        reorderErrorToast: "No se pudo guardar el orden. Se recargó la lista.",
        // Derived copy, pending approval: 422 CATALOG_ORDER_MISMATCH toast.
        reorderMismatchToast:
          "La lista cambió mientras la ordenabas. Se recargaron los datos.",
        // Derived copy, pending approval: drag handle and screen-reader texts.
        reorderRoleDescription: "elemento reordenable",
        reorderInstructions:
          "Para reordenar, pulsa Espacio o Intro para levantar el elemento, usa las flechas arriba y abajo para moverlo, pulsa Espacio o Intro para soltarlo, o Escape para cancelar.",
        reorderAnnounceStart:
          "Levantaste {name}. Posición {position} de {total}.",
        reorderAnnounceOver:
          "{name} está en la posición {position} de {total}.",
        reorderAnnounceEnd:
          "Soltaste {name} en la posición {position} de {total}.",
        reorderAnnounceCancel:
          "Reordenamiento cancelado. {name} volvió a la posición {position}.",
      },
      itemDialog: {
        // ISSUE-037 edit / add item dialog (AC-UI-23/24)
        editTitle: "Editar elemento",
        addTitle: "Agregar elemento",
        addSubtitle: "· solo visible para tu organización",
        codeAutoHint: "(se genera automáticamente)",
        systemCodeNote:
          "El código no cambia: informes e integraciones siguen funcionando.",
        editSuccessToast: "Etiqueta actualizada",
        addSuccessToast: "Elemento agregado",
        // Derived copy, pending approval: preview note, 409 toasts.
        previewHelper:
          "Vista previa; el servidor asigna el código definitivo al guardar.",
        limitReachedToast:
          "Alcanzaste el límite de 200 elementos propios en este catálogo.",
        notExtensibleToast:
          "La plataforma ya no permite agregar elementos a este catálogo.",
        // Derived copy, pending approval: buttons, generic error, field errors.
        saveButton: "Guardar",
        cancelButton: "Cancelar",
        addErrorToast: "No se pudo agregar el elemento.",
        errors: {
          required: "Requerido",
          tooLong: "Máximo 100 caracteres.",
          html: "No uses los caracteres < ni >.",
          controlChar:
            "Este campo tiene caracteres invisibles, normalmente por pegar texto de otro documento. Bórralo y escríbelo de nuevo.",
          invalid: "Valor no válido.",
        },
      },
    },
    history: {
      // ISSUE-038 history sheet (AC-UI-25)
      systemSync: "Sincronización del sistema",
      emptyState: "Sin cambios registrados.",
      beforeLabel: "Antes",
      afterLabel: "Después",
      // Derived copy, pending approval: titles, actor, pagination, states, values.
      listTitle: "Historial del catálogo",
      itemTitle: "Historial del elemento",
      platformActor: "Administrador de la plataforma",
      unknownActor: "Usuario desconocido",
      loadMore: "Cargar más",
      loadingMore: "Cargando…",
      loadError: "No se pudo cargar el historial.",
      loadMoreError: "No se pudieron cargar los cambios anteriores.",
      values: {
        yes: "Sí",
        no: "No",
      },
      fields: {
        code: "Código",
        labels: "Etiquetas",
        sort_order: "Orden",
        attributes: "Atributos",
        is_hidden: "Oculto",
        tenant_can_manage: "Las organizaciones pueden gestionar",
        is_extensible: "Las organizaciones pueden agregar elementos",
        is_locked: "Bloqueado por el módulo",
        manage_permission: "Permiso de gestión",
      },
      // Derived copy, pending approval: change type labels.
      changeTypes: {
        items: {
          created: "Creado",
          synced: "Sincronizado",
          labels_updated: "Etiquetas actualizadas",
          reordered: "Reordenado",
          hidden: "Ocultado",
          unhidden: "Mostrado de nuevo",
          reset: "Restaurado a valores predeterminados",
          deprecated: "Retirado",
          reactivated: "Reactivado",
        },
        lists: {
          created: "Creado",
          declaration_synced: "Declaración sincronizada",
          governance_updated: "Permisos actualizados",
          deprecated: "Retirado",
          reactivated: "Reactivado",
        },
      },
    },
  },
};
