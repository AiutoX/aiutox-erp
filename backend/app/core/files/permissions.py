"""Files module permission constants."""

FILES_READ = "files.read"  # View and download files
FILES_WRITE = "files.write"  # Upload new files
FILES_DELETE = "files.delete"  # Delete own files
FILES_ADMIN = "files.admin"  # Delete any file, configure storage

ALL_FILE_PERMISSIONS = [FILES_READ, FILES_WRITE, FILES_DELETE, FILES_ADMIN]

PERMISSION_DESCRIPTIONS = {
    FILES_READ: "View and download files",
    FILES_WRITE: "Upload new files to the system",
    FILES_DELETE: "Delete own files",
    FILES_ADMIN: "Delete any file and configure file storage settings",
}
