const weights = {
  happy: 1.0,
  surprise: 0.5,
  neutral: 0,
  sad: -0.7,
  fear: -0.6,
  angry: -1.0,
  disgust: -0.9,
};

const voiceWeights = {
  happy: 0.9,
  surprise: 0.4,
  neutral: 0,

  sad: -0.5,
  fear: -0.4,
  angry: -0.7,
  disgust: -0.6,
};

const normalizeEmotionObject = (obj = {}) => {
  const keys = [
    "happy",
    "sad",
    "angry",
    "fear",
    "surprise",
    "disgust",
    "neutral",
  ];

  const cleaned = {};
  let sum = 0;

  for (const key of keys) {
    const val = Number(obj[key]) || 0;
    cleaned[key] = val;
    sum += val;
  }

  // nếu AI trả rỗng => neutral 100%
  if (sum <= 0) {
    return {
      happy: 0,
      sad: 0,
      angry: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      neutral: 1,
    };
  }

  // normalize lần 1
  for (const key of keys) {
    cleaned[key] = +(cleaned[key] / sum).toFixed(4);
  }

  // fix lỗi làm tròn khiến tổng !=1
  let total = keys.reduce((a, k) => a + cleaned[k], 0);
  let diff = +(1 - total).toFixed(4);

  // cộng phần dư vào neutral
  cleaned.neutral = +(cleaned.neutral + diff).toFixed(4);

  // chống âm
  if (cleaned.neutral < 0) cleaned.neutral = 0;

  return cleaned;
};

const normalizeToneEmotion = (emotion = "neutral") => {
  const map = {
    fearful: "fear",
    surprised: "surprise",
  };

  return map[emotion] || emotion || "neutral";
};

const normalizeToneProbs = (probs = {}) => {
  return {
    happy: Number(probs.happy || 0),
    sad: Number(probs.sad || 0),
    angry: Number(probs.angry || 0),
    fear: Number(probs.fear || probs.fearful || 0),
    surprise: Number(probs.surprise || probs.surprised || 0),
    disgust: Number(probs.disgust || 0),
    neutral: Number(probs.neutral || 0),
  };
};

const calculateFinalScore = (emotionDetail = {}) => {
  const normalized = normalizeEmotionObject(emotionDetail);

  let raw = 0;

  for (let key in normalized) {
    raw += normalized[key] * (weights[key] || 0);
  }

  const score = Math.max(0, Math.min(1, (raw + 1) / 2));

  return {
    score,
    emotions: normalized,
  };
};

const calculateVoiceScore = (emotionDetail = {}) => {
  const normalized = normalizeEmotionObject(emotionDetail);

  let raw = 0;

  for (let key in normalized) {
    raw += normalized[key] * (voiceWeights[key] || 0);
  }

  const score = Math.max(0, Math.min(1, (raw + 1) / 2));

  return {
    score,
    emotions: normalized,
  };
};

const classifySentimentLevel = (score) => {
  if (score < 0.2) return "very_negative";
  if (score < 0.4) return "negative";
  if (score < 0.6) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
};

const mapToneEmotionToScore = (emotion = "neutral", confidence = 1) => {
  const baseMap = {
    happy: 0.9,
    surprise: 0.72,
    neutral: 0.5,
    sad: 0.25,
    fear: 0.2,
    angry: 0.1,
    disgust: 0.08,
  };

  const base = baseMap[emotion] ?? 0.5;
  const conf = Number(confidence || 0);

  // confidence cao thì score sát emotion hơn
  const score = 0.5 + (base - 0.5) * conf;

  return +score.toFixed(4);
};

const detectHardRoleV2 = (text = "", aiRole = "unknown") => {
  const lower = (text || "").toLowerCase().trim();

  let staffScore = 0;
  let customerScore = 0;

  const DIFF_THRESHOLD = 3;

  const makeResult = (role) => ({
    role,
    staffScore,
    customerScore,
    diff: staffScore - customerScore,
  });

  const staffRules = [
    { keyword: "xin chào", score: 2 },
    { keyword: "em hỗ trợ", score: 4 },
    { keyword: "bên em", score: 3 },

    { keyword: "cho em xin", score: 7 },
    { keyword: "anh cho em xin", score: 8 },
    { keyword: "chị cho em xin", score: 8 },
    { keyword: "cho em xin cái địa chỉ", score: 9 },
    { keyword: "cho anh xin", score: 6 },

    { keyword: "số điện thoại", score: 6 },
    { keyword: "địa chỉ", score: 3 },
    { keyword: "họ tên", score: 6 },
    { keyword: "tên khách hàng", score: 7 },
    { keyword: "mã đơn", score: 7 },
    { keyword: "mã đơn hàng", score: 7 },
    { keyword: "đơn hàng", score: 2 },

    { keyword: "tỉnh nào", score: 8 },
    { keyword: "mình ở tỉnh nào", score: 8 },
    { keyword: "quận huyện", score: 8 },
    { keyword: "mình ở quận huyện nào", score: 8 },
    { keyword: "huyện nào", score: 7 },
    { keyword: "xã nào", score: 7 },
    { keyword: "phường nào", score: 7 },
    { keyword: "xã", score: 1 },
    { keyword: "phường", score: 1 },

    { keyword: "em kiểm tra", score: 6 },
    { keyword: "kiểm tra giúp", score: 6 },
    { keyword: "xác nhận đơn", score: 7 },
    { keyword: "giao hàng", score: 5 },
    { keyword: "3 đến 4 ngày", score: 7 },
    { keyword: "nhận hàng", score: 4 },

    { keyword: "miễn phí", score: 3 },
    { keyword: "ưu đãi", score: 3 },
    { keyword: "khuyến mãi", score: 3 },
    { keyword: "mình có lấy thêm không", score: 7 },
    { keyword: "hỗ trợ mình miễn phí", score: 6 },

    { keyword: "đúng không anh", score: 5 },
    { keyword: "đúng không chị", score: 5 },
    { keyword: "đọc lại nha", score: 7 },
  ];

  const customerRules = [
    { keyword: "cho tôi hỏi", score: 7 },
    { keyword: "cho em hỏi", score: 6 },
    { keyword: "tôi muốn", score: 6 },
    { keyword: "em muốn", score: 5 },

    { keyword: "đơn hàng của tôi", score: 8 },
    { keyword: "tài khoản của tôi", score: 8 },
    { keyword: "máy của tôi", score: 7 },

    { keyword: "bị lỗi", score: 7 },
    { keyword: "không đăng nhập được", score: 8 },
    { keyword: "không nhận được", score: 7 },
    { keyword: "chưa nhận được", score: 7 },

    { keyword: "khiếu nại", score: 8 },
    { keyword: "sao chưa", score: 5 },
    { keyword: "bao giờ", score: 4 },
    { keyword: "ở đâu", score: 4 },

    { keyword: "không ạ", score: 4 },
    { keyword: "mệt rồi", score: 5 },
    { keyword: "lai châu", score: 3 },
    { keyword: "phong thổ", score: 3 },
    { keyword: "đúng rồi", score: 2 },
    { keyword: "rồi ạ", score: 2 },
  ];

  for (const rule of staffRules) {
    if (lower.includes(rule.keyword)) {
      staffScore += rule.score;
    }
  }

  for (const rule of customerRules) {
    if (lower.includes(rule.keyword)) {
      customerScore += rule.score;
    }
  }

  const shortReplies = [
    "dạ",
    "vâng",
    "ok",
    "ừ",
    "uh",
    "rồi",
    "đúng rồi",
    "được rồi",
  ];

  const isShort =
    lower.length < 25 && shortReplies.some((item) => lower.includes(item));

  if (isShort && staffScore === 0 && customerScore === 0) {
    if (aiRole === "staff" || aiRole === "customer") {
      return makeResult(aiRole);
    }

    return makeResult("customer");
  }

  const diff = staffScore - customerScore;

  if (
    Math.abs(diff) < DIFF_THRESHOLD &&
    (aiRole === "staff" || aiRole === "customer")
  ) {
    return makeResult(aiRole);
  }

  if (diff >= DIFF_THRESHOLD) {
    return makeResult("staff");
  }

  if (diff <= -DIFF_THRESHOLD) {
    return makeResult("customer");
  }

  const questionHints = [
    "tỉnh nào",
    "quận huyện",
    "xã nào",
    "phường nào",
    "đúng không",
    "cho em xin",
    "anh cho em xin",
    "chị cho em xin",
  ];

  const likelyStaff = questionHints.some((item) => lower.includes(item));

  if (likelyStaff) {
    return makeResult("staff");
  }

  if (aiRole === "staff" || aiRole === "customer") {
    return makeResult(aiRole);
  }

  return makeResult("customer");
};

const resolveRolePair = (roleMap, scoreMap, aiSpeakers) => {
  const speakers = Object.keys(roleMap);

  if (speakers.length !== 2) return roleMap;

  const [s1, s2] = speakers;

  const r1 = roleMap[s1];
  const r2 = roleMap[s2];

  // nếu đã hợp lệ thì giữ nguyên
  if (
    (r1 === "staff" && r2 === "customer") ||
    (r1 === "customer" && r2 === "staff")
  ) {
    return roleMap;
  }

  // nếu bị 2 staff hoặc 2 customer
  const staffScore1 = scoreMap[s1]?.staffScore || 0;
  const staffScore2 = scoreMap[s2]?.staffScore || 0;

  const customerScore1 = scoreMap[s1]?.customerScore || 0;
  const customerScore2 = scoreMap[s2]?.customerScore || 0;

  const confidence1 = Math.abs(staffScore1 - customerScore1);
  const confidence2 = Math.abs(staffScore2 - customerScore2);

  // speaker nào có dấu hiệu staff mạnh hơn thì làm staff
  const s1StaffGap = staffScore1 - customerScore1;
  const s2StaffGap = staffScore2 - customerScore2;

  let staffSpeaker;

  if (Math.abs(s1StaffGap - s2StaffGap) >= 2) {
    staffSpeaker = s1StaffGap > s2StaffGap ? s1 : s2;
  } else {
    // nếu rule không phân biệt rõ thì tin GPT ban đầu
    staffSpeaker =
      aiSpeakers[s1]?.role === "staff"
        ? s1
        : aiSpeakers[s2]?.role === "staff"
          ? s2
          : s1;
  }

  return {
    [s1]: staffSpeaker === s1 ? "staff" : "customer",
    [s2]: staffSpeaker === s2 ? "staff" : "customer",
  };
};

export {
  calculateFinalScore,
  classifySentimentLevel,
  calculateVoiceScore,
  resolveRolePair,
  detectHardRoleV2,
  normalizeToneProbs,
  normalizeEmotionObject,
  normalizeToneEmotion,
  mapToneEmotionToScore,
};
