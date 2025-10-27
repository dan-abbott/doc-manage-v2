'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  toggleDocumentTypeStatus,
  deleteDocumentType,
  type DocumentType,
} from '@/app/actions/document-types';

type Props = {
  documentTypes: DocumentType[];
};

export default function DocumentTypesTable({ documentTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleToggleStatus = async (id: string) => {
    setLoading(id);
    try {
      const result = await toggleDocumentTypeStatus(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error?.message || 'Failed to update status');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(id);
    try {
      const result = await deleteDocumentType(id);
      if (result.success) {
        setDeleteConfirm(null);
        router.refresh();
      } else {
        alert(result.error?.message || 'Failed to delete document type');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Prefix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Next Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {documentTypes.map((type) => (
              <tr key={type.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{type.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono font-semibold text-blue-600">
                    {type.prefix}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-500 max-w-md truncate">
                    {type.description || <span className="italic">No description</span>}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-600">
                    {type.prefix}-{String(type.next_number).padStart(5, '0')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {type.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/dashboard/document-types/${type.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(type.id)}
                      disabled={loading === type.id}
                      className="text-slate-600 hover:text-slate-900 disabled:opacity-50"
                    >
                      {loading === type.id ? 'Loading...' : type.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(type.id)}
                      disabled={loading === type.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Confirm Deletion</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this document type? This action cannot be undone.
              {documentTypes.find((t) => t.id === deleteConfirm)?.name && (
                <span className="block mt-2 font-medium">
                  Deleting: {documentTypes.find((t) => t.id === deleteConfirm)?.name}
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading === deleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {loading === deleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
