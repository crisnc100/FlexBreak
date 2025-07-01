import { ConversationMessage } from './conversationManager';
import { UserContext } from '../contextBuilder';

// Merged from promptTemplates.ts
// Native language prompts for multilingual wellness coaching
const WELLNESS_COACH_PROMPT = {
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

const CONTEXT_TEMPLATE = {
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

const WELLNESS_PATTERNS = {
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

const QUICK_ACTIONS = {
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

const FALLBACK_RESPONSES = {
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

export interface EnhancedPromptContext {
  userInput: string;
  userContext: UserContext;
  conversationHistory: ConversationMessage[];
  failedSuggestions: string[];
  successfulSuggestions: string[];
  isFollowUp: boolean;
  currentSentiment?: 'positive' | 'negative' | 'neutral';
  memoryContext?: string;
}

export class PromptManager {
  buildEnhancedPrompt(context: EnhancedPromptContext): string {
    const language = context.userContext.detectedLanguage || 'en';
    const basePrompt = WELLNESS_COACH_PROMPT[language];
    
    // Build contextual information
    const contextParts: string[] = [];
    
    // Add user name if available
    if (context.userContext.userName) {
      contextParts.push(`User's name: ${context.userContext.userName}`);
    }
    
    // Add conversation history if this is a follow-up
    if (context.isFollowUp && context.conversationHistory.length > 0) {
      const recentExchange = this.formatRecentExchange(context.conversationHistory, language);
      contextParts.push(`CONVERSATION CONTEXT:\n${recentExchange}`);
    }
    
    // Add sentiment-based context
    if (context.currentSentiment === 'negative' && context.failedSuggestions.length > 0) {
      const failedList = context.failedSuggestions.slice(-3).join(', ');
      contextParts.push(this.getFailedSuggestionContext(failedList, language));
    }
    
    // Add successful solutions if available
    if (context.successfulSuggestions.length > 0) {
      const successList = context.successfulSuggestions.slice(-3).join(', ');
      contextParts.push(this.getSuccessfulSuggestionContext(successList, language));
    }
    
    // Add time-based context
    contextParts.push(this.getTimeContext(context.userContext.timeOfDay, language));
    
    // Add memory context if available
    if (context.memoryContext) {
      contextParts.push(context.memoryContext);
    }
    
    // Add specific instructions for follow-up scenarios
    if (context.isFollowUp && context.currentSentiment === 'negative') {
      contextParts.push(this.getNegativeFeedbackInstructions(language));
    }
    
    // Build the complete context string
    const fullContext = contextParts.join('\n');
    
    // Replace the context placeholder in the base prompt
    return basePrompt.replace('{context}', fullContext);
  }
  
  private formatRecentExchange(messages: ConversationMessage[], language: string): string {
    const recent = messages.slice(-4); // Last 2 exchanges
    const formatted = recent.map(msg => {
      const role = msg.role === 'user' ? this.getUserLabel(language) : this.getAssistantLabel(language);
      return `${role}: ${msg.content}`;
    }).join('\n');
    
    return formatted;
  }
  
  private getUserLabel(language: string): string {
    return {
      en: 'User',
      es: 'Usuario',
      zh: '用户'
    }[language] || 'User';
  }
  
  private getAssistantLabel(language: string): string {
    return {
      en: 'Coach',
      es: 'Entrenador',
      zh: '教练'
    }[language] || 'Coach';
  }
  
  private getFailedSuggestionContext(failed: string, language: string): string {
    const templates = {
      en: `Previous suggestions that didn't help: ${failed}. Avoid these approaches.`,
      es: `Sugerencias anteriores que no ayudaron: ${failed}. Evita estos enfoques.`,
      zh: `之前没有帮助的建议：${failed}。避免这些方法。`
    };
    
    return templates[language] || templates.en;
  }
  
  private getSuccessfulSuggestionContext(successful: string, language: string): string {
    const templates = {
      en: `What has worked before: ${successful}. Consider similar approaches.`,
      es: `Lo que ha funcionado antes: ${successful}. Considera enfoques similares.`,
      zh: `之前有效的方法：${successful}。考虑类似的方法。`
    };
    
    return templates[language] || templates.en;
  }
  
  private getTimeContext(timeOfDay: string, language: string): string {
    const templates = {
      en: {
        morning: 'It\'s morning - user may be starting their day',
        afternoon: 'It\'s afternoon - user may be in mid-workday',
        evening: 'It\'s evening - user may be winding down'
      },
      es: {
        morning: 'Es la mañana - el usuario puede estar comenzando su día',
        afternoon: 'Es la tarde - el usuario puede estar en medio de su jornada',
        evening: 'Es la noche - el usuario puede estar relajándose'
      },
      zh: {
        morning: '现在是早上 - 用户可能正在开始新的一天',
        afternoon: '现在是下午 - 用户可能在工作中',
        evening: '现在是晚上 - 用户可能在放松'
      }
    };
    
    return templates[language]?.[timeOfDay] || templates.en[timeOfDay];
  }
  
  private getNegativeFeedbackInstructions(language: string): string {
    const instructions = {
      en: `IMPORTANT: The user indicated the previous suggestion didn't help. Acknowledge this and offer a completely different approach. Show understanding and adapt.`,
      es: `IMPORTANTE: El usuario indicó que la sugerencia anterior no ayudó. Reconoce esto y ofrece un enfoque completamente diferente. Muestra comprensión y adapta.`,
      zh: `重要：用户表示之前的建议没有帮助。承认这一点并提供完全不同的方法。表示理解并适应。`
    };
    
    return instructions[language] || instructions.en;
  }
  
  generateAlternativeSuggestion(
    originalIssue: string,
    failedApproach: string,
    language: string
  ): string {
    // This method generates alternative suggestions when the first one didn't work
    const category = this.categorizeIssue(originalIssue);
    
    const alternatives = {
      en: {
        back_pain: {
          physical: "Since stretching didn't help, try applying heat to your lower back for 15 minutes. A hot water bottle or heating pad can relax tight muscles.",
          positional: "Let's try a different approach: Lie on your back with knees bent and feet flat. Hold for 2 minutes to decompress your spine.",
          support: "Try using a rolled towel behind your lower back for support while sitting. This maintains the natural curve."
        },
        stress: {
          breathing: "If breathing exercises aren't working, try progressive muscle relaxation: Tense and release each muscle group for 5 seconds.",
          movement: "Let's shift gears: Take a 2-minute walk, even if just around your space. Movement can reset your stress response.",
          sensory: "Try the 5-4-3-2-1 technique: Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste."
        },
        fatigue: {
          energy: "Since movement didn't energize you, try splashing cold water on your face and wrists. It's an instant wake-up.",
          nutrition: "Check your hydration: Drink a full glass of water. Dehydration often masks as fatigue.",
          light: "Increase your light exposure: Step near a window or turn on bright lights. Light signals alertness to your brain."
        }
      },
      es: {
        back_pain: {
          physical: "Ya que el estiramiento no ayudó, prueba aplicar calor en la espalda baja por 15 minutos. Una bolsa de agua caliente puede relajar los músculos.",
          positional: "Intentemos algo diferente: Acuéstate boca arriba con rodillas dobladas. Mantén por 2 minutos para descomprimir la columna.",
          support: "Prueba usar una toalla enrollada detrás de tu espalda baja al sentarte. Esto mantiene la curva natural."
        },
        stress: {
          breathing: "Si la respiración no funciona, prueba relajación muscular progresiva: Tensa y relaja cada grupo muscular por 5 segundos.",
          movement: "Cambiemos el enfoque: Camina 2 minutos, aunque sea en tu espacio. El movimiento puede reiniciar tu respuesta al estrés.",
          sensory: "Prueba la técnica 5-4-3-2-1: Nombra 5 cosas que ves, 4 que oyes, 3 que sientes, 2 que hueles, 1 que saboreas."
        },
        fatigue: {
          energy: "Si el movimiento no te energizó, prueba salpicar agua fría en tu cara y muñecas. Es un despertar instantáneo.",
          nutrition: "Revisa tu hidratación: Bebe un vaso completo de agua. La deshidratación a menudo se disfraza de fatiga.",
          light: "Aumenta tu exposición a la luz: Acércate a una ventana o enciende luces brillantes. La luz señala alerta a tu cerebro."
        }
      },
      zh: {
        back_pain: {
          physical: "既然伸展没有帮助，试试在下背部热敷15分钟。热水袋或加热垫可以放松紧张的肌肉。",
          positional: "让我们尝试不同的方法：仰卧，膝盖弯曲，保持2分钟来减压脊柱。",
          support: "坐着时在下背部放一个卷起的毛巾作支撑。这能保持自然曲线。"
        },
        stress: {
          breathing: "如果呼吸练习不管用，试试渐进式肌肉放松：每个肌肉群紧张并放松5秒。",
          movement: "换个方法：走动2分钟，即使只是在你的空间里。运动可以重置压力反应。",
          sensory: "试试5-4-3-2-1技巧：说出5个你看到的，4个听到的，3个感觉到的，2个闻到的，1个尝到的。"
        },
        fatigue: {
          energy: "既然运动没有让你精力充沛，试试用冷水洗脸和手腕。这是即时清醒法。",
          nutrition: "检查你的水分：喝一整杯水。脱水常常表现为疲劳。",
          light: "增加光照：靠近窗户或打开明亮的灯。光线向大脑发出清醒信号。"
        }
      }
    };
    
    // Select a random alternative approach
    const languageAlternatives = alternatives[language] || alternatives.en;
    const categoryAlternatives = languageAlternatives[category];
    
    if (!categoryAlternatives) {
      return this.getFallbackResponse(category, language);
    }
    
    const approaches = Object.values(categoryAlternatives) as string[];
    const randomIndex = Math.floor(Math.random() * approaches.length);
    
    return approaches[randomIndex] || this.getFallbackResponse(category, language);
  }
  
  private categorizeIssue(input: string): string {
    const lowerInput = input.toLowerCase();
    
    for (const [category, patterns] of Object.entries(WELLNESS_PATTERNS)) {
      if (patterns.some(pattern => lowerInput.includes(pattern))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  private getFallbackResponse(category: string, language: string): string {
    return FALLBACK_RESPONSES[language]?.[category] || FALLBACK_RESPONSES[language]?.general || FALLBACK_RESPONSES.en.general;
  }
  
  formatResponse(response: string, context: EnhancedPromptContext): string {
    // Clean up and format the response
    let formatted = response.trim();
    
    // Ensure response starts with action verb or "Try this:" format
    if (!formatted.match(/^(Try this:|Prueba esto:|试试这个：)/i) && 
        !formatted.match(/^[A-Z][a-z]+\s/)) {
      const language = context.userContext.detectedLanguage || 'en';
      const tryPrefix = {
        en: 'Try this: ',
        es: 'Prueba esto: ',
        zh: '试试这个：'
      }[language] || 'Try this: ';
      
      formatted = tryPrefix + formatted;
    }
    
    // Add user name if available and not already included
    if (context.userContext.userName && !formatted.includes(context.userContext.userName)) {
      const language = context.userContext.detectedLanguage || 'en';
      const greeting = {
        en: `${context.userContext.userName}, `,
        es: `${context.userContext.userName}, `,
        zh: `${context.userContext.userName}，`
      }[language];
      
      formatted = greeting + formatted.charAt(0).toLowerCase() + formatted.slice(1);
    }
    
    return formatted;
  }
}

// Export singleton instance
export const promptManager = new PromptManager();

// Export templates for backward compatibility
export { WELLNESS_COACH_PROMPT, CONTEXT_TEMPLATE, WELLNESS_PATTERNS, QUICK_ACTIONS, FALLBACK_RESPONSES };