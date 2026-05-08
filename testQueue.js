import { predictToneService } from "./src/services/ai/diarizationService.js";

const run = async () => {
  const res = await predictToneService("uploads/1776511328417.ogg");
  console.log(res);
};

run();
