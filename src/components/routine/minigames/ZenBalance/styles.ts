import { StyleSheet } from 'react-native';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statsRowHome: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionsContainerHome: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  instructions: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  flowArea: {
    flex: 1,
    borderRadius: 12,
    marginBottom: 10,
    minHeight: SCREEN_HEIGHT * 0.5,
    position: 'relative',
    overflow: 'hidden',
  },
  pathContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pathSegment: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  pathSegmentGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  orb: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  orbGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.4,
  },
  orbInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  serenityIndicator: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  serenityText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  serenityBar: {
    width: 120,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  serenityFill: {
    height: '100%',
    borderRadius: 3,
  },
  debugText: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 4,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipTextHome: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 25,
  },

  introMessageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  introMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    paddingHorizontal: 40,
    lineHeight: 26,
    fontStyle: 'italic',
  },

  rippleEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  fogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
  },
  
  completionSymbolContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionSymbol: {
    fontSize: 60,
  },

  instructionsScreen: {
    flex: 1,
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  skipFromInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  instructionsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    fontStyle: 'italic',
  },
  instructionsDetails: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  calibrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  calibrationContent: {
    alignItems: 'center',
  },
  calibrationTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  calibrationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  calibrationSubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  calibrationProgress: {
    width: 120,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  calibrationProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  calibrationProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  completionScore: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },
  completionBalance: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  completionZen: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  balanceCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  balanceCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertContainer: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
}); 