import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/api";

export default function UpdateImageModal({ open, onClose, drawing, onUpdated }) {
    const [file, setFile] = useState(null);

    if (!open) return null;

    const handleUpload = async () => {
        if (!file) return toast.error("Select a file");

        try {
            const form = new FormData();
            form.append("file", file);

            const res = await api.post("/upload", form);
            const url = res.data.url;

            onUpdated(url);
            onClose();
            toast.success("Image updated!");
        } catch (err) {
            toast.error("Upload failed");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-[90%] max-w-md">
                <h2 className="text-xl font-semibold mb-4">Update Image</h2>

                {drawing?.drawingUrl && (
                    <img
                        src={drawing.drawingUrl}
                        className="w-full h-40 object-contain rounded mb-4 border"
                    />
                )}

                <input
                    type="file"
                    className="mb-4"
                    onChange={(e) => setFile(e.target.files[0])}
                />

                <div className="flex justify-end gap-3">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded"
                        onClick={onClose}
                    >
                        Cancel
                    </button>

                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded"
                        onClick={handleUpload}
                    >
                        Update
                    </button>
                </div>
            </div>
        </div>
    );
}
