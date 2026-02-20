'use client';

import { useState } from 'react';

// Main UI page: upload a video, enter watermark text, and download the processed result.
export default function HomePage() {
  const [videoFile, setVideoFile] = useState(null);
  const [watermarkText, setWatermarkText] = useState('Sample Watermark');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleWatermark() {
    if (!videoFile) {
      setErrorMessage('Please choose a video file first.');
      return;
    }

    if (!watermarkText.trim()) {
      setErrorMessage('Please enter watermark text.');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      // Build multipart form data exactly how the API route expects it.
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('text', watermarkText);

      const response = await fetch('/api/watermark', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const apiError = await response.text();
        throw new Error(apiError || 'Watermark request failed.');
      }

      // Convert the streamed response into a blob so we can download it in-browser.
      const outputBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(outputBlob);

      // Trigger a file download without leaving the page.
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'watermarked-video.mp4';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setErrorMessage(error.message || 'Unexpected error while processing video.');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <main>
      <h1>Video Watermark Tool</h1>
      <p>Upload a video, add watermark text, and download the processed file.</p>

      <div className="form-field">
        <label htmlFor="video-input">Video file</label>
        <input
          id="video-input"
          type="file"
          accept="video/*"
          onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="text-input">Watermark text</label>
        <input
          id="text-input"
          type="text"
          value={watermarkText}
          onChange={(event) => setWatermarkText(event.target.value)}
          placeholder="Enter watermark text"
        />
      </div>

      <button onClick={handleWatermark} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Add Watermark & Download'}
      </button>

      {errorMessage ? <p className="error">{errorMessage}</p> : null}
    </main>
  );
}
