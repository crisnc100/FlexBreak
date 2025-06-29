// Native language prompts for multilingual wellness coaching
export const WELLNESS_COACH_PROMPT = {
  en: `You are FlexBreak's AI wellness coach. {context}

Give ONE practical tip (1-2 sentences). Be direct and actionable.

For exercises: Use format "Try this: [action]"
For advice: Start with verb (Stand up, Take 5 breaths, etc.)

Always use the user's name if provided.`,
  
  es: `Eres el entrenador de bienestar AI de FlexBreak. {context}

Da UN consejo práctico (1-2 frases). Sé directo y accionable.

Para ejercicios: Usa "Prueba esto: [acción]"
Para consejos: Empieza con verbo (Levántate, Respira 5 veces, etc.)

Siempre usa el nombre del usuario si está disponible.`,
  
  zh: `你是FlexBreak的AI健康教练。{context}

给一个实用建议（1-2句话）。直接且可操作。

运动建议：用"试试这个：[动作]"
其他建议：以动词开头（站起来、深呼吸5次等）

如果提供了用户名，总是使用它。`
};

export const CONTEXT_TEMPLATE = {
  timeOfDay: {
    morning: 'User is starting their day',
    afternoon: 'User is in the middle of their workday',
    evening: 'User is winding down'
  },
  patterns: {
    recurring: 'This issue happens frequently at this time',
    new: 'This is a new concern',
    improving: 'This has been getting better'
  }
};

export const WELLNESS_PATTERNS = {
  // Physical issues
  back_pain: ['back', 'spine', 'lower back', 'upper back'],
  neck_pain: ['neck', 'shoulders', 'trapezius'],
  eye_strain: ['eyes', 'screen', 'blurry', 'headache'],
  fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
  
  // Mental/Work issues
  stress: ['stressed', 'anxious', 'overwhelmed', 'pressure'],
  focus: ['focus', 'concentrate', 'distracted', 'attention'],
  motivation: ['unmotivated', 'lazy', 'procrastinating', 'bored'],
  
  // Positive
  good: ['good', 'great', 'fine', 'okay', 'well']
};

export const QUICK_ACTIONS = {
  back_pain: {
    title: "Quick Back Relief",
    options: [
      { id: 'cat_cow', label: 'Cat-Cow Stretch', duration: '1 min' },
      { id: 'twist', label: 'Seated Twist', duration: '30 sec' },
      { id: 'walk', label: 'Quick Walk', duration: '2 min' }
    ]
  },
  stress: {
    title: "Stress Relief",
    options: [
      { id: 'breathe', label: 'Deep Breathing', duration: '1 min' },
      { id: 'shoulders', label: 'Shoulder Rolls', duration: '30 sec' },
      { id: 'mindful', label: 'Mindful Moment', duration: '2 min' }
    ]
  }
};

export const FALLBACK_RESPONSES = {
  en: {
    back_pain: "Try this: Stand up, hands on lower back, arch gently 3 times. Add cat-cow stretches for relief.",
    stress: "Take 5 deep belly breaths right now. Roll your shoulders back 10 times. You've got this!",
    fatigue: "Stand up and do 10 arm circles. Take 5 deep breaths and grab some water.",
    focus: "Try 20-20-20: Look 20 feet away for 20 seconds. Then do gentle neck rolls.",
    positive: "Great to hear! Do a quick stretch to keep that energy flowing.",
    general: "Stand up and stretch for 30 seconds. Your body will thank you!"
  },
  es: {
    back_pain: "El dolor de espalda es común al estar sentado. Prueba: Levántate, manos en espalda baja, arquea suavemente 3x. Estiramiento gato-vaca por 30 segundos.",
    stress: "Alivio rápido del estrés: Toma 5 respiraciones profundas. Gira los hombros hacia atrás 10x. Mira lejos de la pantalla por 20 segundos.",
    fatigue: "¿Cansado? Recarga energía: Levántate, haz 10 círculos con los brazos, respira profundo 5 veces, y si es posible, toma aire fresco o agua.",
    focus: "¿Necesitas enfocarte? Prueba la regla 20-20-20: Mira algo a 20 pies por 20 segundos. Luego haz 20 giros suaves de cuello.",
    positive: "¡Qué bueno escuchar eso! Mantén el impulso con un estiramiento rápido para mantener esa buena sensación.",
    general: "¡Gracias por comunicarte! Recuerda, pequeños descansos de movimiento durante el día hacen gran diferencia. Prueba un estiramiento rápido."
  },
  zh: {
    back_pain: "久坐导致背痛很常见。试试：站起来，双手放在下背部，轻轻后弯3次。做猫牛式伸展30秒。设置每小时活动提醒！",
    stress: "快速缓解压力：深呼吸5次。向后转肩10次。目光离开屏幕20秒。你可以的！",
    fatigue: "感觉疲劳？快速补充能量：站起来，手臂画圈10次，深呼吸5次，如果可能的话，呼吸新鲜空气或喝水。",
    focus: "需要重新集中注意力？试试20-20-20法则：看20英尺外的东西20秒。然后轻轻转动脖子20次。",
    positive: "听到这个真好！做个快速伸展来保持这种良好的感觉。",
    general: "脚步运动很棒！1. 踵脚活动：脚趾前后上下活动10次 2. 脚踝转圈：左右各转10圈 3. 单脚站立：每脚30秒锻炼平衡。记得定时站起来活动！"
  }
};