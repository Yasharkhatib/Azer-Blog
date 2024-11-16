"use client";

import { useUser } from "@clerk/nextjs";
import { Alert, Button, FileInput, Select, TextInput } from "flowbite-react";
import Image from "next/image";
import { useState } from "react";
import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

import "react-quill-new/dist/quill.snow.css";

import { CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function CreatePostPage() {
  const { isSignedIn, user, isLoaded } = useUser();

  const [imageUploadError, setImageUploadError] = useState(null);
  const [formData, setFormData] = useState({});

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [cldResponse, setCldResponse] = useState(null);

  const handleUpdloadImage = async () => {
    if (!file) {
      console.error("Please select a file.");
      return;
    }

    const uniqueUploadId = generateUniqueUploadId();
    const chunkSize = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    setUploading(true);

    const uploadChunk = async (start, end) => {
      const formData = new FormData();
      formData.append("file", file.slice(start, end));
      formData.append("cloud_name", CLOUD_NAME);
      formData.append("upload_preset", UPLOAD_PRESET);
      const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

      console.log(
        `Uploading chunk for uniqueUploadId: ${uniqueUploadId}; start: ${start}, end: ${
          end - 1
        }`
      );

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
          {
            method: "POST",
            body: formData,
            headers: {
              "X-Unique-Upload-Id": uniqueUploadId,
              "Content-Range": contentRange,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Chunk upload failed.");
        }

        currentChunk++;

        if (currentChunk < totalChunks) {
          const nextStart = currentChunk * chunkSize;
          const nextEnd = Math.min(nextStart + chunkSize, file.size);
          uploadChunk(nextStart, nextEnd);
        } else {
          setUploadComplete(true);
          setUploading(false);

          const fetchResponse = await response.json();
          setCldResponse(fetchResponse);
          console.info("File upload complete.");
        }
      } catch (error) {
        console.error("Error uploading chunk:", error);
        setUploading(false);
      }
    };

    const start = 0;
    const end = Math.min(chunkSize, file.size);
    uploadChunk(start, end);
  };

  const generateUniqueUploadId = () => {
    return `uqid-${Date.now()}`;
  };

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn && user.publicMetadata.isAdmin) {
    return (
      <div className="p-3 max-w-3xl mx-auto min-h-screen">
        <h1 className="text-center text-3xl my-7 font-semibold">
          Create a post
        </h1>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row justify-between">
            <TextInput
              type="text"
              placeholder="Title"
              required
              id="title"
              className="flex-1"
            />
            <Select>
              <option value="uncategorized">Select a category</option>
              <option value="javascript">JavaScript</option>
              <option value="reactjs">React.js</option>
              <option value="nextjs">Next.js</option>
            </Select>
          </div>
          <div className="flex gap-4 items-center justify-between border-4 border-teal-500 border-dotted p-3">
            <FileInput
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <Button
              type="button"
              gradientDuoTone="purpleToBlue"
              size="sm"
              outline
              onClick={handleUpdloadImage}
              disabled={uploading}
            >
              {uploading ? (
                <div className="w-16 h-16">
                  <CircularProgressbar
                    value={uploading}
                    text={`${uploading || 0}%`}
                  />
                </div>
              ) : (
                "Upload Image"
              )}
            </Button>
          </div>
          {imageUploadError && (
            <Alert color="failure">{imageUploadError}</Alert>
          )}
          {formData.image && (
            <Image
              src={formData.image}
              alt="upload"
              className="w-full h-72 object-cover"
            />
          )}
          {/* 
          {uploadComplete}
*/}
          <ReactQuill
            theme="snow"
            placeholder="Write something..."
            className="h-72 mb-12"
            required
          />
          <Button type="submit" gradientDuoTone="purpleToPink">
            Publish
          </Button>
        </form>
      </div>
    );
  } else {
    return (
      <h1 className="text-center text-3xl my-7 font-semibold">
        You are not authorized to view this page
      </h1>
    );
  }
}
