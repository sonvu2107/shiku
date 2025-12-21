/**
 * useBattleAnimation Hook
 * Shared battle animation state and logic for PKTab and ArenaTab
 * 
 * Features:
 * - Battle phase management (intro, fighting, result)
 * - HP/Mana tracking per turn
 * - Animation states (dash, hit, dodge, effects)
 * - Auto-play battle logs with effects
 */
import { useState, useCallback, useEffect, useMemo } from 'react';

// Character Animation Variants - Dash & Recoil Physics
export const characterVariants = {
    idle: { x: 0, scale: 1, filter: "brightness(1)" },
    attackRight: { x: 60, scale: 1.1, transition: { duration: 0.1, ease: "easeIn" } },
    attackLeft: { x: -60, scale: 1.1, transition: { duration: 0.1, ease: "easeIn" } },
    hit: {
        x: [0, -10, 10, -5, 5, 0],
        filter: ["brightness(1)", "brightness(2)", "brightness(1)"],
        transition: { duration: 0.3 }
    },
    dodge: {
        opacity: [1, 0.5, 1],
        x: [0, -30, 0],
        transition: { duration: 0.4 }
    }
};

export function useBattleAnimation() {
    // Battle state
    const [battleResult, setBattleResult] = useState(null);
    const [showBattleAnimation, setShowBattleAnimation] = useState(false);
    const [battleLogs, setBattleLogs] = useState([]);
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const [battlePhase, setBattlePhase] = useState('intro'); // 'intro', 'fighting', 'result'

    // HP/Mana tracking
    const [challengerCurrentHp, setChallengerCurrentHp] = useState(0);
    const [opponentCurrentHp, setOpponentCurrentHp] = useState(0);
    const [challengerCurrentMana, setChallengerCurrentMana] = useState(0);
    const [opponentCurrentMana, setOpponentCurrentMana] = useState(0);

    // Animation states
    const [isShaking, setIsShaking] = useState(false);
    const [challengerAction, setChallengerAction] = useState('idle');
    const [opponentAction, setOpponentAction] = useState('idle');
    const [screenFlash, setScreenFlash] = useState(null);
    const [showSlash, setShowSlash] = useState(null);
    const [hitEffect, setHitEffect] = useState(null);
    const [showDamageNumber, setShowDamageNumber] = useState(null);
    const [showSkillName, setShowSkillName] = useState(null);
    const [particles, setParticles] = useState([]);

    // Check if mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    // Memoized background data (prevent re-render)
    const starsData = useMemo(() => Array.from({ length: isMobile ? 15 : 50 }, () => ({
        top: Math.random() * 60,
        left: Math.random() * 100,
        opacity: Math.random(),
        duration: 2 + Math.random() * 4,
        delay: Math.random() * 5
    })), [isMobile]);

    const rocksData = useMemo(() => Array.from({ length: isMobile ? 3 : 7 }, () => ({
        width: Math.random() * 50 + 30,
        height: Math.random() * 50 + 30,
        borderRadius: `${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% / ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}% ${Math.random() * 30 + 30}%`,
        top: Math.random() * 70,
        left: Math.random() * 100,
        blur: Math.random() * 2,
        yAnim: Math.random() * -30 - 20,
        rotateAnim: Math.random() * 20 - 10,
        duration: 8 + Math.random() * 10
    })), [isMobile]);

    const dustData = useMemo(() => Array.from({ length: isMobile ? 15 : 60 }, () => ({
        size: Math.random() * 3 + 1,
        left: Math.random() * 100,
        bottom: Math.random() * 20,
        blur: Math.random() * 2,
        duration: 3 + Math.random() * 5,
        delay: Math.random() * 3,
        xEnd: (Math.random() - 0.5) * 100
    })), [isMobile]);

    // Start battle with response data
    const startBattle = useCallback((data) => {
        setBattleResult(data);
        setBattleLogs(data.battleLogs || []);
        setCurrentLogIndex(0);
        // Initialize HP and Mana to max
        setChallengerCurrentHp(data.challenger?.stats?.qiBlood || 0);
        setOpponentCurrentHp(data.opponent?.stats?.qiBlood || 0);
        setChallengerCurrentMana(data.challenger?.stats?.zhenYuan || 0);
        setOpponentCurrentMana(data.opponent?.stats?.zhenYuan || 0);
        setBattlePhase('intro');
        setShowBattleAnimation(true);
        // Start battle after intro delay
        setTimeout(() => setBattlePhase('fighting'), 1500);
    }, []);

    // Skip to result
    const skipToResult = useCallback(() => {
        if (battleLogs.length > 0) {
            const lastLog = battleLogs[battleLogs.length - 1];
            setChallengerCurrentHp(lastLog.challengerHp || 0);
            setOpponentCurrentHp(lastLog.opponentHp || 0);
            if (lastLog.challengerMana !== undefined) setChallengerCurrentMana(lastLog.challengerMana);
            if (lastLog.opponentMana !== undefined) setOpponentCurrentMana(lastLog.opponentMana);
            setCurrentLogIndex(battleLogs.length);
        }
        // Reset animation states
        setShowDamageNumber(null);
        setChallengerAction('idle');
        setOpponentAction('idle');
        setScreenFlash(null);
        setShowSlash(null);
        setHitEffect(null);
        setShowSkillName(null);
        setParticles([]);
        setBattlePhase('result');
    }, [battleLogs]);

    // Close battle modal
    const closeBattle = useCallback(() => {
        setShowBattleAnimation(false);
        setBattleResult(null);
        setBattleLogs([]);
        setCurrentLogIndex(0);
        setChallengerCurrentHp(0);
        setOpponentCurrentHp(0);
        setChallengerCurrentMana(0);
        setOpponentCurrentMana(0);
        setBattlePhase('intro');
        setShowDamageNumber(null);
        setChallengerAction('idle');
        setOpponentAction('idle');
        setScreenFlash(null);
        setShowSlash(null);
        setHitEffect(null);
        setShowSkillName(null);
        setParticles([]);
    }, []);

    // Auto-play battle logs with effects
    useEffect(() => {
        if (battlePhase !== 'fighting' || !showBattleAnimation || battleLogs.length === 0) return;

        if (currentLogIndex < battleLogs.length) {
            const currentLog = battleLogs[currentLogIndex];
            const isAttackerChallenger = currentLog.attacker === 'challenger';
            const isCrit = currentLog.isCritical;
            const isSkill = currentLog.skillUsed;

            // PHASE 1: DASH (Lao lên tấn công)
            if (isAttackerChallenger) {
                setChallengerAction('attackRight');
            } else {
                setOpponentAction('attackLeft');
            }

            // PHASE 2: IMPACT
            const impactTimer = setTimeout(() => {
                setChallengerAction('idle');
                setOpponentAction('idle');

                if (currentLog.isDodged) {
                    if (isAttackerChallenger) {
                        setOpponentAction('dodge');
                    } else {
                        setChallengerAction('dodge');
                    }
                    setShowDamageNumber({
                        side: isAttackerChallenger ? 'right' : 'left',
                        damage: 0,
                        isDodged: true
                    });
                    setChallengerCurrentHp(currentLog.challengerHp);
                    setOpponentCurrentHp(currentLog.opponentHp);
                    if (currentLog.challengerMana !== undefined) setChallengerCurrentMana(currentLog.challengerMana);
                    if (currentLog.opponentMana !== undefined) setOpponentCurrentMana(currentLog.opponentMana);
                } else {
                    // Show skill name
                    if (isSkill && currentLog.skillUsed) {
                        setShowSkillName({
                            name: currentLog.skillUsed,
                            side: isAttackerChallenger ? 'left' : 'right'
                        });
                        setTimeout(() => setShowSkillName(null), 2000);
                    }

                    // Hit reaction
                    if (isAttackerChallenger) {
                        setOpponentAction('hit');
                    } else {
                        setChallengerAction('hit');
                    }

                    // Screen flash
                    if (isCrit) {
                        setScreenFlash('red');
                        setIsShaking(true);
                        setTimeout(() => setIsShaking(false), 600);
                    } else if (isSkill) {
                        setScreenFlash('dark');
                        setIsShaking(true);
                        setTimeout(() => setIsShaking(false), 400);
                    } else {
                        setScreenFlash('white');
                    }

                    // Slash effect
                    setShowSlash(isAttackerChallenger ? 'right' : 'left');

                    // Hit effect
                    setHitEffect({
                        side: isAttackerChallenger ? 'right' : 'left',
                        type: isCrit ? 'crit' : isSkill ? 'skill' : 'normal'
                    });

                    // Damage number
                    setShowDamageNumber({
                        side: isAttackerChallenger ? 'right' : 'left',
                        damage: currentLog.damage,
                        isCritical: isCrit,
                        isSkill: isSkill
                    });

                    // Particles
                    const particleCount = isCrit ? 30 : isSkill ? 20 : 12;
                    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
                        id: Date.now() + i,
                        x: isAttackerChallenger ? 75 : 25,
                        y: 40 + (Math.random() - 0.5) * 20,
                        color: isCrit ? '#fbbf24' : isSkill ? '#38bdf8' : '#ef4444',
                        type: isCrit ? 'crit' : isSkill ? 'skill' : 'normal',
                        size: isCrit ? 3 : isSkill ? 2 : 1.5,
                        vx: (Math.random() - 0.5) * 200,
                        vy: (Math.random() - 0.5) * 200
                    }));
                    setParticles(prev => [...prev, ...newParticles]);

                    // Update HP/Mana
                    setChallengerCurrentHp(currentLog.challengerHp);
                    setOpponentCurrentHp(currentLog.opponentHp);
                    if (currentLog.challengerMana !== undefined) setChallengerCurrentMana(currentLog.challengerMana);
                    if (currentLog.opponentMana !== undefined) setOpponentCurrentMana(currentLog.opponentMana);
                }
            }, 200);

            // PHASE 3: CLEANUP
            const cleanupTimer = setTimeout(() => {
                setShowSlash(null);
                setScreenFlash(null);
                setHitEffect(null);
                setShowDamageNumber(null);
                setParticles([]);
            }, 800);

            // PHASE 4: NEXT STEP
            const isFinished = currentLogIndex >= battleLogs.length - 1;
            const nextStepTimer = setTimeout(() => {
                if (!isFinished) {
                    setCurrentLogIndex(prev => prev + 1);
                }
            }, isFinished ? 1500 : 1200);

            return () => {
                clearTimeout(impactTimer);
                clearTimeout(cleanupTimer);
                clearTimeout(nextStepTimer);
            };
        } else {
            // All logs finished -> show result
            setTimeout(() => setBattlePhase('result'), 500);
        }
    }, [battlePhase, showBattleAnimation, battleLogs, currentLogIndex]);

    return {
        // State
        battleResult,
        showBattleAnimation,
        battleLogs,
        currentLogIndex,
        battlePhase,
        challengerCurrentHp,
        opponentCurrentHp,
        challengerCurrentMana,
        opponentCurrentMana,
        isShaking,
        challengerAction,
        opponentAction,
        screenFlash,
        showSlash,
        hitEffect,
        showDamageNumber,
        showSkillName,
        particles,
        isMobile,
        starsData,
        rocksData,
        dustData,
        // Actions
        startBattle,
        skipToResult,
        closeBattle,
        setBattlePhase
    };
}

export default useBattleAnimation;
