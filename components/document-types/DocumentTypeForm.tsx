'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createDocumentType,
  updateDocumentType,
  type DocumentType,
} from '@/app/actions/document-types';

type Props = {
  documentType?: DocumentType;
  mode: 'create' | 'edit';
};

export default function DocumentTypeForm({ documentType, mode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: documentType?.name || '',
    prefix: documentType?.prefix || '',
    description: documentType?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result =
        mode === 'create'
          ? await createDocumentType(formData)
          : await updateDocumentType(documentType!.id, formData);

      if (result.success) {
        router.push('/dashboard/document-types');
        router.refresh();
      } else if (result.error) {
        if (result.error.field) {
          setErrors({ [result.error.field]: result.error.message });
        } else {
          alert(result.error.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.name ? 'border-red-300' : 'border-slate-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          placeholder="e.g., Form, Procedure, Work Instruction"
          maxLength={100}
          required
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        <p className="mt-1 text-xs text-slate-500">
          The display name for this document type (max 100 characters)
        </p>
      </div>

      {/* Prefix Field */}
      <div>
        <label htmlFor="prefix" className="block text-sm font-medium text-slate-700">
          Prefix <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="prefix"
          value={formData.prefix}
          onChange={(e) => handleChange('prefix', e.target.value.toUpperCase())}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.prefix ? 'border-red-300' : 'border-slate-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono`}
          placeholder="e.g., FORM, PROC, WI"
          pattern="[A-Z]{2,10}"
          maxLength={10}
          required
        />
        {errors.prefix && <p className="mt-1 text-sm text-red-600">{errors.prefix}</p>}
        <p className="mt-1 text-xs text-slate-500">
          2-10 uppercase letters only (e.g., FORM, PROC). Must be unique. Documents will be numbered
          as PREFIX-00001vA
        </p>
        {mode === 'edit' && documentType && (
          <p className="mt-2 text-xs text-amber-600 flex items-start gap-1">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Note: Prefix cannot be changed if documents exist with this type
          </p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className={`mt-1 block w-full px-3 py-2 border ${
            errors.description ? 'border-red-300' : 'border-slate-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          placeholder="Optional description of this document type"
          maxLength={500}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Optional description (max 500 characters)
        </p>
      </div>

      {/* Preview */}
      {formData.prefix && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Document Number Preview</h4>
          <p className="text-sm text-slate-600">
            Documents will be numbered as:{' '}
            <span className="font-mono font-semibold text-blue-600">
              {formData.prefix}-00001vA
            </span>
            ,{' '}
            <span className="font-mono font-semibold text-blue-600">
              {formData.prefix}-00002vA
            </span>
            , etc.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href="/dashboard/document-types"
          className="text-sm font-medium text-slate-700 hover:text-slate-900"
        >
          ← Back to Document Types
        </Link>
        <div className="flex gap-3">
          <Link
            href="/dashboard/document-types"
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : mode === 'create' ? 'Create Document Type' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
