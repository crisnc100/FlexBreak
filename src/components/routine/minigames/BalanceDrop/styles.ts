import { StyleSheet, Dimensions } from 'react-native';
import { SCALE_WIDTH, SCALE_HEIGHT } from './constants';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Menu styles
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  instructionCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  strategyHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  gameFeatures: {
    marginBottom: 20,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
  },
  weightDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  sideInfo: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  sideCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  sideLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  sideText: {
    fontSize: 12,
    marginTop: 2,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60, // Increased for better spacing
    paddingBottom: 10,
  },
  centerHeader: {
    alignItems: 'center',
  },
  roundText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
  },
  balanceIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  exitButton: {
    padding: 8,
  },
  skipTutorialText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Energy bar
  energyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  energyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 10,
  },
  energyBarBg: {
    flex: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  energyBar: {
    height: '100%',
    borderRadius: 12,
  },
  energyFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF0000',
    borderRadius: 12,
  },
  energyTextContainer: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  energyText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  energyWarning: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Let go counter
  letGoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  letGoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  letGoCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Combo display
  comboDisplay: {
    position: 'absolute',
    top: 140,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  comboText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Tutorial styles
  tutorialBanner: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  tutorialHintText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Game area styles
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  
  // Preview queue
  previewQueue: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 100,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  previewItem: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginBottom: 8,
  },
  weightIndicator: {
    flexDirection: 'row',
    marginTop: 2,
  },
  weightDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 1,
  },
  
  // Item styles
  item: {
    position: 'absolute',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
  },
  itemLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  itemDescription: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
    textAlign: 'center',
    paddingHorizontal: 4,
    opacity: 0.9,
  },
  itemWeightDots: {
    flexDirection: 'row',
    marginTop: 2,
  },
  itemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
    marginHorizontal: 1,
  },
  urgencyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgencyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  dualBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#8B4513',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dualText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  criticalBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#FF0000',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  noHoursBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Scale styles
  scaleContainer: {
    position: 'absolute',
    bottom: 120, // Lowered for better visual balance
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  scale: {
    width: SCALE_WIDTH,
    height: SCALE_HEIGHT,
    borderRadius: 20,
    borderWidth: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  scaleSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workSide: {
    backgroundColor: '#FF6B6B15',
  },
  wellnessSide: {
    backgroundColor: '#4CAF5015',
  },
  scaleDivider: {
    width: 3,
    backgroundColor: '#666',
  },
  scaleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
    letterSpacing: 1,
  },
  fulcrum: {
    position: 'absolute',
    bottom: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  
  // Completion styles
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  statsCard: {
    padding: 20,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Game over styles
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  gameOverText: {
    fontSize: 18,
    marginBottom: 8,
  },
  gameOverSubtext: {
    fontSize: 14,
    marginBottom: 20,
  },
  finalScoreText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  tipText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  
  // Discard zone styles
  discardZone: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
    backgroundColor: 'rgba(147, 112, 219, 0.15)', // Soft purple/violet
    borderColor: 'rgba(147, 112, 219, 0.5)',
  },
  discardZoneLeft: {
    left: 10,
    top: '40%',
  },
  discardZoneRight: {
    right: 10,
    top: '40%',
  },
  discardZoneActive: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  discardText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  
  // Drop zone highlight
  dropZoneHighlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  
  // Tutorial overlay
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  tutorialInstruction: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: width * 0.8,
  },
  tutorialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tutorialArrow: {
    position: 'absolute',
    width: 40,
    height: 40,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pauseButtonIcon: {
    position: 'absolute',
    top: 60,
    right: 60,
    padding: 8,
    zIndex: 1000,
  },
  pauseMenu: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pauseTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  pauseButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Penalty feedback styles
  penaltyFeedback: {
    position: 'absolute',
    top: 200,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
  },
  penaltyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  penaltySubtext: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },

  // Status container styles
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  simpleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  simpleStatusValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },

  // How to play styles
  howToPlay: {
    marginBottom: 20,
    width: '100%',
    padding: 16,
    borderRadius: 12,
  },
  howToPlayTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  howToPlayText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Balance Container
  balanceContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  balanceBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  balanceSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  workSection: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  lifeSection: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  balanceCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  balanceWarning: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 5,
  },
  timerWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Life Stats with Bars
  lifeStatsGrid: {
    paddingTop: 10,
  },
  statItemWithBar: {
    marginBottom: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statMiniLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statBarBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    borderRadius: 4,
  },

  // Badge styles for items
  flexibleBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#8B4513',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flexibleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  restBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noEnergyBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -12,
    marginLeft: -12,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyCostBadge: {
    position: 'absolute',
    bottom: -8,
    right: '50%',
    marginRight: -20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  energyCostText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  neutralBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#9370DB',
    borderRadius: 8,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  neutralText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Life Stats
  lifeStatsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  lifeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Enhanced Score Showcase
  scoreShowcase: {
    padding: 24,
    borderRadius: 20,
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bigScore: {
    fontSize: 48,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
    marginBottom: 20,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  quickStat: {
    alignItems: 'center',
    gap: 6,
  },
  quickStatNumber: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Visual Life Stats with Circles
  lifeStatsVisual: {
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  lifeStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  lifeStatsCircles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  statCircle: {
    alignItems: 'center',
    width: 50,
  },
  statCircleProgress: {
    width: 40,
    borderRadius: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
    minHeight: 40,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statCircleValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Legacy styles (keeping for backward compatibility)
  lifeStatsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  lifeStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  lifeStat: {
    alignItems: 'center',
    marginBottom: 12,
    width: '30%',
  },
  lifeStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  lifeStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  
  // Round Complete - Decisions
  decisionsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
  },
  decisionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  decisionItem: {
    marginBottom: 8,
  },
  decisionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  decisionEffect: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  
  // Game Over Screen
  gameOverStory: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
    opacity: 0.9,
  },
  finalStatsContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 16,
    width: '100%',
  },
  finalStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  finalStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  finalStatValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});