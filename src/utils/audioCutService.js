import { exec } from "child_process";
import fs from "fs";
import path from "path";

const cutAudioSegment = (inputPath, start, end, outputPath) => {
  return new Promise((resolve, reject) => {
    const duration = end - start;

    const cmd = `ffmpeg -y -i "${inputPath}" -ss ${start} -t ${duration} "${outputPath}"`;

    exec(cmd, (error) => {
      if (error) return reject(error);
      resolve(outputPath);
    });
  });
};

const ensureTempDir = () => {
  const dir = "temp_segments";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return dir;
};

export { cutAudioSegment, ensureTempDir };
