const weights = {
  happy: 1.0,
  surprise: 0.5,
  neutral: 0,
  sad: -0.7,
  fear: -0.6,
  angry: -1.0,
  disgust: -0.9,
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

// const calculateFinalScore = (emotionDetail = {}) => {
//   const sum = Object.values(emotionDetail).reduce((a, b) => a + b, 0);

//   if (!sum) return 0.5;

//   let raw = 0;
//   for (let key in emotionDetail) {
//     const normalized = emotionDetail[key] / sum;
//     raw += normalized * (weights[key] || 0);
//   }

//   return Math.max(0, Math.min(1, (raw + 1) / 2));
// };

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

const classifySentimentLevel = (score) => {
  if (score < 0.2) return "very_negative";
  if (score < 0.4) return "negative";
  if (score < 0.6) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
};

const detectHardRoleV2 = (text = "", aiRole = "unknown") => {
  const lower = (text || "").toLowerCase().trim();

  let staffScore = 0;
  let customerScore = 0;

  /* =========================
     STAFF RULES
  ========================= */
  const staffRules = [
    // chào hỏi / hỗ trợ
    { keyword: "xin chào", score: 2 },
    { keyword: "em hỗ trợ", score: 4 },
    { keyword: "bên em", score: 3 },
    { keyword: "cho em xin", score: 6 },
    { keyword: "cho anh xin", score: 6 },

    // xác minh thông tin
    { keyword: "số điện thoại", score: 6 },
    { keyword: "địa chỉ", score: 7 },
    { keyword: "họ tên", score: 6 },
    { keyword: "tên khách hàng", score: 7 },
    { keyword: "mã đơn", score: 7 },
    { keyword: "mã đơn hàng", score: 7 },
    { keyword: "đơn hàng", score: 3 },

    // xác minh địa chỉ
    { keyword: "tỉnh nào", score: 8 },
    { keyword: "quận huyện", score: 8 },
    { keyword: "huyện nào", score: 7 },
    { keyword: "xã nào", score: 7 },
    { keyword: "phường nào", score: 7 },
    { keyword: "xã", score: 4 },
    { keyword: "phường", score: 4 },

    // xử lý đơn
    { keyword: "em kiểm tra", score: 6 },
    { keyword: "kiểm tra giúp", score: 6 },
    { keyword: "xác nhận đơn", score: 7 },
    { keyword: "giao hàng", score: 5 },
    { keyword: "3 đến 4 ngày", score: 7 },
    { keyword: "nhận hàng", score: 4 },

    // bán hàng
    { keyword: "miễn phí", score: 3 },
    { keyword: "ưu đãi", score: 3 },
    { keyword: "khuyến mãi", score: 3 },

    // kiểu nói rất hay gặp ở staff
    { keyword: "đúng không anh", score: 5 },
    { keyword: "đúng không chị", score: 5 },
    { keyword: "đọc lại nha", score: 6 },
  ];

  /* =========================
     CUSTOMER RULES
  ========================= */
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

    // kiểu trả lời cung cấp thông tin
    { keyword: "lai châu", score: 3 },
    { keyword: "phong thổ", score: 3 },
    { keyword: "đúng rồi", score: 2 },
  ];

  /* =========================
     APPLY RULES
  ========================= */
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

  /* =========================
     SHORT RESPONSE
     câu ngắn như dạ/vâng/rồi
  ========================= */
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

  if (
    lower.length < 25 &&
    shortReplies.some((item) => lower.includes(item)) &&
    staffScore === 0 &&
    customerScore === 0
  ) {
    // nếu AI đã xác định đúng thì dùng luôn
    if (aiRole === "staff" || aiRole === "customer") {
      return aiRole;
    }

    // fallback cứng: mặc định customer
    return "customer";
  }

  /* =========================
     DECISION LOGIC
  ========================= */

  // chỉ cần hơn 1 điểm là đủ
  if (staffScore > customerScore) {
    return "staff";
  }

  if (customerScore > staffScore) {
    return "customer";
  }

  /* =========================
     AI FALLBACK
  ========================= */
  if (aiRole === "staff" || aiRole === "customer") {
    return aiRole;
  }

  /* =========================
     HARD FALLBACK
     tuyệt đối không unknown nữa
  ========================= */

  // nếu text có nhiều câu hỏi xác minh => staff
  const questionHints = [
    "địa chỉ",
    "tỉnh nào",
    "quận huyện",
    "xã nào",
    "phường nào",
    "đúng không",
    "cho em xin",
  ];

  const likelyStaff = questionHints.some((item) => lower.includes(item));

  if (likelyStaff) {
    return "staff";
  }

  // cuối cùng mặc định customer
  return "customer";
};

export {
  calculateFinalScore,
  classifySentimentLevel,
  detectHardRoleV2,
  normalizeEmotionObject,
};
