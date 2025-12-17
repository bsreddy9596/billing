// src/components/FileUploader.jsx
import { useState } from "react";
import api from "../api/api";

export default function FileUploader({ onUpload, initialUrl }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(initialUrl || null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setError(null);

        // start upload
        const form = new FormData();
        form.append("file", f);

        try {
            setUploading(true);
            const res = await api.post("/upload", form, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (ev) => {
                    const pct = Math.round((ev.loaded / ev.total) * 100);
                    setProgress(pct);
                },
            });
            const filePath = res.data.filePath;
            setPreview(filePath);
            onUpload && onUpload(filePath);
        } catch (err) {
            console.error("Upload failed:", err);
            setError("Upload failed");
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Drawing Image</label>
            <div className="flex items-center gap-3">
                <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center border">
                    {preview ? (
                        // If preview is a URL path (starts with /uploads) or blob
                        <img
                            src={preview}
                            alt="preview"
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <span className="text-xs text-gray-400">No image</span>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        <span className="text-sm text-gray-700">Choose Image</span>
                    </label>
                    {uploading && (
                        <div className="w-44 bg-gray-200 rounded overflow-hidden">
                            <div className="h-2 bg-green-500" style={{ width: `${progress}%` }} />
                        </div>
                    )}
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>
            </div>
        </div>
    );
}
