const weights = {
  happy: 1.0,
  surprise: 0.5,
  neutral: 0,
  sad: -0.7,
  fear: -0.6,
  angry: -1.0,
  disgust: -0.9,
};

const calculateFinalScore = (emotionDetail = {}) => {
  const sum = Object.values(emotionDetail).reduce((a, b) => a + b, 0);

  if (!sum) return 0.5;

  let raw = 0;
  for (let key in emotionDetail) {
    const normalized = emotionDetail[key] / sum;
    raw += normalized * (weights[key] || 0);
  }

  return Math.max(0, Math.min(1, (raw + 1) / 2));
};

const classifySentimentLevel = (score) => {
  if (score < 0.2) return "very_negative";
  if (score < 0.4) return "negative";
  if (score < 0.6) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
};

export { calculateFinalScore, classifySentimentLevel };
