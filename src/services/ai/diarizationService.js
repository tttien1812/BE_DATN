import { exec } from "child_process";

const diarizationService = (audioPath) => {
  return new Promise((resolve, reject) => {
    exec(
      `"venv\\Scripts\\python.exe" ai/diarization.py "${audioPath}"`,
      { timeout: 120000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Diarization error:", stderr);
          return reject(error);
        }

        try {
          console.log("RAW PYTHON OUTPUT:\n", stdout); // 🔥 DEBUG

          const segments = stdout
            .split("\n")
            .map((line) => {
              // 🔥 hỗ trợ nhiều format hơn
              const match =
                line.match(/([\d.]+)s\s*-\s*([\d.]+)s:\s*(SPEAKER_\d+)/) ||
                line.match(
                  /\[(\d+:\d+.\d+)\s*-->\s*(\d+:\d+.\d+)\]\s*(SPEAKER_\d+)/,
                );

              if (!match) return null;

              // 🔥 convert time nếu dạng mm:ss
              const toSeconds = (t) => {
                if (t.includes(":")) {
                  const [m, s] = t.split(":");
                  return parseFloat(m) * 60 + parseFloat(s);
                }
                return parseFloat(t);
              };

              return {
                start: toSeconds(match[1]),
                end: toSeconds(match[2]),
                speaker: match[3],
              };
            })
            .filter(Boolean);

          resolve(segments);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
};

export { diarizationService };
