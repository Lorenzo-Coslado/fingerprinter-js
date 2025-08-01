/**
 * Exemples d'utilisation du Suspect Score
 * Montre comment utiliser l'analyse de suspicion dans différents cas d'usage
 */

import Fingerprint from "../src/index";

// Exemple 1: Authentification sécurisée
async function secureAuthentication(username: string, password: string) {
  console.log("🔐 Authentification sécurisée");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
  });

  console.log(`Utilisateur: ${username}`);
  console.log(`Confiance: ${result.confidence}%`);
  console.log(`Score de suspicion: ${result.suspectAnalysis?.score}/100`);
  console.log(`Niveau de risque: ${result.suspectAnalysis?.riskLevel}`);

  // Logique d'authentification adaptative
  if (result.suspectAnalysis!.score > 70) {
    return {
      success: false,
      reason: "Environnement suspect détecté",
      requiresCaptcha: true,
      suspectSignals: result.suspectAnalysis!.signals.map((s) => s.type),
    };
  } else if (result.suspectAnalysis!.score > 30) {
    return {
      success: true,
      requires2FA: true,
      reason: "Authentification à deux facteurs requise",
    };
  } else {
    return {
      success: true,
      requires2FA: false,
      reason: "Connexion autorisée",
    };
  }
}

// Exemple 2: Détection de fraude e-commerce
async function fraudDetection(transaction: any) {
  console.log("💳 Détection de fraude e-commerce");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      transactionAmount: transaction.amount,
      currency: transaction.currency,
      merchantId: transaction.merchantId,
    },
  });

  const riskScore = calculateTransactionRisk(result, transaction);

  console.log(`Montant: ${transaction.amount} ${transaction.currency}`);
  console.log(`Score suspect: ${result.suspectAnalysis?.score}/100`);
  console.log(`Score de risque transaction: ${riskScore}/100`);

  if (riskScore > 80) {
    return {
      decision: "BLOCK",
      reason: "Transaction à haut risque",
      actions: ["Bloquer la transaction", "Alerter l'équipe fraude"],
    };
  } else if (riskScore > 50) {
    return {
      decision: "REVIEW",
      reason: "Transaction suspecte",
      actions: ["Vérification manuelle requise", "Authentification renforcée"],
    };
  } else {
    return {
      decision: "APPROVE",
      reason: "Transaction légitime",
      actions: ["Autoriser la transaction"],
    };
  }
}

function calculateTransactionRisk(
  fingerprintResult: any,
  transaction: any
): number {
  let risk = fingerprintResult.suspectAnalysis?.score || 0;

  // Facteurs de risque spécifiques à la transaction
  if (transaction.amount > 1000) risk += 10;
  if (transaction.isInternational) risk += 15;
  if (transaction.isFirstTime) risk += 20;

  return Math.min(100, risk);
}

// Exemple 3: Protection contre les bots
async function botProtection(request: any) {
  console.log("🤖 Protection contre les bots");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
  });

  const automationSignals =
    result.suspectAnalysis?.signals.filter((s) =>
      ["webdriver", "headless", "selenium", "phantom"].includes(s.type)
    ) || [];

  console.log(`Signaux d'automation: ${automationSignals.length}`);
  console.log(`Score suspect: ${result.suspectAnalysis?.score}/100`);

  if (automationSignals.length > 0) {
    return {
      isBot: true,
      confidence: 90,
      detectedTools: automationSignals.map((s) => s.type),
      action: "BLOCK",
    };
  } else if (result.suspectAnalysis!.score > 60) {
    return {
      isBot: "LIKELY",
      confidence: 70,
      action: "CAPTCHA",
    };
  } else {
    return {
      isBot: false,
      confidence: 95,
      action: "ALLOW",
    };
  }
}

// Exemple 4: Analytics avec filtrage qualité
async function qualityAnalytics(pageView: any) {
  console.log("📊 Analytics avec filtrage qualité");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      page: pageView.url,
      referrer: pageView.referrer,
      sessionId: pageView.sessionId,
    },
  });

  // Ne pas inclure les données suspectes dans les analytics
  if (result.suspectAnalysis!.score < 40) {
    return {
      shouldTrack: true,
      visitorType: "HUMAN",
      dataQuality: "HIGH",
      fingerprint: result.fingerprint,
    };
  } else if (result.suspectAnalysis!.score < 70) {
    return {
      shouldTrack: true,
      visitorType: "UNCERTAIN",
      dataQuality: "MEDIUM",
      fingerprint: result.fingerprint,
      flags: result.suspectAnalysis!.signals.map((s) => s.type),
    };
  } else {
    return {
      shouldTrack: false,
      visitorType: "BOT",
      dataQuality: "LOW",
      reason: "Score de suspicion trop élevé",
    };
  }
}

// Exemple 5: Personnalisation adaptative
async function adaptivePersonalization(userId: string) {
  console.log("🎯 Personnalisation adaptative");

  const result = await Fingerprint.generate({
    includeSuspectAnalysis: true,
    customData: {
      userId: userId,
      preferences: "dark-theme",
    },
  });

  // Adapter le niveau de personnalisation selon la confiance
  if (result.confidence > 80 && result.suspectAnalysis!.score < 30) {
    return {
      personalizationLevel: "ADVANCED",
      features: [
        "Recommandations IA",
        "Interface adaptée",
        "Contenu personnalisé",
      ],
      cacheFingerprint: true,
    };
  } else if (result.confidence > 60 && result.suspectAnalysis!.score < 60) {
    return {
      personalizationLevel: "BASIC",
      features: ["Thème préféré", "Langue"],
      cacheFingerprint: false,
    };
  } else {
    return {
      personalizationLevel: "NONE",
      features: ["Expérience par défaut"],
      cacheFingerprint: false,
      reason: "Environnement non fiable",
    };
  }
}

// Démonstration d'utilisation
async function demonstrateUsage() {
  console.log("🚀 Démonstration du Suspect Score\n");

  // Test authentification
  const authResult = await secureAuthentication("user123", "password");
  console.log("Résultat authentification:", authResult);
  console.log("");

  // Test détection fraude
  const fraudResult = await fraudDetection({
    amount: 2500,
    currency: "EUR",
    merchantId: "merchant_123",
    isInternational: true,
    isFirstTime: false,
  });
  console.log("Résultat détection fraude:", fraudResult);
  console.log("");

  // Test protection bots
  const botResult = await botProtection({ ip: "192.168.1.1" });
  console.log("Résultat protection bot:", botResult);
  console.log("");

  // Test analytics
  const analyticsResult = await qualityAnalytics({
    url: "/product/123",
    referrer: "https://google.com",
    sessionId: "sess_456",
  });
  console.log("Résultat analytics:", analyticsResult);
  console.log("");

  // Test personnalisation
  const personalizationResult = await adaptivePersonalization("user_789");
  console.log("Résultat personnalisation:", personalizationResult);
}

// Exporter pour utilisation
export {
  adaptivePersonalization,
  botProtection,
  demonstrateUsage,
  fraudDetection,
  qualityAnalytics,
  secureAuthentication,
};

// Si exécuté directement
if (require.main === module) {
  demonstrateUsage().catch(console.error);
}
