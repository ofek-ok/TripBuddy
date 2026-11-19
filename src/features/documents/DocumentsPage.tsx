import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useAppStore } from '@/app/providers/AppStoreProvider';
import { useToast } from '@/lib/errors/errorHandler';
import {
  Badge,
  Button,
  Card,
  Input,
  ModalDrawer,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { formatDate, formatFileSize } from '@/lib/utils/formatters';
import { DocumentCategory, TripDocument } from '@/types/database.types';
import {
  Download,
  Eye,
  FileText,
  FolderLock,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';

const DOC_CATEGORIES: DocumentCategory[] = [
  'Flight Tickets',
  'Hotel Reservations',
  'Insurance',
  'Car Rental',
  'Attractions',
  'Personal Documents',
  'Receipts',
  'Other',
];

export const DocumentsPage: React.FC = () => {
  const { lang, t } = useI18n();
  const {
    activeTrip,
    activeDocuments,
    uploadDocument,
    getDocumentSignedUrl,
    deleteDocument,
  } = useAppStore();
  const { notify, handleError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setUploadOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Upload Form
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Flight Tickets');
  const [expirationDate, setExpirationDate] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Preview Signed URL modal
  const [previewDoc, setPreviewDoc] = useState<TripDocument | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    return activeDocuments.filter((doc) => {
      if (categoryFilter !== 'ALL' && doc.category !== categoryFilter) return false;
      if (
        searchQuery.trim() &&
        !doc.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(doc.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [activeDocuments, categoryFilter, searchQuery]);

  if (!activeTrip) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold">{t.common.noActiveTrip}</p>
      </Card>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      handleError(new Error('Please select a file'));
      return;
    }
    try {
      setIsUploading(true);
      await uploadDocument(file, {
        name: docName.trim() || file.name,
        category,
        expiration_date: expirationDate || null,
        description: description.trim() || null,
      });
      setUploadOpen(false);
      setFile(null);
      setDocName('');
      setExpirationDate('');
      setDescription('');
      notify(
        lang === 'he'
          ? 'המסמך הועלה לכספת הפרטית בהצלחה!'
          : 'Document securely uploaded to vault!',
        'success'
      );
    } catch (err) {
      handleError(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePreview = async (doc: TripDocument) => {
    try {
      const signedUrl = await getDocumentSignedUrl(doc);
      setPreviewDoc(doc);
      setPreviewSignedUrl(signedUrl);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDownload = async (doc: TripDocument) => {
    try {
      const signedUrl = await getDocumentSignedUrl(doc);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = doc.name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy">{t.documents.title}</h1>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sage-dark font-semibold mt-0.5">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.documents.securityBadge}</span>
          </div>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" />
          <span>{t.documents.uploadDoc}</span>
        </Button>
      </div>

      {/* Search & Category Filter */}
      <Card className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          placeholder={t.common.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">{t.common.all}</option>
          {DOC_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t.documents.categories[cat]}
            </option>
          ))}
        </Select>
      </Card>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <FolderLock className="w-8 h-8 text-sand mx-auto" />
          <p className="text-sm font-semibold">
            {lang === 'he'
              ? 'אין מסמכים בכספת עבור סינון זה'
              : 'No documents in the vault matching filter'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="space-y-3 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="sage">{t.documents.categories[doc.category]}</Badge>
                    <span className="text-[11px] text-navy/50">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-navy truncate">{doc.name}</h3>
                  {doc.description && (
                    <p className="text-xs text-navy/65 line-clamp-2">{doc.description}</p>
                  )}
                  {doc.expiration_date && (
                    <p className="text-[11px] text-sand-dark font-semibold">
                      {t.documents.expirationDate}: {formatDate(doc.expiration_date, lang)}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2.5 border-t border-navy/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.documents.preview}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)}>
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.documents.download}</span>
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => deleteDocument(doc)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Document Drawer */}
      <ModalDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title={t.documents.uploadDoc}
      >
        <form onSubmit={handleUpload} className="space-y-3.5">
          <div className="p-4 rounded-2xl border-2 border-dashed border-navy/20 bg-ivory/50 text-center space-y-2">
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (selected && !docName) {
                  setDocName(selected.name.replace(/\.[^/.]+$/, ''));
                }
              }}
              className="block w-full text-xs text-navy file:me-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy-light"
              required
            />
            <p className="text-[11px] text-navy/55">
              PDF, JPG, PNG, WEBP, HEIC • Max 20MB • Stored in Private Bucket
            </p>
          </div>

          <Input
            label={t.documents.docName}
            required
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder={lang === 'he' ? 'למשל: כרטיסי טיסה הלוך-חזור' : 'e.g., Flight Boarding Passes'}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.common.category}
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            >
              {DOC_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.documents.categories[cat]}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              label={t.documents.expirationDate}
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>

          <Textarea
            label={t.common.notes}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? t.common.loading : t.common.save}
            </Button>
          </div>
        </form>
      </ModalDrawer>

      {/* Signed URL Secure Preview Modal */}
      <ModalDrawer
        open={Boolean(previewDoc && previewSignedUrl)}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewSignedUrl(null);
        }}
        title={previewDoc?.name || t.documents.preview}
      >
        {previewDoc && previewSignedUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-sage-dark font-semibold bg-sage/15 px-3 py-2 rounded-xl">
              <span>Signed URL Active (120s TTL)</span>
              <span>{previewDoc.file_type}</span>
            </div>
            {previewDoc.file_type.startsWith('image/') ? (
              <img
                src={previewSignedUrl}
                alt={previewDoc.name}
                className="w-full max-h-[60vh] object-contain rounded-2xl border border-navy/10"
              />
            ) : (
              <iframe
                src={previewSignedUrl}
                title={previewDoc.name}
                className="w-full h-[60vh] rounded-2xl border border-navy/10"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleDownload(previewDoc)}>
                <Download className="w-4 h-4" />
                <span>{t.documents.download}</span>
              </Button>
            </div>
          </div>
        )}
      </ModalDrawer>
    </div>
  );
};
