/**
 * Fingerprinter.js Usage Examples
 * Demonstrates various use cases and implementations
 */

import Fingerprint from "../src/index";

// Example 1: Basic Fraud Detection
async function fraudDetection(transactionData: any) {
  console.log("💳 Fraud Detection System");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      transactionId: transactionData.id,
      amount: transactionData.amount,
      currency: transactionData.currency,
    },
  });

  console.log(
    `Transaction: ${transactionData.amount} ${transactionData.currency}`
  );
  console.log(`Fingerprint confidence: ${result.confidence}%`);
  console.log(`Suspect score: ${result.suspectAnalysis?.score}/100`);
  console.log(`Risk level: ${result.suspectAnalysis?.riskLevel}`);

  // Calculate transaction risk
  const riskScore = calculateTransactionRisk(result, transactionData);

  if (riskScore > 80) {
    return {
      decision: "BLOCK",
      reason: "High-risk transaction detected",
      actions: [
        "Block transaction",
        "Alert fraud team",
        "Require manual review",
      ],
    };
  } else if (riskScore > 50) {
    return {
      decision: "REVIEW",
      reason: "Suspicious transaction patterns",
      actions: ["Manual verification required", "Additional authentication"],
    };
  } else {
    return {
      decision: "APPROVE",
      reason: "Transaction appears legitimate",
      actions: ["Process normally"],
    };
  }
}

function calculateTransactionRisk(
  fingerprintResult: any,
  transaction: any
): number {
  let risk = fingerprintResult.suspectAnalysis?.score || 0;

  // Transaction-specific risk factors
  if (transaction.amount > 1000) risk += 10;
  if (transaction.isInternational) risk += 15;
  if (transaction.isFirstTime) risk += 20;
  if (transaction.timeOfDay < 6 || transaction.timeOfDay > 22) risk += 5;

  return Math.min(100, risk);
}

// Example 2: Bot Protection
async function botProtection() {
  console.log("🤖 Bot Protection System");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
  });

  // Check for automation signals
  const automationSignals =
    result.suspectAnalysis?.signals.filter((s) =>
      ["webdriver", "headless", "selenium", "phantom"].includes(s.type)
    ) || [];

  console.log(`Automation signals detected: ${automationSignals.length}`);
  console.log(`Overall suspect score: ${result.suspectAnalysis?.score}/100`);

  if (automationSignals.length > 0) {
    return {
      isBot: true,
      confidence: 95,
      detectedTools: automationSignals.map((s) => s.type),
      action: "BLOCK",
      reason: "Automation tools detected",
    };
  } else if (result.suspectAnalysis!.score > 70) {
    return {
      isBot: "LIKELY",
      confidence: 80,
      action: "CHALLENGE",
      reason: "High suspect score",
    };
  } else if (result.suspectAnalysis!.score > 30) {
    return {
      isBot: "POSSIBLE",
      confidence: 60,
      action: "MONITOR",
      reason: "Moderate suspect score",
    };
  } else {
    return {
      isBot: false,
      confidence: 95,
      action: "ALLOW",
      reason: "Appears to be human user",
    };
  }
}

// Example 3: Quality Analytics
async function qualityAnalytics(pageViewData: any) {
  console.log("📊 Quality Analytics System");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      page: pageViewData.url,
      referrer: pageViewData.referrer,
      userAgent: navigator.userAgent,
    },
  });

  // Filter out low-quality data
  const shouldTrack =
    result.suspectAnalysis!.score < 50 && result.confidence > 60;

  if (shouldTrack) {
    return {
      track: true,
      visitorType: "HUMAN",
      dataQuality: getDataQuality(
        result.confidence,
        result.suspectAnalysis!.score
      ),
      fingerprint: result.fingerprint,
      metadata: {
        confidence: result.confidence,
        suspectScore: result.suspectAnalysis!.score,
        components: Object.keys(result.components).length,
      },
    };
  } else {
    return {
      track: false,
      visitorType: result.suspectAnalysis!.score > 70 ? "BOT" : "UNCERTAIN",
      dataQuality: "LOW",
      reason: `High suspect score (${
        result.suspectAnalysis!.score
      }) or low confidence (${result.confidence})`,
    };
  }
}

function getDataQuality(confidence: number, suspectScore: number): string {
  if (confidence > 80 && suspectScore < 20) return "EXCELLENT";
  if (confidence > 70 && suspectScore < 30) return "GOOD";
  if (confidence > 60 && suspectScore < 40) return "FAIR";
  return "POOR";
}

// Example 4: Adaptive Authentication
async function adaptiveAuthentication(username: string, loginAttempt: any) {
  console.log("🔐 Adaptive Authentication System");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      username: username,
      loginTime: new Date().getHours(), // Will be filtered for stability
      ipRegion: loginAttempt.ipRegion,
    },
  });

  console.log(`User: ${username}`);
  console.log(`Fingerprint confidence: ${result.confidence}%`);
  console.log(`Suspect score: ${result.suspectAnalysis?.score}/100`);
  console.log(`Risk level: ${result.suspectAnalysis?.riskLevel}`);

  // Determine authentication requirements
  const riskLevel = calculateAuthRisk(result, loginAttempt);

  if (riskLevel === "HIGH") {
    return {
      allow: false,
      reason: "High-risk login attempt",
      requirements: ["CAPTCHA", "Email verification", "Manual review"],
      message: "Additional verification required",
    };
  } else if (riskLevel === "MEDIUM") {
    return {
      allow: true,
      reason: "Moderate risk detected",
      requirements: ["2FA", "SMS verification"],
      message: "Please complete two-factor authentication",
    };
  } else {
    return {
      allow: true,
      reason: "Low risk login",
      requirements: [],
      message: "Login successful",
    };
  }
}

function calculateAuthRisk(
  result: any,
  loginAttempt: any
): "LOW" | "MEDIUM" | "HIGH" {
  let riskFactors = 0;

  if (result.suspectAnalysis?.score > 70) riskFactors += 3;
  else if (result.suspectAnalysis?.score > 40) riskFactors += 1;

  if (result.confidence < 50) riskFactors += 2;
  else if (result.confidence < 70) riskFactors += 1;

  if (loginAttempt.unusualLocation) riskFactors += 2;
  if (loginAttempt.newDevice) riskFactors += 1;
  if (loginAttempt.offHours) riskFactors += 1;

  if (riskFactors >= 5) return "HIGH";
  if (riskFactors >= 2) return "MEDIUM";
  return "LOW";
}

// Example 5: Personalization Engine
async function personalizationEngine(userId: string) {
  console.log("🎯 Personalization Engine");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      userId: userId,
      preferences: "personalized-content",
    },
  });

  // Determine personalization level based on trust
  const trustScore = calculateTrustScore(result);

  if (trustScore > 80) {
    return {
      personalizationLevel: "ADVANCED",
      features: [
        "AI-powered recommendations",
        "Adaptive interface",
        "Predictive content",
        "Custom workflows",
      ],
      cacheFingerprint: true,
      trustScore: trustScore,
    };
  } else if (trustScore > 60) {
    return {
      personalizationLevel: "STANDARD",
      features: [
        "Basic recommendations",
        "Theme preferences",
        "Language settings",
      ],
      cacheFingerprint: true,
      trustScore: trustScore,
    };
  } else {
    return {
      personalizationLevel: "MINIMAL",
      features: ["Default experience", "Basic settings only"],
      cacheFingerprint: false,
      trustScore: trustScore,
      reason: "Low trust score - limited personalization",
    };
  }
}

function calculateTrustScore(result: any): number {
  let trust = 100;

  // Reduce trust based on suspect score
  trust -= result.suspectAnalysis?.score || 0;

  // Adjust based on confidence
  if (result.confidence < 70) trust -= 20;
  else if (result.confidence < 50) trust -= 40;

  // Boost trust for high confidence
  if (result.confidence > 90) trust += 10;

  return Math.max(0, Math.min(100, trust));
}

// Example 6: Rate Limiting
async function intelligentRateLimit(apiKey: string, endpoint: string) {
  console.log("🚦 Intelligent Rate Limiting");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      apiKey: apiKey,
      endpoint: endpoint,
    },
  });

  // Calculate rate limit based on trust level
  const baseLimit = 100; // requests per hour
  let multiplier = 1;

  if (result.suspectAnalysis!.score > 70) {
    multiplier = 0.1; // Very restrictive
  } else if (result.suspectAnalysis!.score > 40) {
    multiplier = 0.5; // Moderately restrictive
  } else if (result.suspectAnalysis!.score < 20 && result.confidence > 80) {
    multiplier = 2; // More generous
  }

  const rateLimit = Math.floor(baseLimit * multiplier);

  return {
    rateLimit: rateLimit,
    suspectScore: result.suspectAnalysis!.score,
    confidence: result.confidence,
    fingerprint: result.fingerprint,
    recommendations: getRateLimitRecommendations(result.suspectAnalysis!.score),
  };
}

function getRateLimitRecommendations(suspectScore: number): string[] {
  if (suspectScore > 70) {
    return [
      "Consider blocking this client",
      "Implement CAPTCHA verification",
      "Monitor for abuse patterns",
    ];
  } else if (suspectScore > 40) {
    return [
      "Apply stricter rate limits",
      "Monitor API usage patterns",
      "Consider additional authentication",
    ];
  } else {
    return [
      "Normal rate limiting",
      "Monitor for sudden spikes",
      "Consider premium rate limits for trusted users",
    ];
  }
}

// Demo runner
async function runExamples() {
  console.log("🚀 Running Fingerprinter.js Examples\n");

  // Fraud detection example
  const fraudResult = await fraudDetection({
    id: "txn_12345",
    amount: 2500,
    currency: "USD",
    isInternational: true,
    isFirstTime: false,
    timeOfDay: 14,
  });
  console.log("Fraud Detection Result:", fraudResult);
  console.log("");

  // Bot protection example
  const botResult = await botProtection();
  console.log("Bot Protection Result:", botResult);
  console.log("");

  // Analytics example
  const analyticsResult = await qualityAnalytics({
    url: "/product/laptop-pro",
    referrer: "https://google.com",
  });
  console.log("Analytics Result:", analyticsResult);
  console.log("");

  // Authentication example
  const authResult = await adaptiveAuthentication("john.doe", {
    ipRegion: "US-CA",
    unusualLocation: false,
    newDevice: true,
    offHours: false,
  });
  console.log("Authentication Result:", authResult);
  console.log("");

  // Personalization example
  const personalizationResult = await personalizationEngine("user_789");
  console.log("Personalization Result:", personalizationResult);
  console.log("");

  // Rate limiting example
  const rateLimitResult = await intelligentRateLimit(
    "api_key_123",
    "/api/data"
  );
  console.log("Rate Limit Result:", rateLimitResult);
}

// Export for use
export {
  adaptiveAuthentication,
  botProtection,
  fraudDetection,
  intelligentRateLimit,
  personalizationEngine,
  qualityAnalytics,
  runExamples,
};

// Run examples if executed directly
if (typeof window !== "undefined") {
  // Browser environment
  (window as any).runExamples = runExamples;
} else if (require.main === module) {
  // Node.js environment
  runExamples().catch(console.error);
}
