import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Ensure Next.js runs this route in a Node.js environment (ffmpeg cannot run in Edge runtime).
export const runtime = 'nodejs';

// Point fluent-ffmpeg to the static ffmpeg binary from ffmpeg-static.
ffmpeg.setFfmpegPath(ffmpegStatic);

function runFfmpeg(inputPath, outputPath, watermarkText) {
  return new Promise((resolve, reject) => {
    // Escape characters that can break FFmpeg drawtext filter syntax.
    const escapedText = watermarkText
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'");

    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        // Draw watermark near bottom-right corner with semi-transparent black background.
        `-vf drawtext=text='${escapedText}':x=w-tw-20:y=h-th-20:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=8`,
        '-movflags +faststart'
      ])
      .on('end', resolve)
      .on('error', reject)
      .save(outputPath);
  });
}

export async function POST(request) {
  let inputPath = '';
  let outputPath = '';

  try {
    // Read multipart form fields: a video file and a text value.
    const formData = await request.formData();
    const video = formData.get('video');
    const text = String(formData.get('text') || '').trim();

    if (!video || typeof video === 'string') {
      return new Response('A video file is required in the "video" field.', { status: 400 });
    }

    if (!text) {
      return new Response('Watermark text is required in the "text" field.', { status: 400 });
    }

    // Save incoming file to a temp location ffmpeg can read from.
    const tempDir = os.tmpdir();
    const id = randomUUID();
    inputPath = path.join(tempDir, `${id}-input.mp4`);
    outputPath = path.join(tempDir, `${id}-watermarked.mp4`);

    const videoBuffer = Buffer.from(await video.arrayBuffer());
    await fs.writeFile(inputPath, videoBuffer);

    // Process the video with ffmpeg.
    await runFfmpeg(inputPath, outputPath, text);

    // Read the resulting file and return it as a downloadable video response.
    const outputBuffer = await fs.readFile(outputPath);

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="watermarked-video.mp4"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Watermarking error:', error);
    return new Response('Failed to watermark video.', { status: 500 });
  } finally {
    // Clean up temporary files when they exist.
    await Promise.all([
      inputPath ? fs.unlink(inputPath).catch(() => {}) : Promise.resolve(),
      outputPath ? fs.unlink(outputPath).catch(() => {}) : Promise.resolve()
    ]);
  }
}
