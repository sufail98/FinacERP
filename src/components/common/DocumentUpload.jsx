import { useRef } from 'react';
import { FileText, FileSpreadsheet, Image as ImageIcon, X, Upload } from 'lucide-react';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv,.pdf,image/*';
const MAX_FILE_SIZE_MB = 10;

const getFileIcon = (nameOrFile) => {
  const name = typeof nameOrFile === 'string' ? nameOrFile : nameOrFile.name;
  const ext = name.split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
  if (ext === 'pdf') return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ImageIcon;
  return FileText;
};

const DocumentUpload = ({
  documents,
  setDocuments,
  existingDocuments = [],
  setExistingDocuments,
  removedDocuments = [],
  setRemovedDocuments,
  disabled,
}) => {
  const inputRef = useRef(null);

  const isValidType = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    return ['xlsx', 'xls', 'csv', 'pdf'].includes(ext) || file.type.startsWith('image/');
  };

  const handleFiles = (fileList) => {
    const incoming = Array.from(fileList);
    const valid = [];
    const rejected = [];

    incoming.forEach((file) => {
      if (!isValidType(file)) {
        rejected.push(`${file.name} (unsupported type)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        rejected.push(`${file.name} (exceeds ${MAX_FILE_SIZE_MB}MB)`);
        return;
      }
      valid.push(file);
    });

    if (rejected.length) {
      alert(`Some files were skipped:\n${rejected.join('\n')}`);
    }

    setDocuments((prev) => [...prev, ...valid]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeNewFile = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (url) => {
    setExistingDocuments((prev) => prev.filter((u) => u !== url));
    setRemovedDocuments((prev) => [...prev, url]);
  };

  const getFileNameFromUrl = (url) => url.split('/').pop();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-dashed border-themed dark:border-themed rounded-md text-blue-600 dark:text-blue-400 hover:bg-secondary dark:hover:bg-secondary disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Attach documents
        </button>
        {/* <span className="text-xs text-muted dark:text-muted">
          Excel, CSV, PDF, or Images — multiple allowed
        </span> */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {(existingDocuments.length > 0 || documents.length > 0) && (
        <ul className="space-y-1">
          {existingDocuments.map((url) => {
            const name = getFileNameFromUrl(url);
            const Icon = getFileIcon(name);
            const isImage = /\.(png|jpg|jpeg|gif|webp)$/i.test(name);
            return (
              <li
                key={url}
                className="flex items-center justify-between gap-2 px-2 py-1 bg-secondary dark:bg-secondary rounded text-xs"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 truncate text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isImage ? (
                    <img src={url} alt={name} className="w-6 h-6 object-cover rounded flex-shrink-0" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span className="truncate">{name}</span>
                </a>
                <button
                  type="button"
                  onClick={() => removeExistingFile(url)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                  title="Remove this document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}

          {documents.map((file, idx) => {
            const Icon = getFileIcon(file);
            return (
              <li
                key={`${file.name}-${idx}`}
                className="flex items-center justify-between gap-2 px-2 py-1 bg-secondary dark:bg-secondary rounded text-xs"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">(new)</span>
                  <span className="text-muted dark:text-muted flex-shrink-0">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removeNewFile(idx)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default DocumentUpload;