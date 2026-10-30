/**
 * Utilidades de validación de archivos
 */

// Tamaños máximos en bytes
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
  archive: 100 * 1024 * 1024, // 100MB
  default: 20 * 1024 * 1024, // 20MB
} as const;

// Tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/rtf",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/webm"],
  archive: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/gzip",
  ],
} as const;

export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

/**
 * Obtiene la categoría de un archivo basado en su MIME type
 */
export function getFileCategory(fileType: string): FileCategory | null {
  for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
    if ((types as readonly string[]).includes(fileType)) {
      return category as FileCategory;
    }
  }
  return null;
}

/**
 * Valida si un archivo es permitido
 */
export function isFileTypeAllowed(
  file: File,
  allowedTypes?: string[]
): boolean {
  if (!allowedTypes || allowedTypes.length === 0) {
    // Si no se especifican tipos, permitir todos los conocidos
    return (Object.values(ALLOWED_FILE_TYPES).flat() as string[]).includes(
      file.type
    );
  }

  // Si el primer tipo es */*, permitir cualquier tipo
  if (allowedTypes[0] === "*/*") {
    return true;
  }

  // Verificar si el tipo de archivo está en la lista permitida
  return allowedTypes.some((type) => {
    if (type.includes("*")) {
      const regex = new RegExp(type.replace("*", ".*"));
      return regex.test(file.type);
    }
    return file.type === type;
  });
}

/**
 * Valida el tamaño del archivo según su categoría
 */
export function validateFileSize(file: File): {
  isValid: boolean;
  maxSize: number;
  error?: string;
} {
  const category = getFileCategory(file.type);
  const maxSize = category
    ? FILE_SIZE_LIMITS[category]
    : FILE_SIZE_LIMITS.default;

  if (file.size > maxSize) {
    return {
      isValid: false,
      maxSize,
      error: `El archivo excede el tamaño máximo permitido de ${formatFileSize(maxSize)}`,
    };
  }

  return {
    isValid: true,
    maxSize,
  };
}

/**
 * Formatea el tamaño del archivo a texto legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Valida un archivo completamente
 */
export function validateFile(
  file: File,
  options?: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  }
): {
  isValid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // Validar tipo de archivo
  if (!isFileTypeAllowed(file, options?.allowedTypes)) {
    return {
      isValid: false,
      error: "Tipo de archivo no permitido",
    };
  }

  // Validar tamaño
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.isValid) {
    return {
      isValid: false,
      error: options?.maxSizeMB
        ? `El archivo excede el tamaño máximo de ${options.maxSizeMB}MB`
        : sizeValidation.error,
    };
  }

  // Advertencias
  const category = getFileCategory(file.type);
  if (!category) {
    warnings.push("Tipo de archivo no reconocido");
  }

  if (file.size > 10 * 1024 * 1024) {
    warnings.push("El archivo es pesado y podría tardar en subir");
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Obtiene información del archivo para mostrar
 */
export function getFileInfo(file: File): {
  name: string;
  size: string;
  type: string;
  category: FileCategory | null;
  extension: string;
} {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const category = getFileCategory(file.type);

  return {
    name: file.name,
    size: formatFileSize(file.size),
    type: file.type,
    category,
    extension,
  };
}
