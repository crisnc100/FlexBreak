// Project release policy: generated projects and JS bundles do not prove native store readiness.
// Resolve through a reviewed native migration and record evidence here. There is
// deliberately no environment-variable override for these known blockers.
export const readiness = {
  ios: {
    status: 'blocked',
    reason: 'Expo 57 generated iOS project is validated, but a signed Xcode 26 / iOS 26 SDK archive, store purchase verification deployment, signing identity and physical-device regression evidence remain unresolved.',
    evidence: null,
  },
  android: {
    status: 'blocked',
    reason: 'Expo 57/OpenIAP generated Android project is validated, but a compiled API 36+ bundle with resolved billing dependency, store verification deployment and physical-device regression evidence remain unresolved.',
    evidence: null,
  },
};

export function assertNativeReady(platform, records = readiness) {
  const record = records[platform];
  if (record?.status !== 'ready' || typeof record.evidence !== 'string' || !record.evidence.trim()) {
    throw new Error(`Native release blocked (${platform}): ${record?.reason ?? 'missing readiness evidence'} See docs/CI_CD_SETUP_GUIDE.md.`);
  }
}

// These dependencies are required by the new client even in TestFlight/internal testing.
// Evidence must identify the tested environment, source/build and result in a reviewed report.
export const serviceReadiness = {
  anonymousAuth: {
    status: 'blocked', evidence: null,
    reason: 'Firebase anonymous authentication must be enabled and verified with persistent identity across restart against the intended project.',
  },
  authenticatedBackend: {
    status: 'blocked', evidence: null,
    reason: 'Deploy and verify the authenticated v2 endpoints in the intended environment, including identity enforcement, quotas, deletion, transcription and weather-v2 with its server-only OPENWEATHER_API_KEY.',
  },
  storeVerification: {
    status: 'blocked', evidence: null,
    reason: 'Configure server-side Apple/Google verification credentials and prove sandbox purchase, restore, expiry and cancellation against the intended backend.',
  },
  productionAccounts: {
    status: 'blocked', evidence: null,
    reason: 'Verify the Apple team, replace AdMob sample app IDs with account-verified production IDs, and verify the retained JavaScript Firebase project 28ad0 against the production account. Unused native Firebase configuration was removed with cloud push registration.',
  },
  privacyDisclosure: {
    status: 'blocked', evidence: null,
    reason: 'The linked public privacy policy incorrectly says conversations are never stored and data is never transmitted or shared. Publish an owner-reviewed disclosure matching the deployed app/backend and verify store privacy declarations. Record the published URL, date and reviewed release; see docs/PRIVACY_POLICY_DRAFT.md.',
  },
};

export function assertReleaseReady(platform, nativeRecords = readiness, serviceRecords = serviceReadiness) {
  for (const key of Object.keys(serviceReadiness)) {
    const record = serviceRecords[key];
    if (record?.status !== 'ready' || typeof record.evidence !== 'string' || !record.evidence.trim()) {
      throw new Error(`Service release blocked (${key}): ${record?.reason ?? 'missing reviewed integration evidence'} See docs/CI_CD_SETUP_GUIDE.md.`);
    }
  }
  assertNativeReady(platform, nativeRecords);
}
