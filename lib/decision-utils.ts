// Utility function for processing decision text consistently across all APIs
// This ensures case-insensitive matching and proper handling of diacritics

export function normalizeDecisionText(text: string): string {
    if (!text || typeof text !== 'string') {
        return ''
    }

    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (é→e, à→a, etc.)
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
}

export function isStudentAdmittedFromDecision(decisionText: string): boolean {
    if (!decisionText || typeof decisionText !== 'string') {
        return false
    }

    const decision = normalizeDecisionText(decisionText)

    // Logic rules for determining admission status from Decision column:

    // 1. Explicitly admitted (various forms)
    if (decision.includes("admis") ||           // "Admis", "Admise", "ADMIS", "Admís"
        decision.includes("reussi") ||          // "Réussi", "Réussie", "REUSSI", "reussí"
        decision.includes("reussie") ||         // Alternative spelling
        decision.includes("success") ||         // English equivalent
        decision === "r" ||                     // Short form for "Réussi"
        decision === "a" ||                     // Short form for "Admis"
        decision.includes("pass") ||            // "Passé", "Passed", "PASSE", "passé"
        decision.includes("valide")) {          // "Validé", "VALIDE", "validé"
        return true
    }

    // 2. Session candidates (considered as not admitted for main admission)
    if (decision.includes("sessionnaire") ||
        decision.includes("sessionn") ||        // Shortened form
        decision.includes("session") ||
        decision.includes("rattrapage")) {      // Makeup/retake session
        return false
    }

    // 3. Explicitly failed
    if (decision.includes("echec") ||           // "Échec", "ECHEC", "échec"
        decision.includes("echoue") ||          // "Échoué", "ECHOUE", "échoué"
        decision.includes("refuse") ||          // "Refusé", "REFUSE", "refusé"
        decision.includes("elimine") ||         // "Éliminé", "ELIMINE", "éliminé"
        decision.includes("ajourne") ||         // "Ajourné", "AJOURNE", "ajourné"
        decision.includes("fail") ||            // English equivalent
        decision.includes("reject")) {          // English equivalent
        return false
    }

    // 4. Default: if decision text doesn't match any pattern, consider as not admitted
    // This ensures conservative approach for unclear cases
    return false
}

// Test cases for validation
export const DECISION_TEST_CASES = {
    admitted: [
        "Admis", "ADMIS", "admis", "Admís", "admís",
        "Réussi", "REUSSI", "reussi", "Reussí", "reussí",
        "Réussie", "REUSSIE", "reussie",
        "Success", "SUCCESS", "success",
        "R", "r", "A", "a",
        "Passé", "PASSE", "passe", "Passed", "PASSED",
        "Validé", "VALIDE", "valide", "Validated"
    ],
    sessionnaire: [
        "Sessionnaire", "SESSIONNAIRE", "sessionnaire",
        "Sessionn", "SESSIONN", "sessionn",
        "Session", "SESSION", "session",
        "Rattrapage", "RATTRAPAGE", "rattrapage"
    ],
    failed: [
        "Échec", "ECHEC", "echec", "Echéc",
        "Échoué", "ECHOUE", "echoue", "Échoue",
        "Refusé", "REFUSE", "refuse", "Refusé",
        "Éliminé", "ELIMINE", "elimine", "Eliminé",
        "Ajourné", "AJOURNE", "ajourne", "Ajourné",
        "Failed", "FAILED", "failed",
        "Rejected", "REJECTED", "rejected"
    ],
    unknown: [
        "", " ", "Unknown", "Pending", "En cours", "???", "N/A"
    ]
}
